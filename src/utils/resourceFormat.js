// 資源欄位的顯示格式，後台與民眾端頁面共用

import {
  ACCESSIBILITY_OPTIONS,
  AGE_GROUPS,
  AVAILABILITY_TYPES,
  CAPACITY_TYPES,
  FEE_TYPES,
  FOLLOW_UP_METHODS,
  FREQUENCY_OPTIONS,
  HIGH_RISK_TYPES,
  IDENTITIES,
  LANGUAGES,
  PARTICIPATION_OPTIONS,
  PARTNERSHIP_OPTIONS,
  RISK_CRITERIA,
  RISK_LEVEL_OPTIONS,
  SCHEDULE_TYPES,
  STATUS_OPTIONS,
  TRANSPORT_OPTIONS,
  VERIFIER_TYPES,
  WEEKDAYS,
  optionLabel,
  optionLabels,
} from "../config/resourceOptions.js";
import { getNeedTagLabel } from "../config/needTags.js";

const sortNumbers = (list) => [...(Array.isArray(list) ? list : [])].sort((a, b) => a - b);

function formatTimeRange(start, end) {
  if (start && end) return `${start}–${end}`;
  return start || end || "";
}

// 例：常態性｜每週 週二、週四｜07:00–08:00
export function formatSchedule(schedule) {
  if (!schedule?.type) return "";
  const parts = [optionLabel(SCHEDULE_TYPES, schedule.type)];

  if (schedule.type === "regular") {
    const frequency = optionLabel(FREQUENCY_OPTIONS, schedule.frequency);
    const days =
      schedule.frequency === "monthly"
        ? sortNumbers(schedule.monthDays).map((d) => `${d} 日`).join("、")
        : optionLabels(WEEKDAYS, sortNumbers(schedule.weekdays));
    parts.push([frequency, days].filter(Boolean).join(" "));
  } else if (schedule.type === "batch") {
    const range = [schedule.startDate, schedule.endDate].filter(Boolean).join(" ～ ");
    const days = optionLabels(WEEKDAYS, sortNumbers(schedule.weekdays));
    parts.push([range, days].filter(Boolean).join(" "));
  } else if (schedule.type === "once") {
    parts.push(schedule.date || "");
  }

  parts.push(formatTimeRange(schedule.startTime, schedule.endTime));
  return parts.filter(Boolean).join("｜");
}

// 例：220 新北市板橋區示範路 1 號旁
export function formatAddress(address) {
  if (!address) return "";
  const body = `${address.city || ""}${address.district || ""}${address.detail || ""}`;
  return [address.zip, body].filter(Boolean).join(" ");
}

export function formatCapacity(capacity) {
  if (!capacity?.type) return "";
  if (capacity.type === "limited") {
    return capacity.limit ? `上限 ${capacity.limit} 人` : "有上限（未填人數）";
  }
  return optionLabel(CAPACITY_TYPES, capacity.type);
}

// ISO 時間轉成本地 YYYY-MM-DD HH:mm
export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// 例：新北市板橋區；沒有行政區時顯示「地區待確認」
export function formatRegion(resource) {
  const { city, district } = resource?.address || {};
  return city || district ? `${city || ""}${district || ""}` : "地區待確認";
}

// 民眾端顯示的適用對象：年齡與身分（略過「不指定」），都不指定時回傳「不限對象」
export function formatAudience(resource) {
  const ages = (resource?.ageGroups || []).filter((c) => c !== "all");
  const identities = (resource?.identities || []).filter((c) => c !== "all" && c !== "other");
  const parts = [optionLabels(AGE_GROUPS, ages), optionLabels(IDENTITIES, identities)].filter(Boolean);
  if (parts.length) return parts.join("、");
  return (resource?.ageGroups || []).includes("all") || (resource?.identities || []).includes("all")
    ? "不限對象"
    : "";
}

// ── 修改紀錄的欄位內容 ────────────────────────────────────
// 把修改前後的值轉成中文，代碼改顯示選項名稱；沒有內容時顯示「（空白）」

export const EMPTY_CHANGE_VALUE = "（空白）";

const OPTIONS_BY_FIELD = {
  status: STATUS_OPTIONS,
  partnership: PARTNERSHIP_OPTIONS,
  riskLevel: RISK_LEVEL_OPTIONS,
  ageGroups: AGE_GROUPS,
  identities: IDENTITIES,
  participation: PARTICIPATION_OPTIONS,
  languages: LANGUAGES,
  transport: TRANSPORT_OPTIONS,
  accessibility: ACCESSIBILITY_OPTIONS,
  followUpMethods: FOLLOW_UP_METHODS,
};

const isBlank = (v) =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

// 沒有專用格式的值：陣列以頓號連接、物件列出有內容的值、布林為是／否
function plainText(value) {
  if (isBlank(value)) return "";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (Array.isArray(value)) return value.map(plainText).filter(Boolean).join("、");
  if (typeof value === "object") return Object.values(value).map(plainText).filter(Boolean).join("，");
  return String(value);
}

const joinFilled = (parts, separator = " ") => parts.filter((p) => !isBlank(p)).join(separator);

function fieldText(field, value) {
  switch (field) {
    case "address":
      return formatAddress(value);
    case "schedule":
      return formatSchedule(value);
    case "capacity":
      return formatCapacity(value);
    case "geo":
      return value?.lat !== undefined && value?.lng !== undefined ? `${value.lat}, ${value.lng}` : "";
    case "fee":
      return joinFilled([optionLabel(FEE_TYPES, value.type), value.detail], "：");
    case "availability":
      return joinFilled([
        optionLabel(AVAILABILITY_TYPES, value.type),
        value.slots !== null && value.slots !== undefined ? `名額 ${value.slots}` : "",
        value.nextBatch ? `下一梯次 ${value.nextBatch}` : "",
      ], "，");
    case "needTags":
      return value.map((code) => getNeedTagLabel(code) || code).join("、");
    case "staff":
      return value.map((s) => joinFilled([s.name, s.role, s.license, s.experience])).filter(Boolean).join("；");
    case "publicContact":
      return joinFilled([value.name, value.phone, value.emailOrLine]);
    case "adminContact":
      return value.sameAsPublic ? "同公眾聯絡人" : joinFilled([value.name, value.phone, value.emailOrLine]);
    case "verifiedBy":
      return joinFilled([value.name, value.type ? `（${optionLabel(VERIFIER_TYPES, value.type)}）` : ""], "");
    case "riskCriteria":
      return RISK_CRITERIA.map((c) => `${c.label}${optionLabel(RISK_LEVEL_OPTIONS, value[c.key]) || "未填"}`).join("、");
    case "highRisk":
      return value.isHighRisk ? joinFilled(["是", optionLabels(HIGH_RISK_TYPES, value.types)], "：") : "否";
    default: {
      const options = OPTIONS_BY_FIELD[field];
      if (options && Array.isArray(value)) return optionLabels(options, value);
      if (options) return optionLabel(options, value) || String(value);
      return plainText(value);
    }
  }
}

export function formatChangeValue(field, value) {
  if (isBlank(value)) return EMPTY_CHANGE_VALUE;
  return fieldText(field, value) || EMPTY_CHANGE_VALUE;
}
