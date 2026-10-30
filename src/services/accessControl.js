// 依角色判斷能否進入頁面、使用功能（原型階段；正式版權限需由後端處理）
// 純函式：使用者與資料由呼叫端傳入，方便測試；角色與功能定義見 config/roles.js

import { PERMISSIONS, TODO_AUDIENCE_BY_ROLE, isValidRole } from "../config/roles.js";
import { PROVIDER_EDITABLE_FIELDS } from "../config/resourceEditing.js";
import { pathOf } from "../router/routes.js";

export const NO_PERMISSION_MESSAGE = "您的帳號沒有權限查看此頁";

const roleOf = (user) => (user && isValidRole(user.role) ? user.role : "");

// 使用者是否有某項功能；未登入或沒有角色一律沒有
export function can(user, permission) {
  const role = roleOf(user);
  return !!role && (PERMISSIONS[role] || []).includes(permission);
}

// 資源詳細頁：資源點只能看自己綁定的資源
export function canViewResource(user, resourceId) {
  if (!can(user, "resource.view")) return false;
  if (roleOf(user) === "provider") return !!user.resourceId && String(user.resourceId) === String(resourceId);
  return true;
}

// 編輯資源：可管理資源的角色編輯全部；資源點只能編輯自己綁定的資源
export function canEditResource(user, resourceId) {
  if (can(user, "resource.manage")) return true;
  return can(user, "resource.editOwn") && !!user.resourceId && String(user.resourceId) === String(resourceId);
}

// 編輯資源時可以修改的欄位：null 為全部；資源點只限 PROVIDER_EDITABLE_FIELDS；不能編輯時為空陣列
export function editableFieldsFor(user) {
  if (can(user, "resource.manage")) return null;
  return can(user, "resource.editOwn") ? [...PROVIDER_EDITABLE_FIELDS] : [];
}

export const canBindProvider = (user) => can(user, "resource.bindProvider");
export const canViewChangeLog = (user) => can(user, "resource.viewChangeLog");

// 資源端後台：可檢視任何資源，或只限自己綁定的資源
export function canUseDashboard(user, resourceId) {
  if (can(user, "resource.dashboardAny")) return true;
  return can(user, "resource.dashboard") && !!user.resourceId && String(user.resourceId) === String(resourceId);
}

// 資源點進入資源端後台時固定使用綁定的資源；其他角色沿用資源列表選擇的資源
export function dashboardResourceId(user, selectedId = "") {
  if (can(user, "resource.dashboardAny")) return selectedId;
  return can(user, "resource.dashboard") ? String(user.resourceId || "") : "";
}

// 判讀頁：可判讀的角色看全部；健康管理員只看已開案的評估（唯讀）
export function canViewAssessment(user, assessment) {
  if (can(user, "assessment.review")) return true;
  return can(user, "assessment.viewLinked") && !!assessment?.caseId;
}

export const canReviewAssessment = (user) => can(user, "assessment.review");
export const canManageResources = (user) => can(user, "resource.manage");
export const canOpenCase = (user) => can(user, "case.manage");

/**
 * 路由檢查（router.beforeEach 使用）
 * meta.public：公開頁；meta.permission：需要的功能；meta.scope：資料範圍
 *   scope "resource"   → params.id 須為可查看的資源
 *   scope "resourceEdit" → params.id 須為可編輯的資源（資源點只限綁定的資源）
 *   scope "assessment" → params.id 的評估須可查看（findAssessment 由呼叫端傳入）
 * @returns {{ ok: true } | { ok: false, reason: "login" | "forbidden" }}
 */
export function checkRouteAccess(to, user, { findAssessment = () => null } = {}) {
  const meta = to?.meta || {};
  if (!meta.requiresAuth) return { ok: true };
  if (!user) return { ok: false, reason: "login" };
  if (meta.permission && !can(user, meta.permission)) return { ok: false, reason: "forbidden" };
  if (meta.scope === "resource" && !canViewResource(user, to.params?.id)) return { ok: false, reason: "forbidden" };
  if (meta.scope === "resourceEdit" && !canEditResource(user, to.params?.id)) return { ok: false, reason: "forbidden" };
  if (meta.scope === "assessment" && !canViewAssessment(user, findAssessment(to.params?.id))) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true };
}

/**
 * 連結或按鈕是否顯示（頁面以 composables/useCanOpen.js 呼叫）
 *   有權限 → 顯示；尚未登入 → 顯示（點了會先到登入頁，登入後回到該頁）；已登入但沒有權限 → 不顯示
 */
export function canOpenRoute(to, user, options = {}) {
  const result = checkRouteAccess(to, user, options);
  return result.ok || result.reason === "login";
}

// 登入後的預設頁（後台首頁）：資源點直接進入資源端後台，其他角色進入後台首頁；沒有角色的帳號回民眾首頁
export function homePathFor(user) {
  if (roleOf(user) === "provider") return pathOf("resource-dashboard");
  if (can(user, "workspace.home")) return pathOf("admin-home");
  return pathOf("home");
}

/**
 * 路由守衛要導向哪裡（router.beforeEach 使用）；可以進入時回傳 null
 *   未登入 → 登入頁（登入後回到原本要去的頁面）
 *   資源點打開後台首頁 → 直接進入自己的資源端後台（不提示）
 *   已登入但沒有權限 → 自己的後台首頁，帶 denied=1 顯示提示
 */
export function navigationRedirect(to, user, options = {}) {
  const result = checkRouteAccess(to, user, options);
  if (result.ok) return null;
  if (result.reason === "login") return { name: "login", query: { redirect: to.fullPath } };
  const home = homePathFor(user);
  if (to.name === "admin-home" && roleOf(user) === "provider") return { path: home };
  return { path: home, query: { denied: "1" } };
}

// 登入或註冊後要去的頁面：原本被擋下的頁面（router.resolve 的結果）有權限就回去，否則到預設頁
export function landingPathFor(user, redirectRoute = null, options = {}) {
  const usable =
    redirectRoute?.matched?.length && redirectRoute.name !== "login" && redirectRoute.name !== "register";
  if (usable && checkRouteAccess(redirectRoute, user, options).ok) return redirectRoute.fullPath;
  return homePathFor(user);
}

/**
 * 待辦頁可看的「給誰」範圍
 * @returns {{ own: string|null, canViewAll: boolean }} own：自己角色對應的 audience；沒有時為 null
 */
export function todoScopeFor(user) {
  return { own: TODO_AUDIENCE_BY_ROLE[roleOf(user)] ?? null, canViewAll: can(user, "todo.viewAll") };
}

// 依範圍篩選待辦；audience 為 "all" 時需有 todo.viewAll
// 待辦類型另外需要權限時（例如待審核帳號需 account.manage），沒有權限的一律不列出
export function filterTodosFor(user, todos, audience = null) {
  const scope = todoScopeFor(user);
  if (!can(user, "todo.view")) return [];
  const permitted = todos.filter((t) => !t.permission || can(user, t.permission));
  if (audience === "all" && scope.canViewAll) return permitted;
  const target = scope.canViewAll && audience ? audience : scope.own;
  return permitted.filter((t) => t.audience === target);
}

// 首頁快捷區與導覽列的入口：只列出該角色可以使用的
const SHORTCUTS = [
  { key: "todo", label: "待辦", icon: "fa-bell", route: "todo", permission: "todo.view" },
  { key: "assessmentNew", label: "填寫評估", icon: "fa-clipboard-list", route: "assessment-new", permission: "assessment.fill" },
  { key: "assessments", label: "評估列表", icon: "fa-list-check", route: "assessments", permission: "assessment.list" },
  { key: "cases", label: "個案管理", icon: "fa-folder-open", route: "cases", permission: "case.manage" },
  { key: "resources", label: "資源管理", icon: "fa-list", route: "list", permission: "resource.manage" },
  { key: "resourceNew", label: "新增資源", icon: "fa-plus", route: "form", permission: "resource.manage" },
  { key: "accounts", label: "帳號管理", icon: "fa-users-gear", route: "accounts", permission: "account.manage" },
].map(({ route, ...item }) => ({ ...item, path: pathOf(route) }));

// 後台首頁的快捷入口（各角色能用的功能）
export function shortcutsFor(user) {
  const list = SHORTCUTS.filter((s) => can(user, s.permission));
  // 資源點：資源端後台（未綁定時顯示「尚未綁定資源」）與自己的資源
  if (roleOf(user) === "provider") {
    list.push({ key: "dashboard", label: "資源端後台", icon: "fa-clipboard-check", path: pathOf("resource-dashboard") });
    if (user.resourceId) {
      list.push({ key: "myResource", label: "我的資源", icon: "fa-house-chimney", path: pathOf("resource-detail", { id: user.resourceId }) });
    }
  }
  return list;
}

// 後台左側選單：後台首頁 + 快捷入口（資源點沒有後台首頁，只有資源端後台與自己的資源）
export function adminMenuFor(user) {
  const home = can(user, "workspace.home")
    ? [{ key: "home", label: "後台首頁", icon: "fa-gauge", path: pathOf("admin-home") }]
    : [];
  return [...home, ...shortcutsFor(user)];
}
