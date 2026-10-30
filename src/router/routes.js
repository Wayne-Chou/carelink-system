// 路由表（純資料，router/index.js 與測試共用）：網址、頁面元件、版面，以及舊網址的導向
// 權限另見 router/access.js（以路由名稱對應）
//
// area：
//   public      民眾端（不需登入；首頁、探索頁、登入等）
//   admin       後台：放在 /admin 底下，使用後台版面（components/AdminLayout.vue：左側選單、上方列）
//   fullscreen  網址在 /admin 底下，但不使用後台版面（評估填寫頁：由民眾操作，全螢幕、沒有選單）

import { ROLE_PREVIEW_LINK } from "../config/help.js";

export const ADMIN_BASE = "/admin";

export const ROUTES = [
  // ── 民眾端 ──
  { name: "home", path: "/", page: "Home", area: "public" },
  { name: "explore", path: "/explore", page: "Explore", area: "public" },
  { name: "user-resource-detail", path: "/user/resources/:id", page: "ResourceUserDetail", area: "public" },
  { name: "login", path: "/login", page: "Login", area: "public" },
  { name: "register", path: "/register", page: "Register", area: "public" },
  { name: "forgot-password", path: "/forgot-password", page: "ForgotPassword", area: "public" },
  { name: "reset-password", path: "/reset-password", page: "ResetPassword", area: "public" },
  // 模擬信箱：原型展示用，正式版改由後端寄送 Email
  { name: "mailbox", path: "/mailbox", page: "Mailbox", area: "public" },
  // 角色預覽（原型展示用）在右下角「?」按鈕的面板；/sitemap 導向首頁並自動打開面板
  { name: "sitemap", path: "/sitemap", redirect: ROLE_PREVIEW_LINK, area: "public" },

  // ── 評估填寫：由工作人員登入後把平板交給民眾填寫，不使用後台版面 ──
  { name: "assessment-new", path: "/admin/assessments/new", page: "AssessmentNew", area: "fullscreen" },

  // ── 後台（後台版面）──
  { name: "admin-home", path: "/admin", page: "AdminHome", area: "admin" },
  // 待辦：依今天日期即時計算（doc/specs/assessment-schema.md 第七節），依角色只顯示自己的項目
  { name: "todo", path: "/admin/todo", page: "Todo", area: "admin" },
  { name: "assessments", path: "/admin/assessments", page: "AssessmentList", area: "admin" },
  // 判讀頁：判讀人員、系統管理員可判讀；健康管理員只能唯讀查看已開案的評估
  { name: "assessment-review", path: "/admin/assessments/:id", page: "AssessmentReview", area: "admin" },
  { name: "cases", path: "/admin/cases", page: "CaseList", area: "admin" },
  { name: "case-detail", path: "/admin/cases/:id", page: "CaseDetail", area: "admin" },
  { name: "list", path: "/admin/resources", page: "ResourceList", area: "admin" },
  { name: "form", path: "/admin/resources/new", page: "ResourceForm", area: "admin" },
  { name: "success", path: "/admin/resources/created", page: "SuccessView", area: "admin" },
  // 資源詳細頁（後台）：系統管理員、資源管理員可編輯；其他角色唯讀，資源點只限自己綁定的資源
  { name: "resource-detail", path: "/admin/resources/:id", page: "ResourceDetail", area: "admin" },
  { name: "form-edit", path: "/admin/resources/:id/edit", page: "ResourceForm", area: "admin" },
  { name: "resource-dashboard", path: "/admin/provider", page: "ResourceDashboard", area: "admin" },
  { name: "accounts", path: "/admin/accounts", page: "AccountManagement", area: "admin" },
];

// 舊網址 → 新的路由（保留網址參數與 query，避免書籤、信件連結、導覽失效）
export const LEGACY_REDIRECTS = [
  { from: "/todo", to: "todo" },
  { from: "/assessment/new", to: "assessment-new" },
  { from: "/assessments", to: "assessments" },
  { from: "/assessments/:id", to: "assessment-review" },
  { from: "/cases", to: "cases" },
  { from: "/case/:id", to: "case-detail" },
  { from: "/list", to: "list" },
  { from: "/resources", to: "list" },
  { from: "/form", to: "form" },
  { from: "/success", to: "success" },
  { from: "/resources/:id", to: "resource-detail" },
  { from: "/form/:id", to: "form-edit" },
  { from: "/resource-dashboard", to: "resource-dashboard" },
  { from: "/accounts", to: "accounts" },
];

export const routeByName = (name) => ROUTES.find((r) => r.name === name) ?? null;

// 路由名稱 → 網址（帶入 :id）；程式中組網址一律用這個，網址改變時只需改上方的路由表
export function pathOf(name, params = {}) {
  const route = routeByName(name);
  if (!route) throw new Error(`沒有這個路由：${name}`);
  return route.path.replace(/:([a-zA-Z]+)/g, (_, key) => encodeURIComponent(String(params[key] ?? "")));
}
export const isAdminArea = (name) => routeByName(name)?.area === "admin";

/**
 * 組成 vue-router 的路由設定
 * @param {(page: string) => object|Function} componentFor  頁面名稱 → 元件（測試可傳入空元件）
 * @param {object|Function} adminLayout  後台版面元件
 * @param {(name: string) => object} metaFor  路由名稱 → meta（權限，router/access.js 的 routeMeta）
 */
export function buildRoutes(componentFor, adminLayout, metaFor) {
  const toRoute = (r, path = r.path) =>
    r.redirect
      ? { path, name: r.name, redirect: r.redirect }
      : { path, name: r.name, meta: metaFor(r.name), component: componentFor(r.page) };

  const adminChildren = ROUTES.filter((r) => r.area === "admin").map((r) =>
    toRoute(r, r.path === ADMIN_BASE ? "" : r.path.slice(ADMIN_BASE.length + 1))
  );
  const legacy = LEGACY_REDIRECTS.map(({ from, to }) => ({
    path: from,
    redirect: (route) => ({ name: to, params: route.params, query: route.query, hash: route.hash }),
  }));

  return [
    ...ROUTES.filter((r) => r.area !== "admin").map((r) => toRoute(r)),
    { path: ADMIN_BASE, component: adminLayout, children: adminChildren },
    ...legacy,
  ];
}
