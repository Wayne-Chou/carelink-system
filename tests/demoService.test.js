import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

let store;
// 資料存在 sessionStorage（storage.js 的 DATA_STORAGE）；localStorage 另外模擬，供清除舊資料使用
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => {
    store[key] = String(value);
  },
  removeItem: (key) => {
    delete store[key];
  },
};

const { DEMO_BASE_DATE, DEMO_TOTALS, countData, getDemoData, loadDemoData, removeDemoData, shiftDates } = await import(
  "../src/services/demoService.js"
);
const { createResource, getAllResources } = await import("../src/services/resourceService.js");

const readCases = () => JSON.parse(store.cases || "[]");
const myCase = { id: "case_mine", basic: { name: "自建個案" }, stage: 1, history: [] };

beforeEach(() => {
  store = {};
});

test("加入模式：同時加入示範資源與個案，保留自建資料，不重複加入", () => {
  createResource({ name: "自建資源" });
  store.cases = JSON.stringify([myCase]);

  assert.deepEqual(loadDemoData(), DEMO_TOTALS);
  assert.deepEqual(loadDemoData(), { resources: 0, cases: 0, assessments: 0 }, "再按一次不重複加入");

  assert.equal(getAllResources().length, DEMO_TOTALS.resources + 1);
  assert.equal(readCases().length, DEMO_TOTALS.cases + 1);
  assert.ok(readCases().some((c) => c.id === "case_mine"));
});

test("清空模式：資源與個案都只剩示範資料", () => {
  createResource({ name: "自建資源" });
  store.cases = JSON.stringify([myCase]);

  assert.deepEqual(loadDemoData({ replace: true }), DEMO_TOTALS);
  assert.ok(getAllResources().every((r) => r.isDemo === true));
  assert.ok(readCases().every((c) => c.isDemo === true));
  assert.equal(readCases().length, DEMO_TOTALS.cases);
});

test("移除示範資料：一併移除示範個案，自建資源與個案保留", () => {
  createResource({ name: "自建資源" });
  store.cases = JSON.stringify([myCase]);
  loadDemoData();

  assert.deepEqual(removeDemoData(), DEMO_TOTALS);
  assert.deepEqual(
    getAllResources().map((r) => r.name),
    ["自建資源"]
  );
  assert.deepEqual(readCases().map((c) => c.id), ["case_mine"]);
  assert.deepEqual(removeDemoData(), { resources: 0, cases: 0, assessments: 0 });
});

test("countData 統計全部與示範筆數", () => {
  store.cases = JSON.stringify([myCase]);
  loadDemoData();
  assert.deepEqual(countData(), {
    resources: DEMO_TOTALS.resources,
    cases: DEMO_TOTALS.cases + 1,
    assessments: DEMO_TOTALS.assessments,
    demoResources: DEMO_TOTALS.resources,
    demoCases: DEMO_TOTALS.cases,
    demoAssessments: DEMO_TOTALS.assessments,
  });
});

test("個案資料損壞時不會出錯，以空陣列處理", () => {
  store.cases = "{壞掉的資料";
  assert.deepEqual(loadDemoData(), DEMO_TOTALS);
  assert.equal(readCases().length, DEMO_TOTALS.cases);
});

test("示範評估：加入、清空、移除都一併處理", () => {
  const myAssessment = { id: "ast_mine", code: "Ast001", person: { name: "自建評估" }, status: "filled" };
  store.assessments = JSON.stringify([myAssessment]);

  assert.equal(loadDemoData().assessments, DEMO_TOTALS.assessments);
  const readAssessments = () => JSON.parse(store.assessments || "[]");
  assert.equal(readAssessments().length, DEMO_TOTALS.assessments + 1);

  assert.equal(removeDemoData().assessments, DEMO_TOTALS.assessments);
  assert.deepEqual(readAssessments().map((a) => a.id), ["ast_mine"]);

  loadDemoData({ replace: true });
  assert.ok(readAssessments().every((a) => a.isDemo === true));
});

test("評估編碼與自建資料重複時改用下一個流水號，對應個案的評估編碼一併更新", () => {
  store.assessments = JSON.stringify([
    { id: "ast_mine1", code: "Ast001", person: { name: "自建一" } },
    { id: "ast_mine2", code: "Ast002", person: { name: "自建二" } },
  ]);
  loadDemoData();

  const assessments = JSON.parse(store.assessments);
  const codes = assessments.map((a) => a.code);
  assert.equal(new Set(codes).size, codes.length, "編碼不重複");

  for (const c of readCases().filter((x) => x.referral?.assessmentId)) {
    const linked = assessments.find((a) => a.id === c.referral.assessmentId);
    assert.equal(c.referral.assessmentCode, linked.code, c.code);
    assert.equal(linked.caseId, c.id);
  }
  assert.notEqual(assessments.find((a) => a.id === "ast_demo_02").code, "Ast002");
});

test("相對日期：日期與時間字串平移指定天數，時間與其他欄位不變", () => {
  const data = {
    date: "2026-10-14",
    at: "2026-10-03T10:00:00+08:00",
    list: [{ plannedAt: "2026-12-31" }],
    text: "2026-10-14 之後再說",
    time: "08:30",
    none: null,
  };
  assert.deepEqual(shiftDates(data, 20), {
    date: "2026-11-03",
    at: "2026-10-23T10:00:00+08:00",
    list: [{ plannedAt: "2027-01-20" }],
    text: "2026-10-14 之後再說",
    time: "08:30",
    none: null,
  });
  assert.deepEqual(shiftDates(data, 0), data);
});

test("相對日期：載入當天與基準日相差幾天，示範資料的日期就平移幾天", () => {
  loadDemoData({ replace: true, today: "2027-01-01" });
  const days = 79; // 2026-10-14 → 2027-01-01
  const demoCase = readCases().find((c) => c.id === "case_demo_01");
  const original = getDemoData(DEMO_BASE_DATE).cases.find((c) => c.id === "case_demo_01");
  assert.equal(demoCase.createdAt, shiftDates(original.createdAt, days));
  assert.equal(demoCase.createdAt, "2026-12-21T10:00:00+08:00");
  const res006 = getAllResources().find((r) => r.code === "Res006");
  assert.equal(res006.nextVerifyAt, "2026-12-22");
});
