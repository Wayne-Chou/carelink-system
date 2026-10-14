// 日期工具：資源、評估、個案共用
// 日期一律存本地日期 YYYY-MM-DD；時間存含時區的 ISO 字串（例：2026-10-01T09:00:00+08:00）

const pad = (n) => String(n).padStart(2, "0");

// 本地日期 YYYY-MM-DD（不用 toISOString，避免 UTC 換日誤差）
export function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayString() {
  return formatDate(new Date());
}

// 含時區的本地時間
export function formatDateTime(date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return (
    `${formatDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function nowDateTime() {
  return formatDateTime(new Date());
}

// 解析 YYYY-MM-DD（可帶時間，只取日期部分）為本地午夜
export function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// 取日期部分；接受日期或時間字串
export function toDateString(value) {
  const date = parseDate(value);
  return date ? formatDate(date) : "";
}

// 加月數；目標月份沒有該日時取月底（例：8/31 加 6 個月為 2/28）
export function addMonths(dateString, months) {
  const date = parseDate(dateString);
  if (!date) return "";
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return formatDate(date);
}

export function addDays(dateString, days) {
  const date = parseDate(dateString);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

// 兩個時間相差的小時數（b - a）；任一無法解析時回傳 null
export function hoursBetween(a, b) {
  const start = new Date(a);
  const end = new Date(b);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return (end.getTime() - start.getTime()) / 3_600_000;
}

// 兩個日期相差的天數（b - a），只看日期部分；任一無法解析時回傳 null
export function daysBetween(a, b) {
  const start = parseDate(a);
  const end = parseDate(b);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
