import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// 分別模擬 localStorage 與 sessionStorage
const makeStorage = () => {
  const storage = {
    data: {},
    getItem: (key) => (key in storage.data ? storage.data[key] : null),
    setItem: (key, value) => {
      storage.data[key] = String(value);
    },
    removeItem: (key) => {
      delete storage.data[key];
    },
  };
  return storage;
};
const local = makeStorage();
const session = makeStorage();
globalThis.localStorage = local;
globalThis.sessionStorage = session;

// 模擬改版前殘留在 localStorage 的登入狀態（必須在第一次呼叫 auth.js 之前放好）
local.data.currentUser = JSON.stringify({ id: 1, name: "舊登入", email: "old@example.com", role: "admin" });
local.data.currentResourceId = "res-old";

const auth = await import("../src/utils/auth.js");
const { ROLE_CODES } = await import("../src/config/roles.js");

// 模擬關閉瀏覽器：sessionStorage 清空，localStorage 保留
const closeBrowser = () => {
  session.data = {};
};

// 這組測試不能套用下方的 beforeEach（會先清空殘留資料，測試就失去意義），所以獨立成一組
describe("第一次讀取（改版前的殘留登入狀態）", () => {
  test("清掉 localStorage 殘留的登入狀態，帳號清單不受影響", () => {
    assert.ok(local.data.currentUser, "測試前提：殘留的登入者存在");
    assert.ok(local.data.currentResourceId, "測試前提：殘留的資源端登入存在");
    local.data.users = JSON.stringify([{ id: 9, email: "keep@example.com" }]);
    assert.equal(auth.getCurrentUser(), null, "不沿用殘留的登入者");
    assert.equal("currentUser" in local.data, false);
    assert.equal("currentResourceId" in local.data, false);
    assert.equal(JSON.parse(local.data.users).length, 1, "帳號清單保留");
  });
});

describe("一般操作", () => {
  beforeEach(() => {
    local.data = {};
    session.data = {};
  });

  test("設定為 sessionStorage", () => {
    assert.equal(auth.LOGIN_STORAGE, "session");
  });

  test("登入狀態存 sessionStorage，帳號清單存 localStorage", () => {
    auth.register({ name: "王示範", email: "w@example.com", password: "x" });
    assert.ok(session.data.currentUser, "登入者在 sessionStorage");
    assert.equal("currentUser" in local.data, false, "localStorage 沒有登入者");
    assert.equal(JSON.parse(local.data.users).length, 1, "帳號在 localStorage");
  });

  test("關閉瀏覽器後自動登出，帳號仍在，重新登入即可", () => {
    auth.register({ name: "王示範", email: "w@example.com", password: "x" });
    assert.equal(auth.isAuthenticated(), true);
    closeBrowser();
    assert.equal(auth.isAuthenticated(), false);
    assert.equal(auth.getUsers().length, 1);
    assert.equal(auth.login({ email: "w@example.com", password: "x" }).ok, true);
    assert.equal(auth.isAuthenticated(), true);
  });

  test("資源端登入的資源存 sessionStorage，關閉瀏覽器後清除", () => {
    auth.setCurrentResourceId("res-1");
    assert.equal(auth.getCurrentResourceId(), "res-1");
    assert.equal(session.data.currentResourceId, "res-1");
    assert.equal("currentResourceId" in local.data, false);
    closeBrowser();
    assert.equal(auth.getCurrentResourceId(), "");
  });

  test("登出時一併清除資源端登入的資源", () => {
    auth.register({ name: "王示範", email: "w@example.com", password: "x" });
    auth.setCurrentResourceId("res-1");
    auth.clearCurrentUser();
    assert.equal(auth.getCurrentUser(), null);
    assert.equal(auth.getCurrentResourceId(), "");
  });

  test("五種角色", () => {
    assert.deepEqual(ROLE_CODES, ["citizen", "reader", "manager", "provider", "admin"]);
  });

  test("註冊時可指定角色，登入後讀得到", () => {
    auth.register({ name: "判讀", email: "reader@example.com", password: "x", role: "reader" });
    assert.equal(auth.getCurrentRole(), "reader");
    auth.login({ email: "reader@example.com", password: "x" });
    assert.equal(auth.getCurrentRole(), "reader");
    assert.equal(auth.hasRole("reader", "admin"), true);
    assert.equal(auth.hasRole("manager"), false);
  });

  test("未指定或不合法的角色：Email 含 admin 為管理員，其餘為民眾", () => {
    assert.equal(auth.register({ name: "A", email: "Admin@example.com", password: "x" }).user.role, "admin");
    assert.equal(auth.register({ name: "B", email: "b@example.com", password: "x", role: "boss" }).user.role, "citizen");
    assert.equal(auth.resolveRole(undefined), "citizen");
  });

  test("舊帳號存的 role 為 user 時，改用 Email 備援規則", () => {
    auth.setCurrentUser({ id: 1, name: "舊管理員", email: "admin@example.com", role: "user" });
    assert.equal(auth.getCurrentRole(), "admin");
    auth.setCurrentUser({ id: 2, name: "舊民眾", email: "old@example.com", role: "user" });
    assert.equal(auth.getCurrentRole(), "citizen");
  });

  test("未登入時沒有角色", () => {
    assert.equal(auth.getCurrentRole(), null);
    assert.equal(auth.hasRole("admin"), false);
  });

  test("資料損壞時不會出錯", () => {
    local.data.users = "{壞掉";
    session.data.currentUser = "{壞掉";
    assert.equal(auth.getCurrentRole(), null);
    assert.equal(auth.register({ name: "C", email: "c@example.com", password: "x" }).ok, true);
  });

  test("瀏覽器禁止存取 sessionStorage 時視為未登入，不會丟出錯誤", () => {
    const original = globalThis.sessionStorage;
    globalThis.sessionStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    try {
      assert.equal(auth.getCurrentUser(), null);
      assert.doesNotThrow(() => auth.setCurrentResourceId("res-1"));
      assert.equal(auth.getCurrentResourceId(), "");
    } finally {
      globalThis.sessionStorage = original;
    }
  });
});
