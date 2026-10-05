// 民眾端（首頁、探索頁）的資源搜尋與篩選，純函式不讀寫 localStorage
// 輸入的 resources 應已是 getRecommendableResources("explore") 的結果

import { getNeedTagLabel, getPrescriptionTypeLabel } from "../config/needTags.js";
import { normalizeCityName } from "../config/districts.js";

const lower = (v) => String(v ?? "").toLowerCase();

function searchableText(r) {
  return [
    r.name,
    r.organization,
    r.description,
    r.placeName,
    r.address?.city,
    r.address?.district,
    r.address?.detail,
    r.needTagOther,
    r.scenarios,
    ...(r.keywords || []),
    ...(r.needTags || []).map(getNeedTagLabel),
    ...(r.prescriptionTypes || []).map(getPrescriptionTypeLabel),
  ]
    .map(lower)
    .join(" ");
}

// 多選條件：資源勾「all（不指定）」視為符合任何選擇
const matchesAudience = (values = [], selected = []) =>
  selected.length === 0 || values.includes("all") || selected.some((s) => values.includes(s));

/**
 * @param {object[]} resources
 * @param {object} filters
 *   keyword     關鍵字：比對名稱、單位、內容、地點、地址、標籤、關鍵字、生活情境
 *   address     地址或地標：比對地點名稱與地址
 *   city        縣市（完全相符）
 *   district    行政區（完全相符）
 *   type        處方類型代碼
 *   tags        需求標籤代碼陣列，符合任一即可
 *   ageGroups   適合年齡代碼陣列，符合任一即可
 *   identities  適合身分代碼陣列，符合任一即可
 */
export function filterResources(resources, filters = {}) {
  const keyword = lower(filters.keyword).trim();
  const address = lower(filters.address).trim();
  const city = filters.city ? normalizeCityName(filters.city) : "";
  const tags = filters.tags || [];

  return (resources || []).filter((r) => {
    if (keyword && !searchableText(r).includes(keyword)) return false;
    if (address) {
      const text = lower(
        `${r.placeName} ${r.address?.city}${r.address?.district}${r.address?.detail}`
      );
      if (!text.includes(address)) return false;
    }
    if (city && normalizeCityName(r.address?.city) !== city) return false;
    if (filters.district && r.address?.district !== filters.district) return false;
    if (filters.type && !(r.prescriptionTypes || []).includes(filters.type)) return false;
    if (tags.length && !tags.some((t) => (r.needTags || []).includes(t))) return false;
    if (!matchesAudience(r.ageGroups, filters.ageGroups || [])) return false;
    if (!matchesAudience(r.identities, filters.identities || [])) return false;
    return true;
  });
}

// 依行政區統計資源數，由多到少；用於熱門行政區與下拉選單筆數
export function countByDistrict(resources) {
  const counts = new Map();
  for (const r of resources || []) {
    const { city, district } = r.address || {};
    if (!city || !district) continue;
    const key = `${normalizeCityName(city)}|${district}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [c, d] = key.split("|");
      return { city: c, district: d, count };
    })
    .sort((a, b) => b.count - a.count);
}

// 列出資源實際用到的代碼（依 order 排序），讓篩選選項只顯示有結果的項目
export function collectCodes(resources, field, order) {
  const used = new Set((resources || []).flatMap((r) => r[field] || []));
  return order.filter((code) => used.has(code));
}
