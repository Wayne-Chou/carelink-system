import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const { SITEMAP_GROUPS, SITEMAP_EXCLUDED } = await import("../src/config/sitemap.js");
const { ROLE_PREVIEW_LINK } = await import("../src/config/help.js");
const { getSitemapGroups, resolvePage, demoAccountFor } = await import("../src/services/sitemapService.js");
const { DEMO_NAMES, findDemoData, loadDemoData, countData } = await import("../src/services/demoData.js");
const { PUBLIC_ROUTES, ROUTE_ACCESS, routeMeta } = await import("../src/router/access.js");
const { checkRouteAccess, homePathFor } = await import("../src/services/accessControl.js");
const { getAssessmentById, getAllAssessments } = await import("../src/services/assessmentService.js");
const { getReferralsForResource, getAllCases } = await import("../src/services/caseService.js");
const { getAllResources, getRecommendableResources, createResource } = await import("../src/services/resourceService.js");
const auth = await import("../src/utils/auth.js");
const { ROLE_CODES } = await import("../src/config/roles.js");

const ROUTER_SOURCE = readFileSync(new URL("../src/router/index.js", import.meta.url), "utf8");
const ROUTE_NAMES = [...ROUTER_SOURCE.matchAll(/name: "([a-z-]+)"|meta\("([a-z-]+)"\)/g)].map((m) => m[1] ?? m[2]);
const ALL_PAGES = SITEMAP_GROUPS.flatMap((g) => g.pages);
// 沒有 :id 的網址 → 路由名稱（用來檢查 fallback 開的頁面）
const NAME_BY_PATH = Object.fromEntries(ALL_PAGES.filter((p) => !p.path.includes(":")).map((p) => [p.path, p.route]));

const loginAs = (role) => {
  const account = demoAccountFor(role);
  assert.equal(auth.login({ email: account.email, password: account.password }).ok, true, role);
  return auth.getCurrentUser();
};

// 依解析出的網址組成路由物件，交給權限檢查
function routeFor(page, target) {
  const name = target.source === "fallback" ? NAME_BY_PATH[target.path] : page.route;
  assert.ok(name, `${page.route} 的 fallback ${target.path} 不在網站地圖中`);
  const id = target.source === "demo" && page.needs ? target.path.split("/").pop() : undefined;
  return { name, params: id ? { id } : {}, fullPath: target.path, matched: [{}], meta: routeMeta(name) };
}
const allowed = (user, page, target) =>
  checkRouteAccess(routeFor(page, target), user, { findAssessment: getAssessmentById }).ok;

beforeEach(() => {
  session.data = {};
});

describe("網站地圖設定", () => {
  test("每個路由都列在網站地圖，或列在 SITEMAP_EXCLUDED 並說明原因", () => {
    const listed = new Set(ALL_PAGES.map((p) => p.route));
    for (const name of ROUTE_NAMES) {
      assert.ok(listed.has(name) || SITEMAP_EXCLUDED[name], `${name} 沒有列在網站地圖`);
    }
    for (const name of listed) assert.ok(ROUTE_NAMES.includes(name), `${name} 不是路由`);
    for (const name of Object.keys(SITEMAP_EXCLUDED)) assert.equal(listed.has(name), false, `${name} 同時被排除與列出`);
  });

  test("依角色分組：民眾與五個角色；每頁都有名稱與一行說明", () => {
    const groups = getSitemapGroups();
    assert.deepEqual(groups.map((g) => g.role), [null, ...ROLE_CODES]);
    assert.equal(groups[0].label, "民眾（不需登入）");
    assert.deepEqual(groups.slice(1).map((g) => g.label), ["系統管理員", "資源管理員", "判讀人員", "健康管理員", "資源點"]);
    for (const g of groups) {
      assert.equal(!!g.account, g.role !== null, `${g.key} 的示範帳號`);
      for (const p of g.pages) {
        assert.ok(p.label && p.description, `${g.key} ${p.route}`);
        assert.equal(p.path.includes(":id"), !!p.needs, `${p.route} 需要資料時要有 needs`);
        if (p.needs) assert.ok(p.fallback, `${p.route} 要有 fallback`);
      }
    }
  });

  test("/sitemap 導向首頁並自動打開角色預覽面板，不另外列為頁面", () => {
    assert.ok(ROUTER_SOURCE.includes(`{ path: "/sitemap", name: "sitemap", redirect: ROLE_PREVIEW_LINK }`));
    assert.equal(ROLE_PREVIEW_LINK.path, "/");
    assert.ok(PUBLIC_ROUTES.includes("sitemap"));
    assert.ok(SITEMAP_EXCLUDED.sitemap);
    assert.equal(ALL_PAGES.some((p) => p.route === "sitemap"), false);
  });

  test("民眾的頁面都是公開頁", () => {
    for (const p of SITEMAP_GROUPS[0].pages) assert.ok(PUBLIC_ROUTES.includes(p.route), p.route);
  });
});

describe("各角色的頁面都能進入", () => {
  for (const withDemo of [true, false]) {
    test(withDemo ? "有示範資料：開啟示範資料那一筆" : "沒有示範資料：改開對應的列表頁", () => {
      if (withDemo) loadDemoData();
      const demo = findDemoData();
      for (const group of SITEMAP_GROUPS.filter((g) => g.role)) {
        const user = loginAs(group.role);
        for (const page of group.pages) {
          const target = resolvePage(page, demo);
          if (page.needs) assert.equal(target.source, withDemo ? "demo" : "fallback", `${group.role} ${page.route}`);
          assert.equal(allowed(user, page, target), true, `${group.role} ${page.route} → ${target.path}`);
        }
      }
      for (const page of SITEMAP_GROUPS[0].pages) {
        assert.equal(allowed(null, page, resolvePage(page, demo)), true, `民眾 ${page.route}`);
      }
    });
  }

  test("每個角色能進入的頁面都有列出（不遺漏）", () => {
    loadDemoData();
    const demo = findDemoData();
    const ids = { resource: demo.resource.id, assessment: demo.assessment.id, case: demo.case.id };
    const idFor = { "assessment-review": ids.assessment, "case-detail": ids.case };
    for (const group of SITEMAP_GROUPS.filter((g) => g.role)) {
      const user = loginAs(group.role);
      const listed = new Set(group.pages.map((p) => p.route));
      for (const name of Object.keys(ROUTE_ACCESS).filter((n) => !SITEMAP_EXCLUDED[n])) {
        const route = { name, params: { id: idFor[name] ?? ids.resource }, matched: [{}], meta: routeMeta(name) };
        if (checkRouteAccess(route, user, { findAssessment: getAssessmentById }).ok) {
          assert.ok(listed.has(name), `${group.role} 可以進入 ${name}，但網站地圖沒有列出`);
        }
      }
    }
  });

  test("系統管理員的資源端後台：先選好示範資源", () => {
    const page = SITEMAP_GROUPS.find((g) => g.role === "admin").pages.find((p) => p.route === "resource-dashboard");
    assert.deepEqual(resolvePage(page, findDemoData()), { path: "/resource-dashboard", source: "page" });
    const demo = loadDemoData();
    assert.equal(resolvePage(page, demo).resourceId, String(demo.resource.id));
  });

  test("資源點以示範帳號登入後進入資源端後台", () => {
    loadDemoData();
    assert.equal(homePathFor(loginAs("provider")), "/resource-dashboard");
  });
});

describe("示範資料", () => {
  test("1 筆資源：綠燈、正式合作、可推薦，綁定 provider@demo.carelink", () => {
    const { resource } = loadDemoData();
    assert.equal(resource.riskLevel, "green");
    assert.equal(resource.partnership, "formal");
    assert.equal(resource.status, "active");
    assert.deepEqual(getRecommendableResources("explore").map((r) => r.id), [resource.id]);
    assert.deepEqual(auth.getProviderAccountsForResource(resource.id).map((a) => a.email), ["provider@demo.carelink"]);
  });

  test("1 筆評估：判讀人員判讀為橘燈轉介並取得同意，已開案", () => {
    const { assessment, case: c } = loadDemoData();
    assert.equal(assessment.review.light, "orange");
    assert.equal(assessment.review.orangeType, "refer");
    assert.equal(assessment.review.consent, true);
    assert.equal(assessment.review.readerName, demoAccountFor("reader").name);
    assert.equal(assessment.caseId, c.id);
    assert.equal(assessment.status, "closed");
  });

  test("1 筆個案：由評估開案，已晤談、已轉介到示範資源，等待資源點回報", () => {
    const { resource, assessment, case: c } = loadDemoData();
    assert.equal(c.referral.assessmentId, assessment.id);
    assert.ok(c.consultation.firstContactAt);
    assert.ok(c.consultation.whatMatters);
    assert.ok(c.consultation.goals.length);
    assert.equal(c.stage, 3);
    assert.deepEqual(c.linkages.map((l) => [l.resourceId, l.status]), [[String(resource.id), "pending"]]);
    assert.equal(getReferralsForResource(resource.id).length, 1, "資源端後台看得到這筆轉介");
  });

  test("只有一位虛構民眾；名稱明顯虛構", () => {
    loadDemoData();
    assert.deepEqual(countData(), { resources: 1, cases: 1, assessments: 1 });
    for (const name of [DEMO_NAMES.person, DEMO_NAMES.resource]) assert.match(name, /示範.*（虛構/);
  });

  test("載入時清空既有的資源、評估、個案；重複載入不會多出資料", () => {
    createResource({ name: "自建資源" });
    loadDemoData();
    loadDemoData();
    assert.deepEqual(getAllResources().map((r) => r.name), [DEMO_NAMES.resource]);
    assert.equal(getAllAssessments().length, 1);
    assert.equal(getAllCases().length, 1);
  });

  test("沒有載入時找不到示範資料", () => {
    assert.deepEqual(findDemoData(), { resource: null, assessment: null, case: null });
  });
});
