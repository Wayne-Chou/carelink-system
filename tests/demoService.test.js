import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let store;
globalThis.localStorage = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => {
    store[key] = String(value);
  },
  removeItem: (key) => {
    delete store[key];
  },
};

const { DEMO_TOTALS, countData, loadDemoData, removeDemoData } = await import(
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
  assert.deepEqual(loadDemoData(), { resources: 0, cases: 0 }, "再按一次不重複加入");

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
  assert.deepEqual(removeDemoData(), { resources: 0, cases: 0 });
});

test("countData 統計全部與示範筆數", () => {
  store.cases = JSON.stringify([myCase]);
  loadDemoData();
  assert.deepEqual(countData(), {
    resources: DEMO_TOTALS.resources,
    cases: DEMO_TOTALS.cases + 1,
    demoResources: DEMO_TOTALS.resources,
    demoCases: DEMO_TOTALS.cases,
  });
});

test("個案資料損壞時不會出錯，以空陣列處理", () => {
  store.cases = "{壞掉的資料";
  assert.deepEqual(loadDemoData(), DEMO_TOTALS);
  assert.equal(readCases().length, DEMO_TOTALS.cases);
});
