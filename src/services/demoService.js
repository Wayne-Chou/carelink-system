// 示範資料的載入與移除：一次處理示範資源與示範個案
// 個案尚未建立 service，這裡直接讀寫 localStorage「cases」，格式與 CaseList／CaseDetail 相同

import { DEMO_CASES } from "./demoCases.js";
import { DEMO_RESOURCES } from "./demoResources.js";
import {
  getAllResources,
  isDemoResource,
  loadDemoResources,
  removeDemoResources,
} from "./resourceService.js";

const CASES_KEY = "cases";

function readCases() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CASES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[demoService] 無法解析 localStorage 個案資料，以空陣列處理", error);
    return [];
  }
}

function writeCases(cases) {
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
}

const isDemoCase = (item) => item?.isDemo === true;

export const DEMO_TOTALS = { resources: DEMO_RESOURCES.length, cases: DEMO_CASES.length };

// 目前資料的筆數：全部與其中的示範資料
export function countData() {
  const resources = getAllResources();
  const cases = readCases();
  return {
    resources: resources.length,
    cases: cases.length,
    demoResources: resources.filter(isDemoResource).length,
    demoCases: cases.filter(isDemoCase).length,
  };
}

// replace 為 false：加入示範資源與個案，已存在的（同 id）略過
// replace 為 true：清空所有資源與個案後只放示範資料（個案會連結到資源，必須一起清空）
// 回傳實際加入的筆數 { resources, cases }
export function loadDemoData({ replace = false } = {}) {
  const addedResources = loadDemoResources({ replace });
  const existing = replace ? [] : readCases();
  const existingIds = new Set(existing.map((c) => String(c.id)));
  const toAdd = DEMO_CASES.filter((c) => !existingIds.has(String(c.id))).map((c) => ({
    ...structuredClone(c),
    isDemo: true,
  }));
  writeCases([...existing, ...toAdd]);
  return { resources: addedResources, cases: toAdd.length };
}

// 只移除帶示範標記的資源與個案，回傳移除的筆數 { resources, cases }
export function removeDemoData() {
  const removedResources = removeDemoResources();
  const cases = readCases();
  const kept = cases.filter((c) => !isDemoCase(c));
  const removedCases = cases.length - kept.length;
  if (removedCases) writeCases(kept);
  return { resources: removedResources, cases: removedCases };
}
