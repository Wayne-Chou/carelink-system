import { DEMO_ACCOUNTS, isValidRole } from "../config/roles.js";
import { readAccountList, writeAccountList } from "../services/storage.js";

// ── 登入狀態的儲存位置 ────────────────────────────────────
// "session"：存在 sessionStorage，關閉瀏覽器（或分頁）後自動登出（測試階段使用）
// "local"：存在 localStorage，關閉瀏覽器後仍保持登入
// ⚠ 正式上線前需改為後端驗證（由伺服器發行並檢查登入憑證），不可再由前端儲存決定是否已登入；
//   目前的帳號清單與密碼也只存在瀏覽器，僅供原型展示使用
export const LOGIN_STORAGE = "session";

const USERS_KEY = "users"; // 註冊的帳號清單：儲存位置依 storage.js 的 ACCOUNT_STORAGE（測試階段為 sessionStorage）
const BINDINGS_KEY = "providerBindings"; // 資源點帳號綁定的資源 [{ email, resourceId }]，儲存位置同帳號清單
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

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

// ── 帳號清單 ──────────────────────────────────────────────

export function getUsers() {
  return readAccountList(USERS_KEY);
}

export function saveUsers(users) {
  writeAccountList(USERS_KEY, users);
}

export const findUserByEmail = (email) => getUsers().find((u) => normalizeEmail(u.email) === normalizeEmail(email)) ?? null;

// 帳號狀態：示範帳號、改版前沒有狀態的帳號視為已啟用（狀態定義見 config/accounts.js）
export const accountStatusOf = (user) => (user?.isDemo ? "active" : user?.status || "active");

// 非啟用狀態登入時的說明
function inactiveMessage(user) {
  const reason = user.statusReason ? `：${user.statusReason}` : "";
  switch (accountStatusOf(user)) {
    case "pending":
      return "帳號審核中，審核結果會以 Email 通知";
    case "rejected":
      return `申請已退回${reason}。可依退回通知信的「重新申請」連結修改後再送出`;
    case "suspended":
      return `帳號已停用${reason}。如有疑問請聯絡系統管理員`;
    default:
      return "帳號目前無法登入";
  }
}

// ── 目前登入者 ────────────────────────────────────────────

// 資源點的綁定資源每次都重新查詢，綁定或解除後不必重新登入就生效
// 註冊的帳號被停用（或不是已啟用）時自動登出
export function getCurrentUser() {
  let user;
  try {
    const raw = readLogin(CURRENT_USER_KEY);
    user = raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  if (!user) return null;
  const account = isDemoEmail(user.email) ? null : findUserByEmail(user.email);
  if (account && accountStatusOf(account) !== "active") {
    clearCurrentUser();
    return null;
  }
  if (user.role === "provider") user.resourceId = getBoundResourceId(user.email, user.resourceId);
  return user;
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

// 修改紀錄的修改者：目前登入者的姓名與角色
export function currentActor(user = getCurrentUser()) {
  return { name: user?.name ?? "", role: user?.role ?? "" };
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

export const isDemoEmail = (email) => DEMO_ACCOUNTS.some((a) => a.email === normalizeEmail(email));

// 登入失敗的訊息：Email 不存在、密碼錯誤、帳號還沒有密碼（待審核、已退回、已開通但尚未設定密碼）一律相同，不透露帳號狀態
export const LOGIN_FAILED_MESSAGE =
  "Email 或密碼錯誤。若您已申請帳號但尚未設定密碼，請查看 Email 通知，或使用忘記密碼重新取得連結。";

// 先比對示範帳號（寫在程式中，不存入瀏覽器），再比對註冊的帳號；只有已啟用的帳號可以登入
// 已設定密碼的帳號：密碼正確後才檢查帳號狀態（停用時顯示停用原因）
// 還沒有密碼的帳號：沒有密碼可比對，一律視為登入失敗（LOGIN_FAILED_MESSAGE）
// 註冊與帳號管理見 services/accountService.js
export function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const demo = DEMO_ACCOUNTS.find((u) => u.email === normalizedEmail && u.password === password);
  const account = demo ? null : findUserByEmail(normalizedEmail);
  const user = demo ?? (account?.password && account.password === password ? account : null);
  if (!user) {
    return { ok: false, error: LOGIN_FAILED_MESSAGE };
  }
  if (accountStatusOf(user) !== "active") {
    return { ok: false, status: accountStatusOf(user), error: inactiveMessage(user) };
  }
  setCurrentUser(user);
  return { ok: true, user };
}

// ── 資源點帳號綁定 ────────────────────────────────────────
// 一個資源點帳號只綁定一筆資源；一筆資源可以綁定多個資源點帳號
// 示範帳號寫在程式中無法修改，所以綁定關係另外存一份對照（以 Email 為鍵）；
// 對照中沒有這個帳號時，沿用帳號本身的 resourceId（示範帳號為空、註冊的帳號為註冊時選的資源）
// 由系統管理員、資源管理員在資源詳細頁操作（權限 resource.bindProvider，頁面負責檢查）

const readBindings = () => readAccountList(BINDINGS_KEY);

export function writeBinding(email, resourceId) {
  const key = normalizeEmail(email);
  const others = readBindings().filter((b) => normalizeEmail(b.email) !== key);
  writeAccountList(BINDINGS_KEY, [...others, { email: key, resourceId: String(resourceId ?? "") }]);
}

// 帳號目前綁定的資源 id；沒有綁定時為空字串
export function getBoundResourceId(email, fallback = "") {
  const entry = readBindings().find((b) => normalizeEmail(b.email) === normalizeEmail(email));
  return String((entry ? entry.resourceId : fallback) ?? "");
}

// 所有資源點帳號（示範帳號在前，再來是註冊的帳號），resourceId 為目前綁定的資源
// 待審核、已退回的申請不列入（資源點申請在審核通過時綁定）
export function listProviderAccounts() {
  return [...DEMO_ACCOUNTS, ...getUsers()]
    .filter((a) => a.role === "provider" && !["pending", "rejected"].includes(accountStatusOf(a)))
    .map((a) => ({
      id: a.id,
      name: a.name,
      email: normalizeEmail(a.email),
      isDemo: !!a.isDemo,
      status: accountStatusOf(a),
      resourceId: getBoundResourceId(a.email, a.resourceId),
    }));
}

// 綁定這筆資源的資源點帳號
export function getProviderAccountsForResource(resourceId) {
  const id = String(resourceId ?? "");
  return id ? listProviderAccounts().filter((a) => a.resourceId === id) : [];
}

/**
 * 綁定：帳號原本綁定其他資源時改綁（原本的綁定解除），回傳原本的資源 id
 * @returns {{ ok: true, previousResourceId: string } | { ok: false, error: string }}
 */
export function bindProviderAccount(email, resourceId) {
  const account = listProviderAccounts().find((a) => a.email === normalizeEmail(email));
  if (!account) return { ok: false, error: "找不到這個資源點帳號" };
  if (!String(resourceId ?? "").trim()) return { ok: false, error: "請選擇要綁定的資源" };
  writeBinding(account.email, resourceId);
  return { ok: true, previousResourceId: account.resourceId };
}

// 解除綁定：帳號之後沒有綁定任何資源
export function unbindProviderAccount(email) {
  const account = listProviderAccounts().find((a) => a.email === normalizeEmail(email));
  if (!account) return { ok: false, error: "找不到這個資源點帳號" };
  writeBinding(account.email, "");
  return { ok: true, previousResourceId: account.resourceId };
}
