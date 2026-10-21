// 座標與距離：資源表單解析 Google 地圖連結、探索頁計算民眾與資源的直線距離
// 純函式，不讀寫儲存區；民眾位置只在瀏覽器記憶體中使用，不儲存、不傳送

import { TAIWAN_BOUNDS } from "../config/location.js";

const NUMBER = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

// 依可信度排序：!3d!4d 是地點標記本身；@ 是畫面中心；查詢參數次之
const LINK_PATTERNS = [
  new RegExp(String.raw`!3d${NUMBER}!4d${NUMBER}`),
  new RegExp(String.raw`@${NUMBER},${NUMBER}`),
  new RegExp(String.raw`[?&](?:q|query|ll|center|destination|daddr)=(?:loc:)?${NUMBER},\s*${NUMBER}`),
];
const PLAIN_PAIR = new RegExp(String.raw`^${NUMBER}\s*[,，]\s*${NUMBER}$`);
const SHORT_LINK = /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i;

export const GEO_MESSAGES = {
  short_link: "這是縮短網址，無法讀出座標；請在瀏覽器開啟後，複製網址列中的完整網址再貼上",
  not_found: "連結中找不到座標；請在 Google 地圖點選地點後複製網址，或直接填寫經緯度",
  incomplete: "緯度與經度需要一起填寫",
  not_number: "緯度與經度須為數字，例：25.0143、121.4635",
  out_of_range: "座標不在臺灣範圍內，請確認緯度（約 21.8–26.5）與經度（約 118–122.2）沒有填反",
};

const toNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
};

export const isInTaiwan = ({ lat, lng }) =>
  lat >= TAIWAN_BOUNDS.minLat && lat <= TAIWAN_BOUNDS.maxLat && lng >= TAIWAN_BOUNDS.minLng && lng <= TAIWAN_BOUNDS.maxLng;

/**
 * 檢查緯度、經度（可為字串）
 * @returns {{ ok: true, geo: { lat: number, lng: number } | null } | { ok: false, error: string }}
 *   兩者皆空白時 geo 為 null（座標選填）
 */
export function checkGeo(lat, lng) {
  const la = toNumber(lat);
  const ln = toNumber(lng);
  if (la === null && ln === null) return { ok: true, geo: null };
  if (la === null || ln === null) return { ok: false, error: GEO_MESSAGES.incomplete };
  if (Number.isNaN(la) || Number.isNaN(ln)) return { ok: false, error: GEO_MESSAGES.not_number };
  const geo = { lat: la, lng: ln };
  if (!isInTaiwan(geo)) return { ok: false, error: GEO_MESSAGES.out_of_range };
  return { ok: true, geo };
}

/**
 * 從 Google 地圖連結（或「緯度, 經度」文字）讀出座標
 * @returns {{ ok: true, geo: { lat: number, lng: number } } | { ok: false, error: string }}
 */
export function parseMapLink(text) {
  let value = String(text ?? "").trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    // 不是有效的編碼字串就照原樣比對
  }
  if (!value) return { ok: false, error: GEO_MESSAGES.not_found };

  const plain = PLAIN_PAIR.exec(value);
  const match = plain ?? LINK_PATTERNS.map((p) => p.exec(value)).find(Boolean);
  if (!match) {
    return { ok: false, error: SHORT_LINK.test(value) ? GEO_MESSAGES.short_link : GEO_MESSAGES.not_found };
  }
  const result = checkGeo(match[1], match[2]);
  return result.ok ? result : { ok: false, error: result.error };
}

// ── 距離 ──────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

export const hasGeo = (geo) => Number.isFinite(geo?.lat) && Number.isFinite(geo?.lng);

// 兩點的直線距離（大圓距離，公里）；任一點沒有座標時回傳 null
export function distanceKm(a, b) {
  if (!hasGeo(a) || !hasGeo(b)) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// 卡片顯示：10 公里內到小數一位（最少 0.1），以上取整數
export function formatDistance(km) {
  if (!Number.isFinite(km)) return "";
  const value = km < 10 ? Math.max(0.1, Math.round(km * 10) / 10).toFixed(1) : String(Math.round(km));
  return `距離約 ${value} 公里`;
}

/**
 * 依與 origin 的距離由近到遠排序；沒有座標的資源排在最後（維持原本順序）
 * radiusKm 有值時只保留範圍內的；沒有座標的資源無法判斷距離，一律保留在最後
 * @returns {{ resource: object, distanceKm: number | null }[]}
 */
export function rankByDistance(resources, origin, { radiusKm = null } = {}) {
  const located = [];
  const unlocated = [];
  for (const resource of resources || []) {
    const km = distanceKm(origin, resource?.geo);
    if (km === null) unlocated.push({ resource, distanceKm: null });
    else if (!radiusKm || km <= radiusKm) located.push({ resource, distanceKm: km });
  }
  located.sort((a, b) => a.distanceKm - b.distanceKm);
  return [...located, ...unlocated];
}

// ── 瀏覽器定位錯誤 ────────────────────────────────────────

// GeolocationPositionError.code：1 拒絕、2 無法取得、3 逾時；另有 unsupported、insecure
export function geolocationErrorMessage(reason) {
  switch (reason) {
    case 1:
    case "denied":
      return "您沒有允許瀏覽器取得位置，因此無法依距離排序。如需使用，請在瀏覽器網址列旁的設定中允許「位置」。";
    case 2:
    case "unavailable":
      return "目前無法取得您的位置（可能是裝置定位服務未開啟或訊號不佳）。";
    case 3:
    case "timeout":
      return "定位逾時，請稍後再試一次。";
    case "insecure":
      return "瀏覽器只在安全連線（https）下提供定位，目前無法使用。";
    default:
      return "您的瀏覽器不支援定位功能。";
  }
}
