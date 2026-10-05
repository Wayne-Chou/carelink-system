import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_CASES } from "../src/services/demoCases.js";
import { DEMO_RESOURCES } from "../src/services/demoResources.js";
import { getLinkedResourceStatus } from "../src/services/referral.js";

const byId = Object.fromEntries(DEMO_CASES.map((c) => [c.id, c]));
const resourceByCode = Object.fromEntries(DEMO_RESOURCES.map((r) => [r.code, r]));
const linkedTo = (code) =>
  DEMO_CASES.filter((c) => String(c.linkage.resourceId) === String(resourceByCode[code].id));

test("id 不重複、都有示範標記、姓名明顯虛構", () => {
  assert.equal(new Set(DEMO_CASES.map((c) => c.id)).size, DEMO_CASES.length);
  for (const c of DEMO_CASES) {
    assert.equal(c.isDemo, true, c.id);
    assert.match(c.basic.name, /示範|範例|示例|範本/, `${c.id} ${c.basic.name}`);
  }
});

test("示範個案姓名不與示範資源的人名重複，避免展示時混淆", () => {
  const resourcePeople = new Set(
    DEMO_RESOURCES.flatMap((r) => [
      r.verifiedBy.name,
      r.publicContact.name,
      r.adminContact.name,
      ...r.staff.map((s) => s.name),
    ]).filter(Boolean)
  );
  for (const c of DEMO_CASES) assert.equal(resourcePeople.has(c.basic.name), false, c.basic.name);
});

test("階段分布：辨識、諮詢、已結案各一，連結兩筆，追蹤兩筆", () => {
  const count = (stage) => DEMO_CASES.filter((c) => c.stage === stage).length;
  assert.equal(count(1), 1);
  assert.equal(count(2), 1);
  assert.equal(count(3), 2);
  assert.equal(count(4), 2);
  assert.equal(count(6), 1);
});

test("各階段內容合理：諮詢後有需求評估、連結後有資源、追蹤後有紀錄、結案有原因", () => {
  for (const c of DEMO_CASES) {
    if (c.stage >= 3) {
      const { needLevel, motivation, goal } = c.consultation;
      assert.ok(needLevel && motivation && goal, `${c.id} 需求評估完整`);
      assert.ok(c.linkage.resourceId && c.linkage.reason, `${c.id} 已連結資源`);
    } else {
      assert.equal(c.linkage.resourceId, null, `${c.id} 尚未連結`);
    }
    if (c.stage >= 4) assert.ok(c.tracking.length > 0, `${c.id} 有追蹤紀錄`);
    else assert.equal(c.tracking.length, 0, `${c.id} 尚無追蹤`);
    if (c.stage === 6) assert.ok(c.closure.reason && c.closure.outcome, `${c.id} 結案原因`);
    else assert.deepEqual(c.closure, { reason: "", outcome: "" }, `${c.id} 未結案`);
  }
});

test("歷程紀錄依日期排序、以「初始建立」開頭，且最後一筆的階段與目前階段相符", () => {
  for (const c of DEMO_CASES) {
    const dates = c.history.map((item) => item.date);
    assert.deepEqual(dates, [...dates].sort(), `${c.id} 日期排序`);
    assert.equal(c.history[0].note, "初始建立", c.id);
    assert.equal(c.history[0].date, c.createdAt, c.id);
    const lastStage = c.history.at(-1).stage;
    assert.equal(lastStage, c.stage === 6 ? 5 : c.stage, `${c.id} 歷程階段`);
  }
});

test("追蹤紀錄次序連續，且歷程中有對應的追蹤記錄", () => {
  for (const c of DEMO_CASES) {
    c.tracking.forEach((t, i) => {
      assert.equal(t.step, i + 1, `${c.id} 第 ${i + 1} 次`);
      assert.ok(
        c.history.some((item) => item.note.includes(`第${t.step}次追蹤｜${t.status}｜${t.effect}`)),
        `${c.id} 歷程有第 ${t.step} 次追蹤`
      );
    });
  }
});

test("連結的資源都存在，資源名稱與當時連結的名稱一致", () => {
  for (const c of DEMO_CASES.filter((x) => x.linkage.resourceId)) {
    const resource = DEMO_RESOURCES.find((r) => r.id === c.linkage.resourceId);
    assert.ok(resource, `${c.id} 資源存在`);
    assert.equal(c.linkage.resourceName, resource.name, c.id);
  }
});

test("連結階段兩筆：一筆連黃燈 Res001（需陪同），一筆連暫停中 Res004（需重新選擇）", () => {
  const stage3 = DEMO_CASES.filter((c) => c.stage === 3);
  const statuses = stage3.map((c) => getLinkedResourceStatus(c.linkage.resourceId, DEMO_RESOURCES));

  const yellow = statuses.find((s) => s.resource.code === "Res001");
  assert.ok(yellow?.available && yellow.needsEscort, "Res001 可轉介且需陪同");

  const paused = statuses.find((s) => s.resource.code === "Res004");
  assert.equal(paused?.available, false, "Res004 不可轉介");
  assert.deepEqual(paused.reasons, ["paused"]);
});

test("資源端後台：Res001、Res002 各有 2 筆以上轉介，且同時有待回報與成功", () => {
  for (const code of ["Res001", "Res002"]) {
    const cases = linkedTo(code);
    assert.ok(cases.length >= 2, `${code} 有 ${cases.length} 筆`);
    const statuses = new Set(cases.map((c) => c.linkage.status || "待回報"));
    assert.ok(statuses.has("待回報") && statuses.has("成功"), `${code} 狀態 ${[...statuses]}`);
  }
});

test("案例對照：展示導覽中提到的個案", () => {
  assert.equal(byId.case_demo_03.basic.name, "呂示例");
  assert.equal(byId.case_demo_04.basic.name, "曾範本");
  assert.equal(byId.case_demo_07.stage, 6);
});
