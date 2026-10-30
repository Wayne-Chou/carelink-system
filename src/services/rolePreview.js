// 角色預覽（原型展示用，右下角「?」按鈕的面板）：各角色登入後畫面的縮小模擬，不實際登入
// 全部沿用實際頁面的設定與資料函式，功能變更時預覽跟著更新：
//   姓名與角色      示範帳號（config/roles.js）經 auth.sessionUserOf 轉成登入後的資料
//   後台選單        accessControl.adminMenuFor（後台版面的左側選單）
//   待辦            todoService.computeTodos + accessControl.filterTodosFor（待辦頁預設範圍）
//   示範資料的樣子  services/listViews.js（各列表頁的卡片資料）
//   能進入的頁面    config/sitemap.js + sitemapService.resolvePage

import { getRoleLabel } from "../config/roles.js";
import { adminMenuFor, can, filterTodosFor, homePathFor, shortcutsFor } from "./accessControl.js";
import { computeTodos } from "./todoService.js";
import { findDemoData } from "./demoData.js";
import { getSitemapGroups, resolvePage } from "./sitemapService.js";
import { assessmentRows, caseRows, exploreCard, referralRows, resourceRows } from "./listViews.js";
import { getAllResources, getRecommendableResources } from "./resourceService.js";
import { getAllAssessments, isActiveAssessment } from "./assessmentService.js";
import { getAllCases } from "./caseService.js";
import { countByStatus, listAccounts } from "./accountService.js";
import { sessionUserOf } from "../utils/auth.js";
import { todayString } from "../utils/date.js";

// 預覽最多列出幾筆待辦
export const PREVIEW_TODO_LIMIT = 3;

export const hasDemoData = (demo) => !!(demo.resource || demo.assessment || demo.case);

// 系統管理員：各列表的筆數，名稱沿用後台的入口名稱
function adminSummary(user) {
  const labels = Object.fromEntries(shortcutsFor(user).map((s) => [s.key, s.label]));
  const accounts = listAccounts();
  return {
    pendingAccounts: countByStatus(accounts).pending,
    counts: [
      { key: "resources", label: labels.resources, count: getAllResources().length },
      // 評估列表「全部」分頁不含已作廢
      { key: "assessments", label: labels.assessments, count: getAllAssessments().filter(isActiveAssessment).length },
      { key: "cases", label: labels.cases, count: getAllCases().length },
      { key: "accounts", label: labels.accounts, count: accounts.length },
    ],
  };
}

/**
 * 示範資料在這個角色畫面的樣子（與實際頁面相同的卡片資料）；沒有示範資料時為 null
 *   public           探索頁的資源卡片（示範資源不在探索頁時 card 為 null）
 *   resource_manager 資源列表的卡片
 *   reader           評估列表的卡片
 *   manager          個案列表的卡片
 *   provider         資源端後台的轉介紀錄（綁定資源的全部轉介）
 *   admin            待審核帳號數與各列表筆數
 */
export function demoContentFor(role, user, demo = findDemoData()) {
  if (!hasDemoData(demo)) return null;
  switch (role) {
    case null: {
      const visible = demo.resource && getRecommendableResources("explore").find((r) => r.id === demo.resource.id);
      return { kind: "explore", card: visible ? exploreCard(visible) : null };
    }
    case "resource_manager":
      return { kind: "resourceList", row: demo.resource ? resourceRows([demo.resource])[0] : null };
    case "reader":
      return { kind: "assessmentList", row: demo.assessment ? assessmentRows([demo.assessment])[0] : null };
    case "manager":
      return { kind: "caseList", row: demo.case ? caseRows([demo.case])[0] : null };
    case "provider":
      return { kind: "referrals", rows: referralRows(user?.resourceId) };
    case "admin":
      return { kind: "adminSummary", ...adminSummary(user) };
    default:
      return null;
  }
}

/**
 * 一個角色分頁的預覽內容
 * @param {object} group  sitemapService.getSitemapGroups() 的一組（role 為 null 是民眾）
 */
export function buildRolePreview(group, { demo = findDemoData(), today = todayString() } = {}) {
  const user = group.account ? sessionUserOf(group.account) : null;
  const canTodo = can(user, "todo.view");
  const todos = canTodo ? filterTodosFor(user, computeTodos({ today })) : [];
  return {
    key: group.key,
    role: group.role,
    label: group.label,
    description: group.description,
    account: group.account,
    user,
    header: user ? { name: user.name, roleLabel: getRoleLabel(user.role) } : null,
    menu: user ? adminMenuFor(user) : [],
    todos: canTodo ? { total: todos.length, items: todos.slice(0, PREVIEW_TODO_LIMIT) } : null,
    content: demoContentFor(group.role, user, demo),
    pages: group.pages.map((page) => ({ ...page, target: resolvePage(page, demo) })),
    homePath: homePathFor(user),
  };
}

export const getPreviewGroups = getSitemapGroups;
