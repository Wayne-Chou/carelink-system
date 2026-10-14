import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const local = memoryStorage();
const session = memoryStorage();
globalThis.localStorage = local;
globalThis.sessionStorage = session;

// 模擬改版前殘留在 localStorage 的資料與帳號（必須在第一次讀寫之前放好）
local.data.resources = JSON.stringify([{ id: "old-res", name: "舊資源" }]);
local.data.cases = JSON.stringify([{ id: "old-case" }]);
local.data.assessments = JSON.stringify([{ id: "old-ast" }]);
local.data.users = JSON.stringify([{ id: 1, email: "keep@example.com" }]);

const storage = await import("../src/services/storage.js");
const { getAllResources, createResource } = await import("../src/services/resourceService.js");
const { autoLoadDemoIfEmpty, DEMO_TOTALS } = await import("../src/services/demoService.js");
const { getUsers, register } = await import("../src/utils/auth.js");

// 模擬關閉瀏覽器：sessionStorage 清空，localStorage 保留
const closeBrowser = () => {
  session.data = {};
};

// 這組測試不能套用下方的 beforeEach（會先清空殘留資料，測試就失去意義），所以獨立成一組
describe("第一次讀取（改版前的殘留資料）", () => {
  test("清掉 localStorage 殘留的 resources、cases、assessments，保留帳號", () => {
    assert.ok(local.data.resources, "測試前提：殘留資料存在");
    assert.deepEqual(getAllResources(), [], "不讀到舊資料");
    for (const key of ["resources", "cases", "assessments"]) {
      assert.equal(key in local.data, false, `清除 ${key}`);
    }
    assert.equal(JSON.parse(local.data.users).length, 1, "帳號清單保留");
  });
});

describe("一般讀寫", () => {
  beforeEach(() => {
    local.data = {};
    session.data = {};
  });

  test("設定值：資料存 sessionStorage，預設不自動載入示範資料", () => {
    assert.equal(storage.DATA_STORAGE, "session");
    assert.equal(storage.AUTO_LOAD_DEMO, false);
  });

  test("資料寫入 sessionStorage，不寫入 localStorage；關閉瀏覽器後清除", () => {
    createResource({ name: "測試資源" });
    assert.ok(session.data.resources);
    assert.equal("resources" in local.data, false);
    closeBrowser();
    assert.deepEqual(getAllResources(), []);
  });

  test("帳號清單存 localStorage，關閉瀏覽器後仍在", () => {
    register({ name: "王示範", email: "w@example.com", password: "x" });
    assert.equal(JSON.parse(local.data.users).length, 1);
    assert.equal("users" in session.data, false);
    closeBrowser();
    assert.equal(getUsers().length, 1);
  });

  test("isDataEmpty：resources、cases、assessments 都沒有資料才算空", () => {
    assert.equal(storage.isDataEmpty(), true);
    storage.writeList("assessments", [{ id: "a" }]);
    assert.equal(storage.isDataEmpty(), false);
  });

  test("AUTO_LOAD_DEMO：開啟且沒有資料時自動載入示範資源與個案", () => {
    assert.equal(autoLoadDemoIfEmpty({ enabled: true }), true);
    assert.equal(JSON.parse(session.data.resources).length, DEMO_TOTALS.resources);
    assert.equal(JSON.parse(session.data.cases).length, DEMO_TOTALS.cases);
  });

  test("AUTO_LOAD_DEMO：已有資料時不載入，關閉時不載入", () => {
    createResource({ name: "自建資源" });
    assert.equal(autoLoadDemoIfEmpty({ enabled: true }), false);
    assert.equal(getAllResources().length, 1);

    session.data = {};
    assert.equal(autoLoadDemoIfEmpty(), false, "預設 AUTO_LOAD_DEMO = false");
    assert.equal(storage.isDataEmpty(), true);
  });

  test("讀取損壞的資料時以空陣列處理", () => {
    session.data.cases = "{壞掉";
    assert.deepEqual(storage.readList("cases"), []);
  });
});
