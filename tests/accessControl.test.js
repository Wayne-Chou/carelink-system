import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEMO_ACCOUNTS, PERMISSIONS, REGISTERABLE_ROLES, ROLE_CODES } from "../src/config/roles.js";
import {
  can,
  canUseDashboard,
  canViewAssessment,
  canViewResource,
  checkRouteAccess,
  dashboardResourceId,
  filterTodosFor,
  homePathFor,
  landingPathFor,
  shortcutsFor,
  todoScopeFor,
} from "../src/services/accessControl.js";
import { PUBLIC_ROUTES, ROUTE_ACCESS, routeMeta } from "../src/router/access.js";
import { DEMO_RESOURCES } from "../src/services/demoResources.js";

const RES001 = DEMO_RESOURCES.find((r) => r.code === "Res001").id;
const RES002 = DEMO_RESOURCES.find((r) => r.code === "Res002").id;
const user = (role) => DEMO_ACCOUNTS.find((a) => a.role === role);
const ADMIN = user("admin");
const READER = user("reader");
const MANAGER = user("manager");
const PROVIDER = user("provider");
const NO_ROLE = { id: 1, name: "舊帳號", email: "admin@example.com", role: "user" };

const ASSESSMENTS = {
  linked: { id: "linked", caseId: "case_demo_02" },
  unlinked: { id: "unlinked", caseId: null },
};
const findAssessment = (id) => ASSESSMENTS[id] ?? null;
const route = (name, params = {}) => ({ name, params, fullPath: `/${name}`, matched: [{}], meta: routeMeta(name) });
const allowed = (u, name, params) => checkRouteAccess(route(name, params), u, { findAssessment }).ok;

test("路由表：router/index.js 的每個路由都列在權限表或公開頁，沒有遺漏", () => {
  const source = readFileSync(new URL("../src/router/index.js", import.meta.url), "utf8");
  const names = [...source.matchAll(/name: "([a-z-]+)"|meta\("([a-z-]+)"\)/g)].map((m) => m[1] ?? m[2]);
  assert.ok(names.length >= 18);
  for (const name of names) {
    assert.ok(name in ROUTE_ACCESS || PUBLIC_ROUTES.includes(name), `${name} 沒有設定權限`);
  }
  for (const name of Object.keys(ROUTE_ACCESS)) assert.ok(names.includes(name), `權限表的 ${name} 不在路由中`);
});

test("角色設定：每個角色都有功能清單；註冊不開放系統管理員", () => {
  for (const role of ROLE_CODES) assert.ok(Array.isArray(PERMISSIONS[role]) && PERMISSIONS[role].length, role);
  assert.deepEqual(REGISTERABLE_ROLES, ["reader", "manager", "provider"]);
});

test("公開頁不需登入，任何人（含沒有角色的帳號）都能進入；黃燈開啟的探索頁在新分頁也不受影響", () => {
  for (const name of PUBLIC_ROUTES) {
    for (const u of [null, NO_ROLE, ADMIN, READER, MANAGER, PROVIDER]) {
      assert.equal(allowed(u, name, { id: RES001 }), true, `${name} ${u?.role ?? "未登入"}`);
    }
  }
});

test("未登入：需登入的頁面一律導向登入", () => {
  for (const name of Object.keys(ROUTE_ACCESS)) {
    assert.deepEqual(checkRouteAccess(route(name), null), { ok: false, reason: "login" }, name);
  }
});

// 權限矩陣：✔ 可進入；空白為沒有權限（導回首頁）
const MATRIX = {
  //                     admin  reader manager provider 無角色
  "assessment-new":     [true, true, false, false, false],
  assessments:          [true, true, false, false, false],
  todo:                 [true, true, true, false, false],
  list:                 [true, false, false, false, false],
  "resources-list":     [true, false, false, false, false],
  form:                 [true, false, false, false, false],
  "form-edit":          [true, false, false, false, false],
  success:              [true, false, false, false, false],
  "resource-dashboard": [true, false, false, true, false],
  cases:                [true, false, true, false, false],
  "case-detail":        [true, false, true, false, false],
};

test("各角色可進入的頁面（權限矩陣）", () => {
  const users = [ADMIN, READER, MANAGER, PROVIDER, NO_ROLE];
  for (const [name, expected] of Object.entries(MATRIX)) {
    assert.deepEqual(
      users.map((u) => allowed(u, name, { id: "x" })),
      expected,
      name
    );
  }
});

test("資源詳細頁：系統管理員、判讀人員、健康管理員都能看；資源點只能看自己綁定的資源", () => {
  for (const u of [ADMIN, READER, MANAGER]) {
    assert.equal(allowed(u, "resource-detail", { id: RES002 }), true, u.role);
  }
  assert.equal(allowed(PROVIDER, "resource-detail", { id: RES001 }), true);
  assert.equal(allowed(PROVIDER, "resource-detail", { id: RES002 }), false);
  assert.equal(allowed(NO_ROLE, "resource-detail", { id: RES001 }), false);
  assert.equal(canViewResource({ ...PROVIDER, resourceId: "" }, ""), false, "沒有綁定資源的資源點");
});

test("判讀頁：判讀人員、系統管理員看全部；健康管理員只看已開案的；資源點不行", () => {
  assert.equal(allowed(READER, "assessment-review", { id: "unlinked" }), true);
  assert.equal(allowed(ADMIN, "assessment-review", { id: "unlinked" }), true);
  assert.equal(allowed(MANAGER, "assessment-review", { id: "linked" }), true);
  assert.equal(allowed(MANAGER, "assessment-review", { id: "unlinked" }), false);
  assert.equal(allowed(MANAGER, "assessment-review", { id: "missing" }), false);
  assert.equal(allowed(PROVIDER, "assessment-review", { id: "linked" }), false);
  assert.equal(canViewAssessment(MANAGER, ASSESSMENTS.linked), true);
});

test("唯讀與連結：判讀人員沒有個案頁權限；健康管理員不能判讀、作廢；只有系統管理員能編輯資源", () => {
  assert.equal(can(READER, "case.manage"), false, "判讀頁的已建立個案只顯示編碼");
  assert.equal(can(READER, "assessment.review"), true);
  assert.equal(can(MANAGER, "assessment.review"), false);
  assert.equal(can(MANAGER, "assessment.list"), false, "唯讀判讀頁不顯示「回評估列表」");
  assert.deepEqual(
    [ADMIN, READER, MANAGER, PROVIDER].map((u) => can(u, "resource.manage")),
    [true, false, false, false]
  );
});

test("資源端後台：系統管理員可檢視任何資源；資源點固定為綁定的資源", () => {
  assert.equal(canUseDashboard(ADMIN, RES002), true);
  assert.equal(canUseDashboard(PROVIDER, RES001), true);
  assert.equal(canUseDashboard(PROVIDER, RES002), false);
  assert.equal(canUseDashboard(READER, RES001), false);
  assert.equal(dashboardResourceId(ADMIN, RES002), RES002, "系統管理員沿用資源列表選擇的資源");
  assert.equal(dashboardResourceId(PROVIDER, RES002), RES001, "資源點不能切換");
  assert.equal(dashboardResourceId(READER, RES001), "");
});

test("登入後的頁面：資源點進入資源端後台；被擋下的頁面有權限才回去", () => {
  assert.equal(homePathFor(PROVIDER), "/resource-dashboard");
  assert.equal(homePathFor(READER), "/");
  assert.equal(landingPathFor(READER, route("assessments")), "/assessments");
  assert.equal(landingPathFor(MANAGER, route("assessments")), "/", "沒有權限就回預設頁");
  assert.equal(landingPathFor(PROVIDER, route("cases")), "/resource-dashboard");
  assert.equal(landingPathFor(READER, { ...route("x"), matched: [] }), "/", "不存在的頁面");
  assert.equal(landingPathFor(ADMIN, route("login")), "/");
});

const TODOS = [
  { type: "unreviewed", audience: "reader" },
  { type: "first_contact_overdue", audience: "manager" },
  { type: "follow_up_due", audience: "manager" },
  { type: "resource_verify", audience: "admin" },
];

test("待辦依角色只顯示自己的項目，系統管理員可切換全部", () => {
  const types = (list) => list.map((t) => t.type);
  assert.deepEqual(types(filterTodosFor(READER, TODOS)), ["unreviewed"]);
  assert.deepEqual(types(filterTodosFor(READER, TODOS, "all")), ["unreviewed"], "判讀人員不能切換全部");
  assert.deepEqual(types(filterTodosFor(MANAGER, TODOS, "admin")), ["first_contact_overdue", "follow_up_due"]);
  assert.deepEqual(types(filterTodosFor(ADMIN, TODOS)), ["resource_verify"], "系統管理員預設看管理員項目");
  assert.equal(filterTodosFor(ADMIN, TODOS, "all").length, 4);
  assert.deepEqual(types(filterTodosFor(ADMIN, TODOS, "reader")), ["unreviewed"]);
  assert.deepEqual(filterTodosFor(PROVIDER, TODOS), []);
  assert.deepEqual(filterTodosFor(NO_ROLE, TODOS), []);
  assert.deepEqual(todoScopeFor(ADMIN), { own: "admin", canViewAll: true });
  assert.deepEqual(todoScopeFor(PROVIDER), { own: null, canViewAll: false });
});

test("首頁快捷區：只列出該角色能用的入口，且每個入口都能通過路由檢查", () => {
  const keys = (u) => shortcutsFor(u).map((s) => s.key);
  assert.deepEqual(keys(ADMIN), ["todo", "assessmentNew", "assessments", "cases", "resources", "resourceNew"]);
  assert.deepEqual(keys(READER), ["todo", "assessmentNew", "assessments"]);
  assert.deepEqual(keys(MANAGER), ["todo", "cases"]);
  assert.deepEqual(keys(PROVIDER), ["dashboard", "myResource"]);
  assert.deepEqual(keys(NO_ROLE), []);
  const NAME_BY_PATH = {
    "/todo": "todo",
    "/assessment/new": "assessment-new",
    "/assessments": "assessments",
    "/cases": "cases",
    "/list": "list",
    "/form": "form",
    "/resource-dashboard": "resource-dashboard",
  };
  for (const u of [ADMIN, READER, MANAGER, PROVIDER]) {
    for (const s of shortcutsFor(u)) {
      const name = NAME_BY_PATH[s.path] ?? "resource-detail";
      const params = name === "resource-detail" ? { id: s.path.split("/").pop() } : {};
      assert.equal(allowed(u, name, params), true, `${u.role} ${s.path}`);
    }
  }
});

test("示範資源點帳號綁定 Res001", () => {
  assert.equal(PROVIDER.resourceId, RES001);
});
