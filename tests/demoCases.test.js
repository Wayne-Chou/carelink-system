import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const { DEMO_CASES } = await import("../src/services/demoCases.js");
const { DEMO_RESOURCES } = await import("../src/services/demoResources.js");
const { checkAdvance, getAllCases, isFirstContactOverdue } = await import("../src/services/caseService.js");
const { getLinkedResourceStatus } = await import("../src/services/referral.js");
const { addMonths } = await import("../src/utils/date.js");
const { getDemoData } = await import("../src/services/demoService.js");

const resourceByCode = Object.fromEntries(DEMO_RESOURCES.map((r) => [r.code, r]));
const byName = (name) => DEMO_CASES.find((c) => c.person.name === name);
const linkedTo = (code) =>
  DEMO_CASES.filter((c) => c.linkages.some((l) => l.resourceId === resourceByCode[code].id));
const PREVIOUS_STAGE = { 2: 1, 3: 2, 4: 3, 5: 4, closed: 5 };

beforeEach(() => {
  session.data = {};
});

test("編碼 Case001～Case008、id 不重複、都有示範標記", () => {
  assert.deepEqual(DEMO_CASES.map((c) => c.code), DEMO_CASES.map((_, i) => `Case${String(i + 1).padStart(3, "0")}`));
  assert.equal(new Set(DEMO_CASES.map((c) => c.id)).size, DEMO_CASES.length);
  assert.ok(DEMO_CASES.every((c) => c.isDemo === true));
});

test("姓名、管理員、轉介者明顯虛構，電話為 0900-000 號段", () => {
  for (const c of DEMO_CASES) {
    for (const name of [c.person.name, c.managerName, c.referral.referrerName].filter(Boolean)) {
      assert.match(name, /示範|範例|示例|範本/, `${c.code} ${name}`);
    }
    assert.match(c.person.phone, /^0900-000-\d{3}$/, c.code);
  }
});

test("示範個案姓名不與示範資源的人名重複", () => {
  const resourcePeople = new Set(
    DEMO_RESOURCES.flatMap((r) => [
      r.verifiedBy.name,
      r.publicContact.name,
      r.adminContact.name,
      ...r.staff.map((s) => s.name),
    ]).filter(Boolean)
  );
  for (const c of DEMO_CASES) assert.equal(resourcePeople.has(c.person.name), false, c.person.name);
});

test("已是新格式：caseService 讀取時不需轉換，資料原樣讀出", () => {
  session.data.cases = JSON.stringify(DEMO_CASES);
  const cases = getAllCases();
  assert.deepEqual(cases.map((c) => c.code), DEMO_CASES.map((c) => c.code));
  assert.ok(cases.every((c) => !("legacy" in c)), "沒有經過舊格式轉換");
  assert.deepEqual(cases[4], DEMO_CASES[4]);
});

test("階段分布：辨識、諮詢、已結案各一，連結三筆，追蹤兩筆", () => {
  const count = (stage) => DEMO_CASES.filter((c) => c.stage === stage).length;
  assert.deepEqual([1, 2, 3, 4, "closed"].map(count), [1, 1, 3, 2, 1]);
});

test("每筆個案都符合進入目前階段的條件（依 caseService 的推進規則）", () => {
  for (const c of DEMO_CASES.filter((x) => x.stage !== 1)) {
    const before = { ...c, stage: PREVIOUS_STAGE[c.stage] };
    const check = checkAdvance(before);
    assert.equal(check.ok, true, `${c.code}：${check.reasons.join("、")}`);
    assert.equal(check.nextStage, c.stage, c.code);
  }
});

test("連結的資源都存在、名稱一致；追蹤排程從連結日起算 1、3、6 個月", () => {
  for (const c of DEMO_CASES) {
    for (const l of c.linkages) {
      const resource = DEMO_RESOURCES.find((r) => r.id === l.resourceId);
      assert.ok(resource, `${c.code} 資源存在`);
      assert.equal(l.resourceName, resource.name, c.code);
    }
    const latest = c.linkages.at(-1);
    if (!latest) {
      assert.deepEqual(c.followUps, [], `${c.code} 尚未連結就沒有追蹤`);
      continue;
    }
    assert.deepEqual(
      c.followUps.map((f) => [f.round, f.plannedAt]),
      [1, 3, 6].map((m) => [m, addMonths(latest.linkedAt, m)]),
      c.code
    );
  }
});

test("連結到黃燈 Res001 的個案需陪同；連到暫停中 Res004 的個案提示需重新選擇", () => {
  const yellow = getLinkedResourceStatus(byName("呂示例").linkages[0].resourceId, DEMO_RESOURCES);
  assert.ok(yellow.available && yellow.needsEscort);
  assert.equal(byName("呂示例").linkages[0].escortNeeded, true);

  const paused = getLinkedResourceStatus(byName("曾範本").linkages[0].resourceId, DEMO_RESOURCES);
  assert.equal(paused.available, false);
  assert.deepEqual(paused.reasons, ["paused"]);
});

test("資源端後台：Res001、Res002 各有 2 筆轉介，且同時有待回報與成功", () => {
  for (const code of ["Res001", "Res002"]) {
    const cases = linkedTo(code);
    assert.equal(cases.length, 2, code);
    const statuses = new Set(cases.map((c) => c.linkages.at(-1).status));
    assert.deepEqual([...statuses].sort(), ["pending", "success"], code);
  }
});

test("逾期未聯繫：任何一天載入，都只有李示範（開案超過 72 小時尚未首次聯繫）", () => {
  for (const today of ["2026-10-14", "2027-03-01", "2028-02-29"]) {
    const now = new Date(`${today}T09:00:00+08:00`);
    assert.deepEqual(
      getDemoData(today).cases.filter((c) => isFirstContactOverdue(c, now)).map((c) => c.person.name),
      ["李示範"],
      today
    );
  }
});

test("歷程依日期排序、以建立個案開頭，最後一筆的階段與目前階段相符", () => {
  for (const c of DEMO_CASES) {
    const dates = c.history.map((h) => h.date);
    assert.deepEqual(dates, [...dates].sort(), c.code);
    assert.equal(c.history[0].action, "create", c.code);
    assert.equal(c.history.at(-1).stage, c.stage, c.code);
  }
});

test("追蹤紀錄：已完成的都有對應歷程；已結案的有結案原因與再入口說明", () => {
  for (const c of DEMO_CASES) {
    for (const f of c.followUps.filter((x) => x.doneAt)) {
      assert.ok(c.history.some((h) => h.action === "follow_up" && h.note.startsWith(`${f.round} 個月追蹤`)), c.code);
    }
  }
  const closed = byName("葉示例");
  assert.equal(closed.closure.reason, "goal_met");
  assert.equal(closed.closure.reentryExplained, true);
});
