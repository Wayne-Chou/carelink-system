import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const auth = await import("../src/utils/auth.js");
const { FIXTURE_IDS } = await import("./fixtures/resources.js");
const { addUser, TEST_PASSWORD } = await import("./helpers/accounts.js");

const RES_A = FIXTURE_IDS.Res101;
const RES_B = FIXTURE_IDS.Res102;
const DEMO_PROVIDER = "provider@demo.carelink";

// 已啟用的資源點帳號（審核通過時綁定 resourceId）
const registerProvider = (email, resourceId) => addUser({ name: "李範例", email, role: "provider", resourceId });

beforeEach(() => {
  session.data = {};
});

test("資源點帳號清單：示範帳號預設沒有綁定資源", () => {
  assert.deepEqual(
    auth.listProviderAccounts().map((a) => [a.email, a.resourceId, a.isDemo]),
    [[DEMO_PROVIDER, "", true]]
  );
  assert.deepEqual(auth.getProviderAccountsForResource(RES_A), []);
  assert.deepEqual(auth.getProviderAccountsForResource(""), []);
});

test("綁定示範帳號：登入後就是綁定的資源；已登入時綁定也立即生效，不必重新登入", () => {
  auth.login({ email: DEMO_PROVIDER, password: "demo1234" });
  assert.equal(auth.getCurrentUser().resourceId, "");

  assert.deepEqual(auth.bindProviderAccount(DEMO_PROVIDER, RES_A), { ok: true, previousResourceId: "" });
  assert.equal(auth.getCurrentUser().resourceId, RES_A, "已登入的資源點立即生效");
  assert.deepEqual(auth.getProviderAccountsForResource(RES_A).map((a) => a.email), [DEMO_PROVIDER]);

  auth.clearCurrentUser();
  auth.login({ email: DEMO_PROVIDER, password: "demo1234" });
  assert.equal(auth.getCurrentUser().resourceId, RES_A);
});

test("一個帳號只綁定一筆資源：改綁時原本的綁定解除", () => {
  auth.bindProviderAccount(DEMO_PROVIDER, RES_A);
  assert.deepEqual(auth.bindProviderAccount(DEMO_PROVIDER, RES_B), { ok: true, previousResourceId: RES_A });
  assert.deepEqual(auth.getProviderAccountsForResource(RES_A), []);
  assert.deepEqual(auth.getProviderAccountsForResource(RES_B).map((a) => a.email), [DEMO_PROVIDER]);
});

test("一筆資源可以綁定多個資源點帳號", () => {
  registerProvider("p1@example.com", RES_A);
  auth.bindProviderAccount(DEMO_PROVIDER, RES_A);
  assert.deepEqual(
    auth.getProviderAccountsForResource(RES_A).map((a) => a.email),
    [DEMO_PROVIDER, "p1@example.com"]
  );
});

test("解除綁定：帳號之後沒有綁定任何資源，也不會退回註冊時選的資源", () => {
  registerProvider("p1@example.com", RES_A);
  assert.deepEqual(auth.unbindProviderAccount("P1@example.com"), { ok: true, previousResourceId: RES_A });
  assert.deepEqual(auth.getProviderAccountsForResource(RES_A), []);
  auth.login({ email: "p1@example.com", password: TEST_PASSWORD });
  assert.equal(auth.getCurrentUser().resourceId, "");
});

test("註冊的資源點帳號：綁定註冊時選的資源，可由管理員改綁", () => {
  registerProvider("p1@example.com", RES_A);
  const account = auth.listProviderAccounts().find((a) => a.email === "p1@example.com");
  assert.equal(account.resourceId, RES_A);
  assert.equal(account.isDemo, false);
  auth.bindProviderAccount("p1@example.com", RES_B);
  auth.login({ email: "p1@example.com", password: TEST_PASSWORD });
  assert.equal(auth.getCurrentUser().resourceId, RES_B);
});

test("綁定的檢查：只能綁定資源點帳號，且要指定資源", () => {
  addUser({ name: "判讀", email: "r@example.com", role: "reader" });
  assert.equal(auth.bindProviderAccount("r@example.com", RES_A).ok, false, "判讀人員不是資源點帳號");
  assert.equal(auth.bindProviderAccount("nobody@example.com", RES_A).ok, false);
  assert.deepEqual(auth.bindProviderAccount(DEMO_PROVIDER, ""), { ok: false, error: "請選擇要綁定的資源" });
  assert.equal(auth.unbindProviderAccount("nobody@example.com").ok, false);
});

test("待審核、已退回的資源點申請不列入可綁定的帳號", () => {
  addUser({ email: "pending@example.com", role: "provider", resourceId: RES_A, status: "pending" });
  addUser({ email: "rejected@example.com", role: "provider", resourceId: RES_A, status: "rejected" });
  addUser({ email: "suspended@example.com", role: "provider", resourceId: RES_A, status: "suspended" });
  assert.deepEqual(
    auth.listProviderAccounts().map((a) => [a.email, a.status]),
    [
      [DEMO_PROVIDER, "active"],
      ["suspended@example.com", "suspended"],
    ]
  );
  assert.equal(auth.bindProviderAccount("pending@example.com", RES_B).ok, false);
});

test("綁定關係存在帳號儲存區（sessionStorage），關閉瀏覽器後清除", () => {
  auth.bindProviderAccount(DEMO_PROVIDER, RES_A);
  assert.ok(session.data.providerBindings);
  session.data = {};
  assert.equal(auth.listProviderAccounts()[0].resourceId, "");
});

test("修改者：目前登入者的姓名與角色", () => {
  assert.deepEqual(auth.currentActor(), { name: "", role: "" });
  auth.login({ email: "resource@demo.carelink", password: "demo1234" });
  assert.deepEqual(auth.currentActor(), { name: "林範例", role: "resource_manager" });
});
