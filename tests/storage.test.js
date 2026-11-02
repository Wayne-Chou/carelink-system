import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const local = memoryStorage();
const session = memoryStorage();
globalThis.localStorage = local;
globalThis.sessionStorage = session;

const storage = await import("../src/services/storage.js");
const { getAllResources, createResource } = await import("../src/services/resourceService.js");
const { getUsers } = await import("../src/utils/auth.js");
const { addUser } = await import("./helpers/accounts.js");

// 模擬關閉瀏覽器：sessionStorage 清空，localStorage 保留
const closeBrowser = () => {
  session.data = {};
};

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

  test("畫面狀態：存在 sessionStorage（ui: 前綴），損壞或沒有存過時回傳預設值", () => {
    assert.equal(storage.readUiState("panel", "預設"), "預設");
    storage.writeUiState("panel", { open: false });
    assert.deepEqual(storage.readUiState("panel"), { open: false });
    assert.equal("ui:panel" in local.data, false, "不寫入 localStorage");
    session.data["ui:panel"] = "{壞掉";
    assert.equal(storage.readUiState("panel", "預設"), "預設");
  });

  test("讀取損壞的資料時以空陣列處理", () => {
    session.data.cases = "{壞掉";
    assert.deepEqual(storage.readList("cases"), []);
  });
});
