// 個案的顯示標籤（doc/assessment-schema.md 第六節），個案頁、資源端後台、歷程說明共用

export const STAGE_OPTIONS = [
  { code: 1, label: "辨識", short: "1 辨識" },
  { code: 2, label: "諮詢", short: "2 諮詢" },
  { code: 3, label: "連結", short: "3 連結" },
  { code: 4, label: "追蹤", short: "4 追蹤" },
  { code: 5, label: "結案", short: "5 結案" },
  { code: "closed", label: "已結案", short: "已結案" },
];

export const REFERRER_TYPE_OPTIONS = [
  { code: "medical", label: "醫療" },
  { code: "watcher", label: "守望員" },
  { code: "self", label: "自我轉介" },
];

export const LINKAGE_STATUS_OPTIONS = [
  { code: "pending", label: "待回報" },
  { code: "success", label: "成功" },
  { code: "failed", label: "失敗" },
];

export const ATTENDANCE_OPTIONS = [
  { code: "attended", label: "有出席" },
  { code: "absent", label: "未出席" },
];

export const PARTICIPATION_OPTIONS = [
  { code: "success", label: "參與順利" },
  { code: "failed", label: "未能持續參與" },
];

export const IMPACT_OPTIONS = [
  { code: "improved", label: "改善" },
  { code: "same", label: "無變化" },
  { code: "worse", label: "惡化" },
];

export const CLOSURE_REASON_OPTIONS = [
  { code: "goal_met", label: "達成目標" },
  { code: "integrated", label: "自主融入" },
  { code: "withdrew", label: "主動退出" },
  { code: "other", label: "其他" },
];

export function caseLabel(options, code) {
  return options.find((o) => o.code === code)?.label ?? "";
}

export const stageLabel = (stage) => caseLabel(STAGE_OPTIONS, stage) || "辨識";
export const stageShort = (stage) => STAGE_OPTIONS.find((o) => o.code === stage)?.short ?? "1 辨識";
