// 模擬信箱（原型展示用）：系統的通知信都寫在這裡，不實際寄出（doc/specs/account-schema.md）
// 存在帳號儲存區（storage.js 的 ACCOUNT_STORAGE，測試階段為 sessionStorage）
// ⚠ 正式版改由後端寄送 Email

import { readAccountList, writeAccountList } from "./storage.js";
import { generateId } from "../utils/id.js";
import { nowDateTime } from "../utils/date.js";

const MAILS_KEY = "mockMails";

// 通知信類型
export const MAIL_TYPES = [
  { code: "application_received", label: "註冊申請已送出" },
  { code: "application_new", label: "有新的註冊申請" },
  { code: "approved", label: "帳號已開通（設定密碼）" },
  { code: "rejected", label: "審核退回" },
  { code: "suspended", label: "帳號停用" },
  { code: "reactivated", label: "帳號重新啟用" },
  { code: "account_created", label: "帳號已建立（設定密碼）" },
  { code: "password_reset", label: "重設密碼" },
];

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();

/**
 * 寄出（寫入模擬信箱）
 * @param {{ to: string, type: string, subject: string, body: string, links?: Array<{ label: string, path: string }> }} mail
 *   body 為純文字（換行分段）；links 為系統內的頁面路徑，信件頁可直接開啟
 */
export function sendMail({ to, type, subject, body, links = [] }) {
  const mail = {
    id: generateId(),
    to: normalizeEmail(to),
    type,
    subject,
    body,
    links,
    sentAt: nowDateTime(),
  };
  writeAccountList(MAILS_KEY, [...getMails(), mail]);
  return mail;
}

// 全部信件，舊的在前
export function getMails() {
  return readAccountList(MAILS_KEY);
}

export function getMailById(id) {
  return getMails().find((m) => m.id === id) ?? null;
}

export function getMailsTo(email) {
  return getMails().filter((m) => m.to === normalizeEmail(email));
}

// 依收件人分組：收件人依 Email 排序，每組的信件新的在前
export function getMailboxes() {
  const groups = new Map();
  for (const mail of getMails()) {
    if (!groups.has(mail.to)) groups.set(mail.to, []);
    groups.get(mail.to).push(mail);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([to, mails]) => ({ to, mails: mails.reverse() }));
}
