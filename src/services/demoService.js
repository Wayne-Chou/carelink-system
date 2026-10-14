// 示範資料的載入與移除：一次處理示範資源、示範個案與示範評估
// 示範個案寫入「cases」、示範評估寫入「assessments」（經 storage.js，測試階段為 sessionStorage）
//
// 相對日期：示範資料以 DEMO_BASE_DATE 為「今天」撰寫，載入時所有日期一律平移
// 「載入當天 − DEMO_BASE_DATE」天，任何一天載入的逾期天數與到期狀態都和基準日相同
// 以天數平移（不以月份），因此 1、3、6 個月等排程在平移後可能與重新以月份計算的結果差一兩天

import { DEMO_ASSESSMENTS } from "./demoAssessments.js";
import { DEMO_CASES } from "./demoCases.js";
import { DEMO_RESOURCES } from "./demoResources.js";
import {
  getAllResources,
  isDemoResource,
  loadDemoResources,
  removeDemoResources,
} from "./resourceService.js";
import { AUTO_LOAD_DEMO, isDataEmpty, readList, writeList } from "./storage.js";
import { deepClone } from "../utils/clone.js";
import { addDays, daysBetween, todayString } from "../utils/date.js";
import { isPlainObject } from "../utils/object.js";
import { nextCode } from "../utils/sequenceCode.js";

// 示範資料撰寫時的基準日（視為「載入當天」）
export const DEMO_BASE_DATE = "2026-10-14";

const DATE_VALUE = /^(\d{4}-\d{2}-\d{2})(T.+)?$/;

// 將資料中所有日期（YYYY-MM-DD）與時間（YYYY-MM-DDTHH:mm:ss+08:00）字串平移 days 天，時間部分不變
// 只處理整個值就是日期的字串，文字中的日期不處理（示範資料的說明文字不寫具體日期）
export function shiftDates(value, days) {
  if (!days) return deepClone(value);
  if (typeof value === "string") {
    const match = DATE_VALUE.exec(value);
    return match ? addDays(match[1], days) + (match[2] ?? "") : value;
  }
  if (Array.isArray(value)) return value.map((item) => shiftDates(item, days));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shiftDates(item, days)]));
  }
  return value;
}

// 依載入日期平移後的示範資料
export function getDemoData(today = todayString()) {
  const days = daysBetween(DEMO_BASE_DATE, today) ?? 0;
  return {
    resources: shiftDates(DEMO_RESOURCES, days),
    cases: shiftDates(DEMO_CASES, days),
    assessments: shiftDates(DEMO_ASSESSMENTS, days),
  };
}

// 示範個案與評估已是新格式，這裡只負責整批寫入與移除，讀取一律經 caseService、assessmentService
const CASES_KEY = "cases";
const ASSESSMENTS_KEY = "assessments";

const isDemoItem = (item) => item?.isDemo === true;

export const DEMO_TOTALS = {
  resources: DEMO_RESOURCES.length,
  cases: DEMO_CASES.length,
  assessments: DEMO_ASSESSMENTS.length,
};

// 目前資料的筆數：全部與其中的示範資料
export function countData() {
  const resources = getAllResources();
  const cases = readList(CASES_KEY);
  const assessments = readList(ASSESSMENTS_KEY);
  return {
    resources: resources.length,
    cases: cases.length,
    assessments: assessments.length,
    demoResources: resources.filter(isDemoResource).length,
    demoCases: cases.filter(isDemoItem).length,
    demoAssessments: assessments.filter(isDemoItem).length,
  };
}

// 加入尚未存在（同 id）的示範資料；編碼與現有資料重複時改用下一個流水號
// 回傳 { list: 寫入後的完整清單, added: 加入的筆數, renamed: { 原編碼: 新編碼 } }
function mergeDemo(existing, demos, prefix) {
  const ids = new Set(existing.map((item) => String(item.id)));
  const usedCodes = new Set(existing.map((item) => item.code).filter(Boolean));
  const list = [...existing];
  const renamed = {};
  let added = 0;
  for (const demo of demos) {
    if (ids.has(String(demo.id))) continue;
    const item = { ...deepClone(demo), isDemo: true };
    if (usedCodes.has(item.code)) {
      item.code = nextCode(prefix, list);
      renamed[demo.code] = item.code;
    }
    usedCodes.add(item.code);
    list.push(item);
    added += 1;
  }
  return { list, added, renamed };
}

// replace 為 false：加入示範資源、個案與評估，已存在的（同 id）略過
// replace 為 true：清空所有資源、個案與評估後只放示範資料（彼此互相連結，必須一起清空）
// today：載入當天，日期依此平移（測試可指定）
// 回傳實際加入的筆數 { resources, cases, assessments }
export function loadDemoData({ replace = false, today = todayString() } = {}) {
  const demo = getDemoData(today);
  const addedResources = loadDemoResources({ replace, items: demo.resources });

  const assessments = mergeDemo(replace ? [] : readList(ASSESSMENTS_KEY), demo.assessments, "Ast");
  const cases = mergeDemo(replace ? [] : readList(CASES_KEY), demo.cases, "Case");

  // 評估編碼改號時，對應個案的 referral.assessmentCode 一併更新
  for (const c of cases.list) {
    const code = c.isDemo && c.referral?.assessmentCode;
    if (code && assessments.renamed[code]) c.referral.assessmentCode = assessments.renamed[code];
  }

  writeList(ASSESSMENTS_KEY, assessments.list);
  writeList(CASES_KEY, cases.list);
  return { resources: addedResources, cases: cases.added, assessments: assessments.added };
}

// 只移除帶示範標記的資料，回傳移除的筆數 { resources, cases, assessments }
export function removeDemoData() {
  const removed = { resources: removeDemoResources(), cases: 0, assessments: 0 };
  for (const [key, field] of [
    [CASES_KEY, "cases"],
    [ASSESSMENTS_KEY, "assessments"],
  ]) {
    const list = readList(key);
    const kept = list.filter((item) => !isDemoItem(item));
    removed[field] = list.length - kept.length;
    if (removed[field]) writeList(key, kept);
  }
  return removed;
}

// AUTO_LOAD_DEMO 為 true 且資料儲存區沒有任何資料時，自動載入示範資料（main.js 啟動時呼叫）
// 回傳是否有載入
export function autoLoadDemoIfEmpty({ enabled = AUTO_LOAD_DEMO } = {}) {
  if (!enabled || !isDataEmpty()) return false;
  loadDemoData();
  return true;
}
