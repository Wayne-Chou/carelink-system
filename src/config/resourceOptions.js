// 資源欄位的選項代碼表（doc/resource-schema.md 第一～五節），頁面共用
// 每個選項為 { code, label }，資料只存 code

export const STATUS_OPTIONS = [
  { code: "active", label: "活躍" },
  { code: "paused", label: "暫停" },
  { code: "terminated", label: "終止" },
  { code: "seasonal", label: "季節性關閉" },
];

export const VERIFIER_TYPES = [
  { code: "team", label: "社會處方團隊" },
  { code: "provider", label: "機構聯絡人" },
];

export const CAPACITY_TYPES = [
  { code: "limited", label: "有上限" },
  { code: "open", label: "不限" },
  { code: "other", label: "其他" },
];

export const AVAILABILITY_TYPES = [
  { code: "available", label: "有名額" },
  { code: "full", label: "額滿預約" },
  { code: "realtime", label: "須即時確認" },
];

export const SCHEDULE_TYPES = [
  { code: "regular", label: "常態性" },
  { code: "batch", label: "梯次性" },
  { code: "once", label: "單次性" },
];

export const FREQUENCY_OPTIONS = [
  { code: "weekly", label: "每週" },
  { code: "monthly", label: "每月" },
];

export const WEEKDAYS = [
  { code: 1, label: "週一" },
  { code: 2, label: "週二" },
  { code: 3, label: "週三" },
  { code: 4, label: "週四" },
  { code: 5, label: "週五" },
  { code: 6, label: "週六" },
  { code: 7, label: "週日" },
];

export const RISK_LEVEL_OPTIONS = [
  { code: "green", label: "綠燈", description: "可放心轉介" },
  { code: "yellow", label: "黃燈", description: "需健康管理員陪同至少一次" },
  { code: "red", label: "紅燈", description: "避免推薦並持續追蹤" },
];

export const RISK_CRITERIA = [
  { key: "management", label: "機構管理" },
  { key: "insurance", label: "意外保險" },
  { key: "environment", label: "環境安全" },
  { key: "complaints", label: "投訴紀錄" },
  { key: "staffQualification", label: "人員資格" },
];

export const HIGH_RISK_TYPES = [
  { code: "medical", label: "治療性身體操作或醫療行為" },
  { code: "psychological", label: "以改變認知行為為目的的心理服務" },
  { code: "hazardous", label: "風險環境或危險器材" },
];

export const AGE_GROUPS = [
  { code: "all", label: "不指定" },
  { code: "child", label: "兒童" },
  { code: "teen", label: "青少年" },
  { code: "adult", label: "成人" },
  { code: "senior", label: "長者" },
];

export const IDENTITIES = [
  { code: "all", label: "不指定" },
  { code: "dementia", label: "失智者" },
  { code: "disability", label: "身心障礙者" },
  { code: "chronic", label: "慢性病患者" },
  { code: "living_alone", label: "獨居者" },
  { code: "caregiver", label: "照顧者" },
  { code: "parent", label: "家長" },
  { code: "indigenous", label: "原住民" },
  { code: "new_immigrant", label: "新住民" },
  { code: "other", label: "其他" },
];

export const PARTICIPATION_OPTIONS = [
  { code: "referral_only", label: "僅接受轉介" },
  { code: "registration", label: "須報名" },
  { code: "walk_in", label: "自由參加" },
  { code: "other", label: "其他" },
];

export const LANGUAGES = [
  { code: "mandarin", label: "國語" },
  { code: "taiwanese", label: "台語" },
  { code: "hakka", label: "客語" },
  { code: "indigenous", label: "原住民語" },
  { code: "other", label: "其他" },
];

export const TRANSPORT_OPTIONS = [
  { code: "dropoff", label: "門口可下車" },
  { code: "parking", label: "有停車位" },
  { code: "public_transit", label: "大眾運輸" },
  { code: "shuttle", label: "專車接駁" },
  { code: "other", label: "其他" },
];

export const ACCESSIBILITY_OPTIONS = [
  { code: "barrier_free", label: "無障礙空間" },
  { code: "dementia_friendly", label: "失智者友善" },
  { code: "senior_friendly", label: "長者友善" },
  { code: "child_friendly", label: "兒童友善" },
  { code: "gender_friendly", label: "性別友善" },
  { code: "culture_friendly", label: "文化友善" },
  { code: "other", label: "其他" },
];

export const FEE_TYPES = [
  { code: "free", label: "免費" },
  { code: "paid", label: "自費" },
  { code: "subsidized", label: "優惠或補助" },
];

export const PARTNERSHIP_OPTIONS = [
  { code: "formal", label: "正式合作" },
  { code: "verbal", label: "口頭確認" },
  { code: "unconfirmed", label: "尚未確認" },
];

export const FOLLOW_UP_METHODS = [
  { code: "provider_contact", label: "資源點主動聯繫" },
  { code: "report_form", label: "填寫追蹤回報表單" },
  { code: "manager_contact", label: "健康管理員定期主動聯繫" },
  { code: "other", label: "其他" },
];

// getVisibility() 回傳的不顯示原因代碼 → 簡短中文（列表等空間有限處使用）
export const VISIBILITY_REASON_LABELS = {
  paused: "暫停中",
  seasonal: "季節性關閉",
  terminated: "已終止",
  contact_needed: "合作未確認",
  risk_tracking: "風險紅燈",
  risk_unassessed: "未做風險評估",
};

export function optionLabel(options, code) {
  return options.find((o) => o.code === code)?.label ?? "";
}

export function optionLabels(options, codes = [], separator = "、") {
  return (Array.isArray(codes) ? codes : [])
    .map((code) => optionLabel(options, code) || code)
    .join(separator);
}
