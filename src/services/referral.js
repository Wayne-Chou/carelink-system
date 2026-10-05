// 個案轉介用的資源判斷：轉介選單與「已連結資源目前狀態」，純函式不讀寫 localStorage

import { getVisibility, isRecommendable } from "../config/resourceRules.js";

export const ESCORT_NOTICE = "需健康管理員陪同至少一次";

const needsEscort = (resource) => resource?.riskLevel === "yellow";

// 轉介選單：只列出轉介情境可推薦的資源，黃燈標記需陪同
export function getReferralOptions(resources) {
  return (resources || [])
    .filter((r) => isRecommendable(r, "referral"))
    .map((resource) => ({ resource, needsEscort: needsEscort(resource) }));
}

/**
 * 個案已連結資源的目前狀態
 * @param {string|number|null} resourceId  個案 linkage.resourceId
 * @param {object[]} resources              全部資源（含不可推薦的，才找得到被暫停或終止的資源）
 * @returns {{ linked: false }
 *   | { linked: true, deleted: true, resourceId: string }
 *   | { linked: true, deleted: false, resource: object, available: boolean, reasons: string[], needsEscort: boolean }}
 *   available：目前是否仍可轉介；reasons：不可轉介的原因代碼（同 getVisibility）
 */
export function getLinkedResourceStatus(resourceId, resources) {
  if (resourceId === null || resourceId === undefined || resourceId === "") return { linked: false };
  const resource = (resources || []).find((r) => String(r.id) === String(resourceId));
  if (!resource) return { linked: true, deleted: true, resourceId: String(resourceId) };
  const { referral } = getVisibility(resource);
  return {
    linked: true,
    deleted: false,
    resource,
    available: referral.visible,
    reasons: referral.reasons,
    needsEscort: needsEscort(resource),
  };
}

// 資源被刪除後仍要顯示名稱：優先用連結時存下的名稱，舊個案則從歷程紀錄「連結資源：xxx」找最後一筆
export function getLinkedResourceName(linkage, history = []) {
  if (linkage?.resourceName) return linkage.resourceName;
  for (let i = history.length - 1; i >= 0; i--) {
    const match = /連結資源：(.+?)(（|$)/.exec(history[i]?.note ?? "");
    if (match) return match[1];
  }
  return "";
}
