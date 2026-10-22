// 示範情境的載入：清空所有資源、評估、個案後，只放「林示範的故事」從第 N 步開始的資料
// 資料寫入 storage.js 的資料區（測試階段為 sessionStorage）；使用者帳號不受影響

import { STORY_STEP_COUNT } from "../config/demoStory.js";
import { buildScenario } from "./demoScenario.js";
import { AUTO_LOAD_DEMO, isDataEmpty, readList, writeList } from "./storage.js";
import { todayString } from "../utils/date.js";

const KEYS = { resources: "resources", assessments: "assessments", cases: "cases" };

// 目前資料的筆數（載入前的確認訊息使用）
export function countData() {
  return Object.fromEntries(Object.entries(KEYS).map(([field, key]) => [field, readList(key).length]));
}

/**
 * 載入示範情境：清空所有資源、評估、個案，只保留示範情境資料
 * @param {number} step  從第幾步開始（1～11）
 * @param {{ today?: string }} options  載入當天，日期依此安排（測試可指定）
 * @returns {{ step: number, resources: number, assessments: number, cases: number }}
 */
export function loadScenario(step = 1, { today = todayString() } = {}) {
  const s = Math.min(Math.max(Math.trunc(Number(step)) || 1, 1), STORY_STEP_COUNT);
  const data = buildScenario(s, today);
  for (const [field, key] of Object.entries(KEYS)) writeList(key, data[field]);
  return { step: s, resources: data.resources.length, assessments: data.assessments.length, cases: data.cases.length };
}

// AUTO_LOAD_DEMO 為 true 且資料儲存區沒有任何資料時，自動載入示範情境第 1 步（main.js 啟動時呼叫）
// 回傳是否有載入
export function autoLoadDemoIfEmpty({ enabled = AUTO_LOAD_DEMO } = {}) {
  if (!enabled || !isDataEmpty()) return false;
  loadScenario(1);
  return true;
}
