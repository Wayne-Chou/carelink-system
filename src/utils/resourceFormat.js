// 資源欄位的顯示格式，後台與民眾端頁面共用

import {
  AGE_GROUPS,
  CAPACITY_TYPES,
  FREQUENCY_OPTIONS,
  IDENTITIES,
  SCHEDULE_TYPES,
  WEEKDAYS,
  optionLabel,
  optionLabels,
} from "../config/resourceOptions.js";

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
