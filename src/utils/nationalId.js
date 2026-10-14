// 身分證字號的儲存與遮罩（評估紀錄與個案共用）
// 待確認事項：「身分證字號在原型階段是否可以只存後四碼或完全不存？」→ 由 NATIONAL_ID_STORAGE 決定

import { NATIONAL_ID_STORAGE } from "../config/assessmentRules.js";

// 依設定轉成要儲存的值：full 存完整字號；last4 只存後四碼；none 不存
export function storeNationalId(value, mode = NATIONAL_ID_STORAGE) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text || mode === "none") return "";
  if (mode === "last4") return text.slice(-4);
  return text;
}

// 畫面顯示用遮罩
//   完整字號：保留前三碼與後三碼，例 A123456789 → A12****789
//   只存後四碼：前面補星號到 10 碼，例 6789 → ******6789
export function maskNationalId(value) {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return "";
  if (text.length >= 8) return `${text.slice(0, 3)}${"*".repeat(text.length - 6)}${text.slice(-3)}`;
  return `${"*".repeat(Math.max(10 - text.length, 0))}${text}`;
}
