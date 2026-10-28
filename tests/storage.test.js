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
const { getUsers } = await import("../src/utils/auth.js");
const { addUser } = await import("./helpers/accounts.js");

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

  test("設定值：資料存 sessionStorage", () => {
    assert.equal(storage.DATA_STORAGE, "session");
  });

  test("系統從空白開始：沒有預設的資源、評估、個案", () => {
    for (const key of storage.DATA_KEYS) assert.deepEqual(storage.readList(key), [], key);
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
    addUser({ name: "王示範", email: "w@example.com", role: "reader" });
    assert.equal(JSON.parse(session.data.users).length, 1);
    assert.equal("users" in local.data, false);
    closeBrowser();
    assert.equal(getUsers().length, 0);
  });

  test("資料與帳號都不寫入 localStorage", () => {
    createResource({ name: "測試資源" });
    addUser({ name: "王示範", email: "w@example.com", role: "reader" });
    assert.deepEqual(local.data, {});
  });

  test("讀取損壞的資料時以空陣列處理", () => {
    session.data.cases = "{壞掉";
    assert.deepEqual(storage.readList("cases"), []);
  });
});
