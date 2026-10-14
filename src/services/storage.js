// 瀏覽器儲存的讀寫集中在這裡（登入狀態另由 src/utils/auth.js 管理）
// 頁面與其他 service 不直接呼叫 localStorage／sessionStorage
// 讀取時解析失敗或不是陣列，一律以空陣列處理，不讓頁面壞掉

// ── 設定值 ────────────────────────────────────────────────

// 資料（resources、cases、assessments 等）的儲存位置
// "session"：存在 sessionStorage，關閉瀏覽器（或分頁）後清除（測試階段使用）
// "local"：存在 localStorage，關閉瀏覽器後保留
// ⚠ 正式上線改為後端資料庫，資料不再存在瀏覽器
export const DATA_STORAGE = "session";

// true：開啟網站時，若資料儲存區沒有任何資料就自動載入示範資料（方便展示）
// 由 main.js 呼叫 demoService.autoLoadDemoIfEmpty() 執行
export const AUTO_LOAD_DEMO = false;

// 資料的 key（不含帳號清單 users 與登入狀態）
export const DATA_KEYS = ["resources", "cases", "assessments"];

const dataStorage = () => (DATA_STORAGE === "local" ? localStorage : sessionStorage);

// ── 舊資料清除 ────────────────────────────────────────────
// 改用 sessionStorage 之前，資料存在 localStorage；第一次讀寫時清掉殘留的資料，避免新舊資料混淆
// 帳號清單 users 不清除

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

// 資料儲存區是否還沒有任何資料（AUTO_LOAD_DEMO 用來判斷要不要載入示範資料）
export function isDataEmpty() {
  return DATA_KEYS.every((key) => readList(key).length === 0);
}

// ── 永久保存（一律 localStorage）──────────────────────────
// 目前只有帳號清單 users 使用：關閉瀏覽器後帳號仍在，只需重新登入

const persistentStorage = () => localStorage;

export function readPersistentList(key) {
  return readFrom(persistentStorage, key);
}

export function writePersistentList(key, list) {
  writeTo(persistentStorage, key, list);
}
