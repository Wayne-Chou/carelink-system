import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = memoryStorage();

const { DEMO_ACCOUNTS, QUICK_LOGINS, ROLE_CODES } = await import("../src/config/roles.js");
const { getCurrentRole, login } = await import("../src/utils/auth.js");
const { homePathFor } = await import("../src/services/accessControl.js");

test("快速登入：四個角色各一個按鈕，對應到同角色的示範帳號", () => {
  assert.deepEqual(QUICK_LOGINS.map((q) => q.role), ROLE_CODES);
  for (const q of QUICK_LOGINS) {
    const account = DEMO_ACCOUNTS.find((a) => a.email === q.email);
    assert.ok(account, q.email);
    assert.equal(account.role, q.role, q.email);
    assert.ok(q.description, `${q.role} 有說明`);
  }
});

test("快速登入的說明：資源管理員、資源點", () => {
  const byRole = (role) => QUICK_LOGINS.find((q) => q.role === role);
  assert.equal(byRole("resource_manager").email, "resource@demo.carelink");
  assert.equal(byRole("resource_manager").description, "管理所有社區資源與資源點綁定");
  assert.equal(byRole("provider").subtitle, "合作機構");
  assert.equal(byRole("provider").description, "回報轉介個案（需先由管理員綁定資源）");
});

test("快速登入的資源點使用 provider@demo.carelink（沒有綁定資源）", () => {
  const provider = QUICK_LOGINS.find((q) => q.role === "provider");
  assert.equal(provider.email, "provider@demo.carelink");
  assert.equal(DEMO_ACCOUNTS.find((a) => a.email === provider.email).resourceId, "");
});

test("資源點示範帳號只有一個", () => {
  assert.deepEqual(
    DEMO_ACCOUNTS.filter((a) => a.role === "provider").map((a) => a.email),
    ["provider@demo.carelink"]
  );
});

test("快速登入與一般登入相同：以示範帳號登入後依角色導向", () => {
  const LANDING = { admin: "/", resource_manager: "/", reader: "/", manager: "/", provider: "/resource-dashboard" };
  for (const q of QUICK_LOGINS) {
    const account = DEMO_ACCOUNTS.find((a) => a.email === q.email);
    const result = login({ email: account.email, password: account.password });
    assert.equal(result.ok, true, q.email);
    assert.equal(getCurrentRole(), q.role);
    assert.equal(homePathFor(result.user), LANDING[q.role], q.role);
  }
});
