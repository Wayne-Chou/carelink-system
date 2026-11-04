// 守望員轉介單的選項與狀態（doc/specs/referral-schema.md），轉介民眾頁、我的轉介、轉介單處理頁共用

// 轉介民眾頁最上方的固定提醒
export const EMERGENCY_NOTICE = "如有立即危險，請直接撥打 110 或 119。";

// 送出後的說明
export const SUBMITTED_MESSAGE = "健康管理員會盡快處理";

// 狀態：送出 → 處理中（健康管理員打開過）→ 已開案 → 已結案（個案結案時自動改變）；或 送出 → 處理中 → 未開案
export const REFERRAL_STATUSES = [
  { code: "submitted", label: "已送出" },
  { code: "processing", label: "處理中" },
  { code: "opened", label: "已開案" },
  { code: "closed", label: "已結案" },
  { code: "declined", label: "未開案" },
];

// 還沒有決定（待辦「守望員轉介待處理」）；已開案、已結案、未開案都不算
export const PENDING_STATUSES = ["submitted", "processing"];

export const AGE_GROUPS = [
  { code: "under18", label: "未滿 18 歲" },
  { code: "adult", label: "18–64 歲" },
  { code: "senior", label: "65 歲以上" },
  { code: "unknown", label: "不清楚" },
];

// 發現的狀況（可複選）
export const SITUATIONS = [
  { code: "alone", label: "獨居或缺少照顧" },
  { code: "mobility", label: "行動不便" },
  { code: "financial", label: "經濟困難" },
  { code: "lonely", label: "情緒低落或孤單" },
  { code: "caregiver", label: "照顧家人壓力大" },
  { code: "other", label: "其他" },
];

// 是否已告知當事人會有人聯繫
export const INFORMED_OPTIONS = [
  { code: "yes", label: "是" },
  { code: "no", label: "否" },
  { code: "unsure", label: "不確定" },
];

// 不開案的原因（守望員只看得到原因類別，看不到說明）
export const DECLINE_REASONS = [
  { code: "unreachable", label: "聯繫不上" },
  { code: "refused", label: "民眾婉拒" },
  { code: "has_service", label: "已有其他服務" },
  { code: "not_eligible", label: "不符合服務對象" },
  { code: "other", label: "其他" },
];

// 歷程的動作
export const REFERRAL_ACTIONS = [
  { code: "submit", label: "守望員送出" },
  { code: "process", label: "健康管理員開始處理" },
  { code: "open_case", label: "開案" },
  { code: "decline", label: "不開案" },
  { code: "case_closed", label: "個案結案" },
];

export const referralLabel = (options, code) => options.find((o) => o.code === code)?.label ?? "";
