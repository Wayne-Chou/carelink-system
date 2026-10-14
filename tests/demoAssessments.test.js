import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const { DEMO_ASSESSMENTS } = await import("../src/services/demoAssessments.js");
const { DEMO_CASES } = await import("../src/services/demoCases.js");
const { DEMO_RESOURCES } = await import("../src/services/demoResources.js");
const { loadDemoData } = await import("../src/services/demoService.js");
const { calcDeclineCount, calcNextCheckAt, getAllAssessments, validateReview } = await import(
  "../src/services/assessmentService.js"
);
const { adviseAssessment } = await import("../src/services/assessmentAdvisor.js");
const { computeTodos } = await import("../src/services/todoService.js");

const byCode = (code) => DEMO_ASSESSMENTS.find((a) => a.code === code);
const reviewed = DEMO_ASSESSMENTS.filter((a) => ["reviewed", "closed"].includes(a.status));
const kind = (a) =>
  a.status === "filled" || a.status === "voided"
    ? a.status
    : a.review.light === "orange"
      ? `orange_${a.review.orangeType}`
      : a.review.light;

beforeEach(() => {
  session.data = {};
});

test("編碼 Ast001～Ast009、id 不重複、都有示範標記", () => {
  assert.deepEqual(
    DEMO_ASSESSMENTS.map((a) => a.code),
    DEMO_ASSESSMENTS.map((_, i) => `Ast${String(i + 1).padStart(3, "0")}`)
  );
  assert.equal(new Set(DEMO_ASSESSMENTS.map((a) => a.id)).size, DEMO_ASSESSMENTS.length);
  assert.ok(DEMO_ASSESSMENTS.every((a) => a.isDemo === true));
});

test("燈號分布：紅、橘燈轉介、退縮、保留、綠、未判讀、已作廢各一，黃燈兩筆", () => {
  const counts = {};
  for (const a of DEMO_ASSESSMENTS) counts[kind(a)] = (counts[kind(a)] || 0) + 1;
  assert.deepEqual(counts, {
    red: 1,
    orange_refer: 1,
    orange_hesitant: 1,
    orange_reserved: 1,
    yellow: 2,
    green: 1,
    filled: 1,
    voided: 1,
  });
});

test("姓名與判讀人員明顯虛構；只有開案的評估與示範個案同名，也不與資源人員同名", () => {
  const caseNames = new Set(DEMO_CASES.map((c) => c.person.name));
  const resourcePeople = new Set(
    DEMO_RESOURCES.flatMap((r) => [r.verifiedBy.name, r.publicContact.name, r.adminContact.name, ...r.staff.map((s) => s.name)])
  );
  for (const a of DEMO_ASSESSMENTS) {
    for (const name of [a.person.name, a.review.readerName, a.voidedBy].filter(Boolean)) {
      assert.match(name, /示範|範例|示例|範本/, `${a.code} ${name}`);
    }
    assert.equal(caseNames.has(a.person.name), !!a.caseId, `${a.code} ${a.person.name}`);
    assert.equal(resourcePeople.has(a.person.name), false, a.person.name);
  }
  assert.equal(new Set(DEMO_ASSESSMENTS.map((a) => a.person.name)).size, DEMO_ASSESSMENTS.length);
});

test("橘燈轉介與退縮已開案：評估 caseId 與個案的評估編碼互相一致", () => {
  const opened = DEMO_ASSESSMENTS.filter((a) => a.caseId);
  assert.deepEqual(opened.map(kind), ["orange_refer", "orange_hesitant"]);
  for (const a of opened) {
    const c = DEMO_CASES.find((x) => x.id === a.caseId);
    assert.ok(c, a.code);
    assert.equal(a.status, "closed");
    assert.equal(c.referral.assessmentId, a.id);
    assert.equal(c.referral.assessmentCode, a.code);
    assert.equal(c.referral.referrerName, a.review.readerName);
    assert.equal(c.person.name, a.person.name);
    assert.ok(c.history.some((h) => h.action === "open_from_assessment" && h.note.includes(a.code)));
  }
  // 其他個案都不是由評估開案
  const linked = DEMO_CASES.filter((c) => c.referral.assessmentId);
  assert.deepEqual(linked.map((c) => c.id).sort(), opened.map((a) => a.caseId).sort());
});

test("判讀內容通過必填檢核，下次確認日期與婉拒次數與系統計算一致", () => {
  for (const a of reviewed) {
    assert.deepEqual(validateReview(a.review), {}, a.code);
    assert.equal(a.nextCheckAt, calcNextCheckAt(a), a.code);
    assert.equal(a.declineCount, calcDeclineCount(a, DEMO_ASSESSMENTS), a.code);
  }
});

test("系統建議燈號與判讀結果不衝突（無法建議時由判讀人員判斷）", () => {
  for (const a of reviewed) {
    const { suggestedLight } = adviseAssessment(a);
    if (suggestedLight) assert.equal(suggestedLight, a.review.light, a.code);
  }
  assert.equal(adviseAssessment(byCode("Ast001")).suggestedLight, "red");
  assert.equal(adviseAssessment(byCode("Ast002")).suggestedOrangeType, "refer");
});

test("黃燈當場提供的資源都存在，且不是紅燈資源", () => {
  const resources = new Map(DEMO_RESOURCES.map((r) => [r.id, r]));
  for (const a of DEMO_ASSESSMENTS.filter((x) => x.review.light === "yellow")) {
    assert.ok(a.review.providedResources.length, a.code);
    for (const id of a.review.providedResources) {
      assert.ok(resources.has(id), `${a.code} ${id}`);
      assert.notEqual(resources.get(id).riskLevel, "red");
    }
  }
});

test("assessmentService 讀取時資料原樣讀出", () => {
  session.data.assessments = JSON.stringify(DEMO_ASSESSMENTS);
  assert.deepEqual(getAllAssessments(), DEMO_ASSESSMENTS);
});

// 示範資料採相對日期：不論哪一天載入，待辦清單（類型、對象、逾期天數）都和對照表一致
// 涵蓋基準日、隔天、跨年、閏年 2 月底與月底等日期
const LOAD_DAYS = ["2026-10-14", "2026-10-15", "2027-01-01", "2028-02-29", "2031-05-31"];
const EXPECTED_TODOS = [
  "follow_up_due Case008 34",
  "provider_unreported Case004 20",
  "yellow_recheck Ast005 13",
  "provider_unreported Case006 12",
  "resource_verify Res006 10",
  "first_contact_overdue Case001 8",
  "green_reassess Ast007 7",
  "provider_unreported Case003 6",
  "unreviewed Ast008 1",
  "orange_reserved Ast004 null",
];

for (const today of LOAD_DAYS) {
  test(`${today} 載入示範資料：待辦涵蓋第七節所有類型，與對照表一致`, () => {
    session.data = {};
    loadDemoData({ replace: true, today });
    const todos = computeTodos({ today, now: new Date(`${today}T09:00:00+08:00`) });
    assert.deepEqual(todos.map((t) => `${t.type} ${t.code} ${t.overdueDays}`), EXPECTED_TODOS);
  });
}
