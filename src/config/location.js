// 定位推薦附近資源的設定（doc/resource-schema.md 第九節「定位推薦規則」）

// 探索頁距離範圍篩選（公里）；空字串為不限
export const NEARBY_RADIUS_OPTIONS = [1, 3, 5, 10];

// 資源座標必須在臺灣範圍內（含澎湖、金門、馬祖）
export const TAIWAN_BOUNDS = { minLat: 21.8, maxLat: 26.5, minLng: 118.0, maxLng: 122.2 };

// 瀏覽器定位逾時（毫秒）與可接受的快取時間
export const GEOLOCATION_TIMEOUT_MS = 10_000;
export const GEOLOCATION_MAX_AGE_MS = 60_000;
