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

  test("登入狀態與註冊的帳號清單都存 sessionStorage，localStorage 沒有任何資料", () => {
    auth.register({ name: "王示範", email: "w@example.com", password: "x", role: "reader" });
    assert.ok(session.data.currentUser, "登入者在 sessionStorage");
    assert.equal(JSON.parse(session.data.users).length, 1, "帳號在 sessionStorage");
    assert.deepEqual(local.data, {}, "localStorage 沒有任何資料");
  });

  test("關閉瀏覽器後自動登出，註冊的帳號也清除；示範帳號仍可登入", () => {
    auth.register({ name: "王示範", email: "w@example.com", password: "x", role: "reader" });
    assert.equal(auth.isAuthenticated(), true);
    closeBrowser();
    assert.equal(auth.isAuthenticated(), false);
    assert.equal(auth.getUsers().length, 0, "註冊的帳號已清除");
    assert.equal(auth.login({ email: "w@example.com", password: "x" }).ok, false);
    assert.equal(auth.login({ email: "reader@demo.carelink", password: "demo1234" }).ok, true, "示範帳號寫在程式裡");
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
    auth.register({ name: "王示範", email: "w@example.com", password: "x", role: "reader" });
    auth.setCurrentResourceId("res-1");
    auth.clearCurrentUser();
    assert.equal(auth.getCurrentUser(), null);
    assert.equal(auth.getCurrentResourceId(), "");
  });

  test("四種角色：系統管理員、判讀人員、健康管理員、資源點", () => {
    assert.deepEqual(ROLE_CODES, ["admin", "reader", "manager", "provider"]);
  });

  test("註冊時可指定角色，登入後讀得到", () => {
    auth.register({ name: "判讀", email: "reader@example.com", password: "x", role: "reader" });
    assert.equal(auth.getCurrentRole(), "reader");
    auth.login({ email: "reader@example.com", password: "x" });
    assert.equal(auth.getCurrentRole(), "reader");
    assert.equal(auth.hasRole("reader", "admin"), true);
    assert.equal(auth.hasRole("manager"), false);
  });

  test("註冊必須選角色，不開放系統管理員；Email 含 admin 不再自動成為管理員", () => {
    assert.deepEqual(auth.register({ name: "A", email: "admin@example.com", password: "x" }), { ok: false, error: "請選擇角色" });
    assert.equal(auth.register({ name: "A", email: "admin@example.com", password: "x", role: "admin" }).ok, false);
    assert.equal(auth.register({ name: "B", email: "b@example.com", password: "x", role: "boss" }).ok, false);
    assert.equal(auth.getUsers().length, 0, "都沒有建立帳號");
    assert.equal("resolveRole" in auth, false, "已移除 Email 備援規則");
  });

  test("資源點註冊需選擇綁定的資源，並記在帳號與登入狀態", () => {
    assert.equal(auth.register({ name: "P", email: "p@example.com", password: "x", role: "provider" }).ok, false);
    const result = auth.register({ name: "P", email: "p@example.com", password: "x", role: "provider", resourceId: "res-9" });
    assert.equal(result.ok, true);
    assert.equal(result.user.resourceId, "res-9");
    assert.equal(auth.getCurrentUser().resourceId, "res-9");
    const reader = auth.register({ name: "R", email: "r@example.com", password: "x", role: "reader", resourceId: "res-9" });
    assert.equal("resourceId" in reader.user, false, "其他角色不記綁定資源");
  });

  test("沒有角色的舊帳號（user、citizen 或空白）：已登入但角色為空，只能看公開頁", () => {
    for (const role of ["user", "citizen", undefined]) {
      auth.setCurrentUser({ id: 1, name: "舊帳號", email: "admin@example.com", role });
      assert.equal(auth.isAuthenticated(), true);
      assert.equal(auth.getCurrentRole(), "", String(role));
      assert.equal(auth.hasRole("admin"), false);
    }
  });

  test("示範帳號：每次都能登入、不存入瀏覽器、不能被註冊", () => {
    const accounts = [
      ["admin@demo.carelink", "admin"],
      ["reader@demo.carelink", "reader"],
      ["manager@demo.carelink", "manager"],
      ["provider@demo.carelink", "provider"],
    ];
    for (const [email, role] of accounts) {
      const result = auth.login({ email: email.toUpperCase(), password: "demo1234" });
      assert.equal(result.ok, true, email);
      assert.equal(auth.getCurrentRole(), role, email);
    }
    assert.equal(auth.getUsers().length, 0, "示範帳號不寫入帳號清單");
    assert.equal(auth.login({ email: "admin@demo.carelink", password: "wrong" }).ok, false);
    assert.deepEqual(auth.register({ name: "冒用", email: "reader@demo.carelink", password: "x", role: "reader" }), {
      ok: false,
      error: "這是示範帳號的 Email，請直接登入",
    });
  });

  test("示範帳號的姓名、判讀類別與綁定資源", () => {
    auth.login({ email: "reader@demo.carelink", password: "demo1234" });
    assert.deepEqual(
      (({ name, readerType }) => ({ name, readerType }))(auth.getCurrentUser()),
      { name: "郭範例", readerType: "doctor" }
    );
    auth.login({ email: "manager@demo.carelink", password: "demo1234" });
    assert.equal(auth.getCurrentUser().name, "高示範");
    auth.login({ email: "provider@demo.carelink", password: "demo1234" });
    assert.equal(auth.getCurrentUser().resourceId, "", "資源點示範帳號沒有綁定資源");
  });

  test("未登入時沒有角色", () => {
    assert.equal(auth.getCurrentRole(), null);
    assert.equal(auth.hasRole("admin"), false);
  });

  test("資料損壞時不會出錯", () => {
    local.data.users = "{壞掉";
    session.data.currentUser = "{壞掉";
    assert.equal(auth.getCurrentRole(), null);
    assert.equal(auth.register({ name: "C", email: "c@example.com", password: "x", role: "manager" }).ok, true);
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
