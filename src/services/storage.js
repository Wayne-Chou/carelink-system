// 瀏覽器儲存的讀寫集中在這裡（登入狀態另由 src/utils/auth.js 管理）
// 頁面與其他 service 不直接呼叫 localStorage／sessionStorage
// 讀取時解析失敗或不是陣列，一律以空陣列處理，不讓頁面壞掉

// ── 設定值 ────────────────────────────────────────────────

// 資料（resources、cases、assessments 等）的儲存位置
// "session"：存在 sessionStorage，關閉瀏覽器（或分頁）後清除（測試階段使用）
// "local"：存在 localStorage，關閉瀏覽器後保留
// ⚠ 正式上線改為後端資料庫，資料不再存在瀏覽器
export const DATA_STORAGE = "session";

// true：開啟網站時，若資料儲存區沒有任何資料就自動載入示範情境第 1 步（方便展示）
// 由 main.js 呼叫 demoService.autoLoadDemoIfEmpty() 執行
export const AUTO_LOAD_DEMO = true;

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
  notifyChange(key);
}

// ── 變更通知 ──────────────────────────────────────────────
// 資料或登入狀態寫入後發出瀏覽器事件，讓流程說明列等元件重新判斷（測試環境沒有 window 時略過）
export const CHANGE_EVENT = "carelink:state-changed";

export function notifyChange(key = "") {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  } catch {
    // 不支援 CustomEvent 的環境略過
  }
}

// ── 畫面偏好（一律 sessionStorage）────────────────────────
// 例如流程說明列是否收合；只影響這個分頁，關閉分頁即恢復預設

export function readPreference(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(`pref:${key}`);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writePreference(key, value) {
  try {
    sessionStorage.setItem(`pref:${key}`, JSON.stringify(value));
  } catch {
    // 瀏覽器禁止存取儲存空間時略過
  }
}

// 資料儲存區是否還沒有任何資料（AUTO_LOAD_DEMO 用來判斷要不要載入示範資料）
export function isDataEmpty() {
  return DATA_KEYS.every((key) => readList(key).length === 0);
}

// ── 帳號清單（依 ACCOUNT_STORAGE）────────────────────────
// 只有 utils/auth.js 的帳號清單 users 使用

const accountStorage = () => (ACCOUNT_STORAGE === "local" ? localStorage : sessionStorage);

// 改用 sessionStorage 之前，帳號清單存在 localStorage；第一次讀寫時清掉殘留的帳號
let legacyAccountsCleaned = false;
function cleanLegacyAccounts(key) {
  if (legacyAccountsCleaned || ACCOUNT_STORAGE !== "session") return;
  legacyAccountsCleaned = true;
  try {
    localStorage.removeItem(key);
  } catch {
    // 瀏覽器禁止存取儲存空間時略過
  }
}

export function readAccountList(key) {
  cleanLegacyAccounts(key);
  return readFrom(accountStorage, key);
}

export function writeAccountList(key, list) {
  cleanLegacyAccounts(key);
  writeTo(accountStorage, key, list);
}
