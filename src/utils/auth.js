import { DEMO_ACCOUNTS, REGISTERABLE_ROLES, isValidRole } from "../config/roles.js";
import { notifyChange, readAccountList, writeAccountList } from "../services/storage.js";

// ── 登入狀態的儲存位置 ────────────────────────────────────
// "session"：存在 sessionStorage，關閉瀏覽器（或分頁）後自動登出（測試階段使用）
// "local"：存在 localStorage，關閉瀏覽器後仍保持登入
// ⚠ 正式上線前需改為後端驗證（由伺服器發行並檢查登入憑證），不可再由前端儲存決定是否已登入；
//   目前的帳號清單與密碼也只存在瀏覽器，僅供原型展示使用
export const LOGIN_STORAGE = "session";

const USERS_KEY = "users"; // 註冊的帳號清單：儲存位置依 storage.js 的 ACCOUNT_STORAGE（測試階段為 sessionStorage）
const CURRENT_USER_KEY = "currentUser"; // 目前登入者
const CURRENT_RESOURCE_KEY = "currentResourceId"; // 資源端目前登入的資源
const LOGIN_KEYS = [CURRENT_USER_KEY, CURRENT_RESOURCE_KEY];

const loginStorage = () => (LOGIN_STORAGE === "local" ? localStorage : sessionStorage);

// 改用 sessionStorage 之前，登入狀態存在 localStorage；第一次讀取時清掉，避免殘留的登入狀態
let legacyCleaned = false;
function cleanLegacyLogin() {
  if (legacyCleaned || LOGIN_STORAGE !== "session") return;
  legacyCleaned = true;
  try {
    for (const key of LOGIN_KEYS) localStorage.removeItem(key);
  } catch {
    // 瀏覽器禁止存取儲存空間時略過
  }
}

function readLogin(key) {
  cleanLegacyLogin();
  try {
    return loginStorage().getItem(key);
  } catch {
    return null;
  }
}

function writeLogin(key, value) {
  cleanLegacyLogin();
  try {
    if (value === null) loginStorage().removeItem(key);
    else loginStorage().setItem(key, value);
    notifyChange(key);
  } catch {
    // 瀏覽器禁止存取儲存空間時略過（等同未登入）
  }
}

// ── 帳號清單 ──────────────────────────────────────────────

export function getUsers() {
  return readAccountList(USERS_KEY);
}

export function saveUsers(users) {
  writeAccountList(USERS_KEY, users);
}

// ── 目前登入者 ────────────────────────────────────────────

export function getCurrentUser() {
  try {
    const raw = readLogin(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  writeLogin(
    CURRENT_USER_KEY,
    JSON.stringify({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      // 判讀人員類別（判讀頁自動帶入）、資源點綁定的資源 id
      readerType: user.readerType ?? "",
      resourceId: user.resourceId ?? "",
    })
  );
}

// 登出：一併清除資源端登入的資源
export function clearCurrentUser() {
  writeLogin(CURRENT_USER_KEY, null);
  clearCurrentResourceId();
}

// ── 資源端目前登入的資源 ──────────────────────────────────

export function getCurrentResourceId() {
  return readLogin(CURRENT_RESOURCE_KEY) || "";
}

export function setCurrentResourceId(id) {
  writeLogin(CURRENT_RESOURCE_KEY, String(id));
}

export function clearCurrentResourceId() {
  writeLogin(CURRENT_RESOURCE_KEY, null);
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

// 目前登入者的角色：未登入回傳 null；已登入但沒有角色（或角色已不存在，例如舊帳號的 "user"、"citizen"）回傳 ""
// 角色一律以帳號的 role 欄位為準（不再依 Email 判斷）；沒有角色的帳號只能看公開頁面
export function getCurrentRole(user = getCurrentUser()) {
  if (!user) return null;
  return isValidRole(user.role) ? user.role : "";
}

// 目前登入者是否具備任一指定角色
export function hasRole(...roles) {
  const role = getCurrentRole();
  return !!role && roles.includes(role);
}

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
export const isDemoEmail = (email) => DEMO_ACCOUNTS.some((a) => a.email === normalizeEmail(email));

/**
 * 註冊（待確認事項：註冊方式討論中）
 * role 必須是 REGISTERABLE_ROLES 之一（不開放自行註冊為系統管理員）；資源點需指定綁定的資源 resourceId
 */
export function register({ name, email, password, role, resourceId = "" }) {
  const users = getUsers();
  const normalizedEmail = normalizeEmail(email);
  if (isDemoEmail(normalizedEmail)) return { ok: false, error: "這是示範帳號的 Email，請直接登入" };
  if (users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
    return { ok: false, error: "此 Email 已被註冊" };
  }
  if (!REGISTERABLE_ROLES.includes(role)) return { ok: false, error: "請選擇角色" };
  if (role === "provider" && !String(resourceId).trim()) return { ok: false, error: "資源點請選擇綁定的資源" };

  const user = {
    id: Date.now(),
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    role,
    ...(role === "provider" ? { resourceId: String(resourceId) } : {}),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  return { ok: true, user };
}

// 先比對示範帳號（寫在程式中，不存入瀏覽器），再比對註冊的帳號
export function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const matches = (u) => normalizeEmail(u.email) === normalizedEmail && u.password === password;
  const user = DEMO_ACCOUNTS.find(matches) ?? getUsers().find(matches);
  if (!user) {
    return { ok: false, error: "Email 或密碼錯誤" };
  }
  setCurrentUser(user);
  return { ok: true, user };
}
