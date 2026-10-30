// 路由表（router/routes.js）：後台網址、後台版面、舊網址導向
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { ROUTES, LEGACY_REDIRECTS, ADMIN_BASE, pathOf } = await import("../src/router/routes.js");
const { ADMIN_LAYOUT, navigateTo, resolvePath } = await import("./helpers/routing.js");

const inAdminLayout = (route) => route.matched.some((m) => m.components?.default === ADMIN_LAYOUT);

test("登入後才能使用的頁面都在 /admin 底下，民眾端不在", () => {
  const PUBLIC = ["home", "explore", "user-resource-detail", "login", "register", "forgot-password", "reset-password", "mailbox", "sitemap"];
  for (const r of ROUTES) {
    const underAdmin = r.path === ADMIN_BASE || r.path.startsWith(`${ADMIN_BASE}/`);
    assert.equal(underAdmin, !PUBLIC.includes(r.name), `${r.name} ${r.path}`);
  }
});

test("後台頁面使用後台版面；評估填寫頁在 /admin 底下但不使用後台版面（沒有選單）", () => {
  for (const r of ROUTES.filter((x) => x.area === "admin")) {
    const route = resolvePath(pathOf(r.name, { id: "x1" }));
    assert.equal(route.name, r.name, r.path);
    assert.ok(inAdminLayout(route), `${r.name} 應在後台版面底下`);
  }
  const fill = resolvePath("/admin/assessments/new");
  assert.equal(fill.name, "assessment-new");
  assert.equal(inAdminLayout(fill), false, "評估填寫頁沒有後台選單");
  assert.equal(inAdminLayout(resolvePath("/")), false, "民眾首頁不在後台版面");
});

test("/admin/resources/new 與 /admin/resources/created 不會被解析成資源詳細頁的 :id", () => {
  assert.equal(resolvePath("/admin/resources/new").name, "form");
  assert.equal(resolvePath("/admin/resources/created").name, "success");
  assert.equal(resolvePath("/admin/assessments/new").name, "assessment-new");
  const detail = resolvePath("/admin/resources/r-123");
  assert.equal(detail.name, "resource-detail");
  assert.equal(detail.params.id, "r-123");
  assert.equal(resolvePath("/admin/resources/r-123/edit").name, "form-edit");
});

test("舊網址都導向對應的新網址，保留參數與 query", async () => {
  const CASES = [
    ["/todo", "/admin/todo"],
    ["/assessment/new", "/admin/assessments/new"],
    ["/assessments", "/admin/assessments"],
    ["/assessments/a1", "/admin/assessments/a1"],
    ["/cases", "/admin/cases"],
    ["/case/c1", "/admin/cases/c1"],
    ["/list", "/admin/resources"],
    ["/resources", "/admin/resources"],
    ["/form", "/admin/resources/new"],
    ["/success?id=r1&missing=2", "/admin/resources/created?id=r1&missing=2"],
    ["/resources/r1", "/admin/resources/r1"],
    ["/form/r1", "/admin/resources/r1/edit"],
    ["/resource-dashboard", "/admin/provider"],
    ["/accounts?review=u1", "/admin/accounts?review=u1"],
  ];
  assert.equal(CASES.length, LEGACY_REDIRECTS.length, "每個舊網址都有測試");
  for (const [from, to] of CASES) {
    const arrived = await navigateTo(from);
    assert.equal(arrived.fullPath, to, from);
  }
});

test("程式中不再使用舊網址（舊網址只靠導向維持相容）", () => {
  const OLD = /['"`](\/todo|\/assessment\/new|\/assessments|\/cases|\/case\/|\/list|\/resources|\/form|\/success|\/resource-dashboard|\/accounts)(?=['"`/?])/;
  const files = [
    "services/todoService.js",
    "services/accountService.js",
    "services/accessControl.js",
    "config/sitemap.js",
    "config/tours.js",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, OLD, file);
  }
});
