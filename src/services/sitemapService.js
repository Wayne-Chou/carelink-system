// 角色預覽的「能進入的頁面」：把 config/sitemap.js 的頁面轉成實際要開的網址，並提供各角色的示範帳號

import { SITEMAP_GROUPS } from "../config/sitemap.js";
import { DEMO_ACCOUNTS, ROLES } from "../config/roles.js";
import { findDemoData } from "./demoData.js";

export const demoAccountFor = (role) => DEMO_ACCOUNTS.find((a) => a.role === role) ?? null;

/**
 * 頁面要開的網址
 *   需要指定資料（needs）：有示範資料時開那一筆，沒有時開 fallback（對應的列表頁）
 * @returns {{ path: string, source: "page" | "demo" | "fallback", code?: string, resourceId?: string }}
 *   resourceId：selectResource 的頁面要先選好的示範資源（系統管理員的資源端後台）
 */
export function resolvePage(page, demo = findDemoData()) {
  if (page.selectResource) {
    return demo.resource
      ? { path: page.path, source: "demo", code: demo.resource.code, resourceId: String(demo.resource.id) }
      : { path: page.path, source: "page" };
  }
  if (!page.needs) return { path: page.path, source: "page" };
  const record = demo[page.needs];
  if (record) return { path: page.path.replace(":id", record.id), source: "demo", code: record.code };
  return { path: page.fallback, source: "fallback" };
}

// 各組的名稱、角色說明與示範帳號（民眾組沒有帳號）
export function getSitemapGroups() {
  return SITEMAP_GROUPS.map((group) => {
    const role = ROLES.find((r) => r.code === group.role);
    return {
      ...group,
      label: group.label ?? role?.label ?? group.key,
      description: role?.description ?? "不需登入即可使用",
      account: group.role ? demoAccountFor(group.role) : null,
    };
  });
}
