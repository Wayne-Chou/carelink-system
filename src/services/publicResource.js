// 民眾端資源資料：以白名單挑出可公開的欄位，頁面只拿得到這些
// 不公開：風險評級與判斷條件、高風險情境、驗證資訊、行政聯絡人、合作狀態、追蹤方式、
//         資源編碼、建立／修改時間、示範標記、AI 關鍵字、經緯度
// 依設定公開：人力配置（SHOW_STAFF_TO_PUBLIC）、生活情境（SHOW_SCENARIOS_TO_PUBLIC）

import {
  SHOW_SCENARIOS_TO_PUBLIC,
  SHOW_STAFF_TO_PUBLIC,
  getVisibility,
} from "../config/resourceRules.js";

/**
 * 民眾是否可以查看這筆資源；不可查看時提供給民眾的說明（不透露風險或合作等後台原因）
 * @returns {{ available: boolean, message: string }}
 */
export function getPublicAvailability(resource) {
  if (!resource) return { available: false, message: "找不到這個資源，可能已下架。" };
  if (getVisibility(resource).explore.visible) return { available: true, message: "" };

  switch (resource.status) {
    case "paused":
      return {
        available: false,
        message: resource.resumeAt
          ? `這個資源目前暫停服務，預計 ${resource.resumeAt} 恢復。`
          : "這個資源目前暫停服務。",
      };
    case "seasonal":
      return {
        available: false,
        message: resource.seasonalNote
          ? `這個資源目前為季節性休息（${resource.seasonalNote}）。`
          : "這個資源目前為季節性休息。",
      };
    case "terminated":
      return { available: false, message: "這個資源已停止提供。" };
    default:
      return { available: false, message: "這個資源目前未開放查詢。" };
  }
}

// 只保留民眾可見欄位；不可查看的資源回傳 null
export function toPublicResource(resource) {
  if (!getPublicAvailability(resource).available) return null;
  const r = structuredClone(resource);
  return {
    id: r.id,
    name: r.name,
    organization: r.organization,
    description: r.description,
    prescriptionTypes: r.prescriptionTypes,
    needTags: r.needTags,
    needTagOther: r.needTagOther,
    staff: SHOW_STAFF_TO_PUBLIC ? r.staff : [],
    capacity: r.capacity,
    availability: r.availability,
    schedule: r.schedule,
    placeName: r.placeName,
    address: r.address,

    ageGroups: r.ageGroups,
    identities: r.identities,
    identityOther: r.identityOther,
    notSuitableFor: r.notSuitableFor,
    scenarios: SHOW_SCENARIOS_TO_PUBLIC ? r.scenarios : null,
    participation: r.participation,
    participationOther: r.participationOther,
    languages: r.languages,
    indigenousTribe: r.indigenousTribe,
    languageOther: r.languageOther,
    transport: r.transport,
    transportNote: r.transportNote,
    accessibility: r.accessibility,
    accessibilityOther: r.accessibilityOther,
    fee: r.fee,
    notice: r.notice,

    publicContact: r.publicContact,
    links: r.links,
  };
}
