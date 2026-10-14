// 評估紀錄的顯示標籤（評估列表、判讀頁共用）

export const STATUS_LABELS = {
  filled: "未判讀",
  reviewed: "已判讀",
  closed: "已完成",
  voided: "已作廢",
};

export const LIGHT_OPTIONS = [
  { code: "red", label: "紅燈", description: "緊急需求", icon: "🔴" },
  { code: "orange", label: "橘燈", description: "轉介", icon: "🟠" },
  { code: "yellow", label: "黃燈", description: "資訊需求", icon: "🟡" },
  { code: "green", label: "綠燈", description: "未發現需求", icon: "🟢" },
];

export const ORANGE_TYPE_OPTIONS = [
  { code: "refer", label: "轉介" },
  { code: "hesitant", label: "退縮" },
  { code: "reserved", label: "保留" },
];

export const RED_REASON_OPTIONS = [
  { code: "suicide", label: "自殺意念或自傷" },
  { code: "violence", label: "疑似家暴或受虐" },
  { code: "psychosis", label: "急性精神症狀" },
  { code: "homeless", label: "無家可歸需安置" },
  { code: "basic_needs", label: "斷炊或斷藥" },
];

export const READER_TYPE_OPTIONS = [
  { code: "doctor", label: "醫師" },
  { code: "nurse", label: "護理師" },
  { code: "dietitian", label: "營養師" },
  { code: "other", label: "其他" },
];

export const EXTRA_ASSESSMENT_OPTIONS = [
  { code: "bsrs5", label: "BSRS-5" },
  { code: "phq9", label: "PHQ-9" },
  { code: "icope", label: "ICOPE" },
];

const findOption = (options, code) => options.find((o) => o.code === code);

// 例：「🟠 橘燈（轉介）」「🟢 綠燈」；未判定回傳空字串
export function formatLight(light, orangeType) {
  const option = findOption(LIGHT_OPTIONS, light);
  if (!option) return "";
  const type = light === "orange" ? findOption(ORANGE_TYPE_OPTIONS, orangeType)?.label : "";
  return `${option.icon} ${option.label}${type ? `（${type}）` : ""}`;
}
