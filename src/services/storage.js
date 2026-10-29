// 瀏覽器儲存的讀寫集中在這裡（登入狀態另由 src/utils/auth.js 管理）
// 頁面與其他 service 不直接呼叫 localStorage／sessionStorage
// 讀取時解析失敗或不是陣列，一律以空陣列處理，不讓頁面壞掉

// ── 設定值 ────────────────────────────────────────────────

// 資料（resources、cases、assessments 等）的儲存位置
// "session"：存在 sessionStorage，關閉瀏覽器（或分頁）後清除（測試階段使用）
// "local"：存在 localStorage，關閉瀏覽器後保留
// ⚠ 正式上線改為後端資料庫，資料不再存在瀏覽器
export const DATA_STORAGE = "session";

// 註冊的帳號清單 users 的儲存位置（示範帳號寫在 config/roles.js，不存入瀏覽器）
// "session"：存在 sessionStorage，關閉瀏覽器（或分頁）後清除（測試階段使用）
// "local"：存在 localStorage，關閉瀏覽器後保留
// ⚠ 正式上線改為後端帳號系統，帳號與密碼不再存在瀏覽器
export const ACCOUNT_STORAGE = "session";

// 資料的 key（不含帳號清單 users 與登入狀態）
export const DATA_KEYS = ["resources", "cases", "assessments"];

const dataStorage = () => (DATA_STORAGE === "local" ? localStorage : sessionStorage);

// ── 舊資料清除 ────────────────────────────────────────────
// 改用 sessionStorage 之前，資料存在 localStorage；第一次讀寫時清掉殘留的資料，避免新舊資料混淆
// 帳號清單 users 另由下方的 cleanLegacyAccounts 處理

let legacyCleaned = false;
function cleanLegacyData() {
  if (legacyCleaned || DATA_STORAGE !== "session") return;
  legacyCleaned = true;
  try {
    for (const key of DATA_KEYS) localStorage.removeItem(key);
  } catch {
    // 瀏覽器禁止存取儲存空間時略過
  }
}

// ── 共用 ──────────────────────────────────────────────────

function readFrom(storage, key) {
  try {
    const parsed = JSON.parse(storage().getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`[storage] 無法讀取「${key}」，以空陣列處理`, error);
    return [];
  }
}

function writeTo(storage, key, list) {
  try {
    storage().setItem(key, JSON.stringify(list));
  } catch (error) {
    console.error(`[storage] 無法寫入「${key}」`, error);
    throw error;
  }
}

// ── 資料（依 DATA_STORAGE）────────────────────────────────

export function readList(key) {
  cleanLegacyData();
  return readFrom(dataStorage, key);
}

export function writeList(key, list) {
  cleanLegacyData();
  writeTo(dataStorage, key, list);
}

// ── 畫面狀態（sessionStorage）─────────────────────────────
// 收合等畫面偏好，關閉分頁後清除；key 加上 "ui:" 前綴，避免與資料混用
// 值以 JSON 存放；沒有存過、解析失敗或瀏覽器禁止存取時回傳 fallback

const UI_PREFIX = "ui:";

export function readUiState(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(UI_PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeUiState(key, value) {
  try {
    sessionStorage.setItem(UI_PREFIX + key, JSON.stringify(value));
  } catch {
    // 瀏覽器禁止存取儲存空間時略過（畫面狀態不保留）
  }
}

// ── 帳號清單（依 ACCOUNT_STORAGE）────────────────────────
// 帳號清單 users、資源點綁定、重設密碼連結、模擬信箱共用（utils/auth.js、services/accountService.js、services/mailService.js）

const accountStorage = () => (ACCOUNT_STORAGE === "local" ? localStorage : sessionStorage);

// 改用 sessionStorage 之前，帳號清單存在 localStorage；第一次讀寫時清掉殘留的帳號
let legacyAccountsCleaned = false;
// 只有帳號清單 users 有舊資料；不論第一次讀寫的是哪個 key 都要清
const LEGACY_ACCOUNT_KEYS = ["users"];
function cleanLegacyAccounts() {
  if (legacyAccountsCleaned || ACCOUNT_STORAGE !== "session") return;
  legacyAccountsCleaned = true;
  try {
    for (const key of LEGACY_ACCOUNT_KEYS) localStorage.removeItem(key);
  } catch {
    // 瀏覽器禁止存取儲存空間時略過
  }
}

export function readAccountList(key) {
  cleanLegacyAccounts();
  return readFrom(accountStorage, key);
}

export function writeAccountList(key, list) {
  cleanLegacyAccounts();
  writeTo(accountStorage, key, list);
}
