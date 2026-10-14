import { DEFAULT_ROLE, isValidRole } from "../config/roles.js";
import { readPersistentList, writePersistentList } from "../services/storage.js";

// ── 登入狀態的儲存位置 ────────────────────────────────────
// "session"：存在 sessionStorage，關閉瀏覽器（或分頁）後自動登出（測試階段使用）
// "local"：存在 localStorage，關閉瀏覽器後仍保持登入
// ⚠ 正式上線前需改為後端驗證（由伺服器發行並檢查登入憑證），不可再由前端儲存決定是否已登入；
//   目前的帳號清單與密碼也只存在瀏覽器，僅供原型展示使用
export const LOGIN_STORAGE = "session";

const USERS_KEY = "users"; // 帳號清單：一律存 localStorage，關閉瀏覽器後帳號仍在
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
  } catch {
    // 瀏覽器禁止存取儲存空間時略過（等同未登入）
  }
}

// ── 帳號清單 ──────────────────────────────────────────────

export function getUsers() {
  return readPersistentList(USERS_KEY);
}

export function saveUsers(users) {
  writePersistentList(USERS_KEY, users);
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

// 沒有 role（或 role 不是五種角色之一）時的備援規則：Email 含 admin 為管理員，其餘為民眾
// 註冊頁改為提供角色選擇後，此規則只用於舊帳號
export function resolveRole(email) {
  return String(email ?? "").toLowerCase().includes("admin") ? "admin" : DEFAULT_ROLE;
}

// 目前登入者的角色；未登入回傳 null
// 舊帳號存的是 "user"，不在五種角色內，會改用 Email 備援規則判斷
export function getCurrentRole(user = getCurrentUser()) {
  if (!user) return null;
  return isValidRole(user.role) ? user.role : resolveRole(user.email);
}

// 目前登入者是否具備任一指定角色
export function hasRole(...roles) {
  const role = getCurrentRole();
  return !!role && roles.includes(role);
}

// role 可由註冊頁傳入；未傳或不合法時依 Email 備援規則決定
export function register({ name, email, password, role }) {
  const users = getUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (users.some((u) => String(u.email).trim().toLowerCase() === normalizedEmail)) {
    return { ok: false, error: "此 Email 已被註冊" };
  }
  const user = {
    id: Date.now(),
    name: String(name).trim(),
    email: normalizedEmail,
    password,
    role: isValidRole(role) ? role : resolveRole(normalizedEmail),
  };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  return { ok: true, user };
}

export function login({ email, password }) {
  const users = getUsers();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find(
    (u) =>
      String(u.email).trim().toLowerCase() === normalizedEmail && u.password === password
  );
  if (!user) {
    return { ok: false, error: "Email 或密碼錯誤" };
  }
  setCurrentUser(user);
  return { ok: true, user };
}
