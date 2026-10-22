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
const { autoLoadDemoIfEmpty } = await import("../src/services/demoService.js");
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
    assert.equal(JSON.parse(local.data.users).length, 1, "資料清除不影響帳號清單");
  });

  test("第一次讀取帳號清單時，清掉 localStorage 殘留的 users", () => {
    assert.ok(local.data.users, "測試前提：殘留的帳號清單存在");
    assert.deepEqual(getUsers(), [], "不讀到舊帳號");
    assert.equal("users" in local.data, false, "清除殘留的 users");
  });
});

describe("一般讀寫", () => {
  beforeEach(() => {
    local.data = {};
    session.data = {};
  });

  test("設定值：資料存 sessionStorage，沒有資料時自動載入示範情境", () => {
    assert.equal(storage.DATA_STORAGE, "session");
    assert.equal(storage.AUTO_LOAD_DEMO, true, "沒有資料時自動載入示範情境第 1 步");
  });

  test("資料寫入 sessionStorage，不寫入 localStorage；關閉瀏覽器後清除", () => {
    createResource({ name: "測試資源" });
    assert.ok(session.data.resources);
    assert.equal("resources" in local.data, false);
    closeBrowser();
    assert.deepEqual(getAllResources(), []);
  });

  test("帳號清單存 sessionStorage，關閉瀏覽器後清除", () => {
    assert.equal(storage.ACCOUNT_STORAGE, "session");
    register({ name: "王示範", email: "w@example.com", password: "x", role: "reader" });
    assert.equal(JSON.parse(session.data.users).length, 1);
    assert.equal("users" in local.data, false);
    closeBrowser();
    assert.equal(getUsers().length, 0);
  });

  test("資料、帳號與畫面偏好都不寫入 localStorage", () => {
    createResource({ name: "測試資源" });
    register({ name: "王示範", email: "w@example.com", password: "x", role: "reader" });
    storage.writePreference("storyBar.collapsed", true);
    assert.deepEqual(local.data, {});
  });

  test("isDataEmpty：resources、cases、assessments 都沒有資料才算空", () => {
    assert.equal(storage.isDataEmpty(), true);
    storage.writeList("assessments", [{ id: "a" }]);
    assert.equal(storage.isDataEmpty(), false);
  });

  test("AUTO_LOAD_DEMO：開啟且沒有資料時自動載入示範情境第 1 步（只有資源）", () => {
    assert.equal(autoLoadDemoIfEmpty({ enabled: true }), true);
    assert.equal(JSON.parse(session.data.resources).length, 4);
    assert.deepEqual(JSON.parse(session.data.cases), []);
    assert.deepEqual(JSON.parse(session.data.assessments), []);
  });

  test("AUTO_LOAD_DEMO：已有資料時不載入，關閉時不載入", () => {
    createResource({ name: "自建資源" });
    assert.equal(autoLoadDemoIfEmpty({ enabled: true }), false);
    assert.equal(getAllResources().length, 1);

    session.data = {};
    assert.equal(autoLoadDemoIfEmpty({ enabled: false }), false, "關閉時不載入");
    assert.equal(storage.isDataEmpty(), true);
  });

  test("讀取損壞的資料時以空陣列處理", () => {
    session.data.cases = "{壞掉";
    assert.deepEqual(storage.readList("cases"), []);
  });
});
