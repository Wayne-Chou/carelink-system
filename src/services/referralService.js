// 守望員轉介單（doc/specs/referral-schema.md）
// 所有轉介單的讀寫集中在這裡，寫入時整份寫回「referrals」（經 storage.js）；頁面不直接讀寫儲存區
// 權限（守望員送出與查看自己的、健康管理員處理）由路由與頁面檢查，見 config/roles.js

import { DEMO_ACCOUNTS } from "../config/roles.js";
import { watcherIdentityText } from "../config/accounts.js";
import { getDistricts } from "../config/districts.js";
import {
  AGE_GROUPS,
  DECLINE_REASONS,
  INFORMED_OPTIONS,
  PENDING_STATUSES,
  REFERRAL_STATUSES,
  SITUATIONS,
  referralLabel,
} from "../config/referralLabels.js";
import { openCaseFromReferral } from "./caseService.js";
import { readList, writeList } from "./storage.js";
import { findUserByEmail } from "../utils/auth.js";
import { nowDateTime, toDateString } from "../utils/date.js";
import { generateId } from "../utils/id.js";
import { isPlainObject } from "../utils/object.js";
import { nextCode } from "../utils/sequenceCode.js";

const STORAGE_KEY = "referrals";
const CODE_PREFIX = "Ref";

const text = (value) => String(value ?? "").trim();
const normalizeEmail = (email) => text(email).toLowerCase();
const codesOf = (options) => options.map((o) => o.code);

// ── 預設值 ────────────────────────────────────────────────

// 轉介民眾頁的表單
export function createEmptyReferralForm() {
  return {
    person: { name: "", phone: "", city: "", district: "", ageGroup: "" },
    situations: [],
    description: "",
    informed: "",
  };
}

// ── 讀取 ──────────────────────────────────────────────────

export function getAllReferrals() {
  return readList(STORAGE_KEY).filter(isPlainObject);
}

export function getReferralById(id) {
  return getAllReferrals().find((r) => String(r.id) === String(id)) ?? null;
}

// 尚未決定開案與否的轉介單（待辦），先送出的在前
export function getPendingReferrals(referrals = getAllReferrals()) {
  return referrals
    .filter((r) => PENDING_STATUSES.includes(r.status))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

const writeAll = (referrals) => writeList(STORAGE_KEY, referrals);

function replaceReferral(updated) {
  writeAll(getAllReferrals().map((r) => (String(r.id) === String(updated.id) ? updated : r)));
  return updated;
}

// ── 送出（守望員）─────────────────────────────────────────

// 電話：至少 8 個數字，可含連字號、空白、括號（手機或市話都可以）
const isPhone = (value) => /^[\d\s()+-]+$/.test(text(value)) && text(value).replace(/\D/g, "").length >= 8;

/**
 * 檢查轉介單
 * @returns {Record<string, string>} 欄位路徑 → 錯誤訊息
 */
export function validateReferral(form = {}) {
  const errors = {};
  const person = form.person ?? {};
  if (!text(person.name)) errors["person.name"] = "請填寫被轉介人姓名";
  if (!text(person.phone)) errors["person.phone"] = "請填寫聯絡電話";
  else if (!isPhone(person.phone)) errors["person.phone"] = "電話格式不正確，例：0900-000-001 或 03-0000-0001";
  if (text(person.district) && !getDistricts(person.city).some((d) => d.name === text(person.district))) {
    errors["person.district"] = "請重新選擇行政區";
  }
  if (person.ageGroup && !codesOf(AGE_GROUPS).includes(person.ageGroup)) errors["person.ageGroup"] = "請重新選擇年齡層";
  const situations = Array.isArray(form.situations) ? form.situations : [];
  if (!situations.length) errors.situations = "請選擇至少一項發現的狀況";
  if (!text(form.description)) errors.description = "請填寫狀況說明";
  if (form.informed && !codesOf(INFORMED_OPTIONS).includes(form.informed)) errors.informed = "請重新選擇";
  return errors;
}

// 守望員的聯絡資料：姓名、單位、電話與身分類別，送出時存一份在轉介單上（之後帳號資料改變不影響）
function watcherProfile(user = {}) {
  const email = normalizeEmail(user.email);
  const account = DEMO_ACCOUNTS.find((a) => a.email === email) ?? findUserByEmail(email);
  const details = account?.details ?? {};
  return {
    name: account?.name ?? text(user.name),
    email,
    phone: account?.phone ?? "",
    unit: details.unit || account?.organization || "",
    identity: watcherIdentityText(details),
  };
}

const historyEntry = (action, status, actor = "", note = "") => ({ at: nowDateTime(), action, status, actor, note });

/**
 * 守望員送出轉介單：狀態為「已送出」，編碼 Ref001 起
 * 不需要先取得民眾同意，由健康管理員第一次聯繫時取得（個案第 1 階段）
 * @param {{ name: string, email: string }} watcher  目前登入的守望員
 * @returns {{ ok: true, referral: object } | { ok: false, errors: Record<string, string> }}
 */
export function submitReferral(form, watcher = {}) {
  const errors = validateReferral(form);
  if (Object.keys(errors).length) return { ok: false, errors };

  const referrals = getAllReferrals();
  const now = nowDateTime();
  const profile = watcherProfile(watcher);
  const situationCodes = codesOf(SITUATIONS);
  const referral = {
    id: generateId(),
    code: nextCode(CODE_PREFIX, referrals),
    status: "submitted",
    person: {
      name: text(form.person.name),
      phone: text(form.person.phone),
      city: text(form.person.city),
      district: text(form.person.city) ? text(form.person.district) : "",
      ageGroup: form.person.ageGroup || "",
    },
    situations: situationCodes.filter((code) => form.situations.includes(code)),
    description: text(form.description),
    informed: form.informed || "",
    watcher: profile,
    caseId: null,
    caseCode: null,
    decision: null,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    history: [historyEntry("submit", "submitted", profile.name)],
  };
  writeAll([...referrals, referral]);
  return { ok: true, referral };
}

// ── 我的轉介（守望員）─────────────────────────────────────

/**
 * 守望員自己送出的轉介單，新的在前
 * 只回傳編碼、被轉介人姓名、送出日期、狀態；未開案時只有原因類別，已結案時只有結案日期
 * （看不到個案內容、結案原因、健康管理員的說明與紀錄）
 */
export function myReferralRows(email, referrals = getAllReferrals()) {
  const target = normalizeEmail(email);
  if (!target) return [];
  return referrals
    .filter((r) => normalizeEmail(r.watcher?.email) === target)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map((r) => ({
      id: r.id,
      code: r.code,
      personName: r.person?.name ?? "",
      submittedDate: toDateString(r.createdAt),
      status: r.status,
      statusText: referralLabel(REFERRAL_STATUSES, r.status),
      declineReasonText: r.status === "declined" ? referralLabel(DECLINE_REASONS, r.decision?.reason) : "",
      closedDate: r.status === "closed" ? toDateString(r.closedAt) : "",
    }));
}

// ── 處理（健康管理員）─────────────────────────────────────

const actorName = (actor) => (typeof actor === "string" ? actor : actor?.name ?? "");

function mutate(id, fn) {
  const current = getReferralById(id);
  if (!current) return { ok: false, error: "找不到這張轉介單" };
  const draft = structuredClone(current);
  const error = fn(draft);
  if (error) return { ok: false, error };
  draft.updatedAt = nowDateTime();
  return { ok: true, referral: replaceReferral(draft) };
}

const notPending = (r) =>
  PENDING_STATUSES.includes(r.status) ? "" : `這張轉介單已是「${referralLabel(REFERRAL_STATUSES, r.status)}」，不能再變更`;

// 健康管理員打開轉介單：「已送出」改為「處理中」；其他狀態不變
export function markProcessing(id, { actor = "" } = {}) {
  const current = getReferralById(id);
  if (!current) return { ok: false, error: "找不到這張轉介單" };
  if (current.status !== "submitted") return { ok: true, referral: current };
  return mutate(id, (r) => {
    r.status = "processing";
    r.history = [...r.history, historyEntry("process", "processing", actorName(actor))];
  });
}

/**
 * 開案：建立個案（來源「守望員轉介」、連結轉介單編碼，從第 1 階段開始），轉介單改為「已開案」
 * @returns {{ ok: true, referral: object, case: object } | { ok: false, error: string }}
 */
export function openCaseForReferral(id, { actor = "", managerName = "" } = {}) {
  const current = getReferralById(id);
  if (!current) return { ok: false, error: "找不到這張轉介單" };
  const blocked = notPending(current);
  if (blocked) return { ok: false, error: blocked };

  const caseItem = openCaseFromReferral(current, { managerName, actor: actorName(actor) });
  const result = mutate(id, (r) => {
    r.status = "opened";
    r.caseId = caseItem.id;
    r.caseCode = caseItem.code;
    r.decision = { result: "opened", reason: "", note: "", at: nowDateTime(), actor: actorName(actor) };
    r.history = [...r.history, historyEntry("open_case", "opened", actorName(actor), `開案 ${caseItem.code}`)];
  });
  return result.ok ? { ...result, case: caseItem } : result;
}

/**
 * 不開案：必選原因，可填說明；轉介單改為「未開案」
 * @returns {{ ok: true, referral: object } | { ok: false, error?: string, errors?: Record<string, string> }}
 */
export function declineReferral(id, { reason = "", note = "" } = {}, { actor = "" } = {}) {
  const current = getReferralById(id);
  if (!current) return { ok: false, error: "找不到這張轉介單" };
  const blocked = notPending(current);
  if (blocked) return { ok: false, error: blocked };
  if (!codesOf(DECLINE_REASONS).includes(reason)) return { ok: false, errors: { reason: "請選擇不開案的原因" } };

  return mutate(id, (r) => {
    r.status = "declined";
    r.decision = { result: "declined", reason, note: text(note), at: nowDateTime(), actor: actorName(actor) };
    r.history = [
      ...r.history,
      historyEntry("decline", "declined", actorName(actor), [referralLabel(DECLINE_REASONS, reason), text(note)].filter(Boolean).join("｜")),
    ];
  });
}

// ── 個案結案（由 caseService 在個案結案時呼叫，頁面不直接呼叫）──────

/**
 * 由守望員轉介開案的個案結案：對應的轉介單從「已開案」改為「已結案」，記錄結案日期與歷程
 * 不記錄結案原因（守望員看不到）；個案不是由轉介單開案、或轉介單不是已開案時不變
 * @returns {{ ok: true, referral: object } | null}  沒有對應的轉介單時為 null
 */
export function markReferralCaseClosed(caseItem, { actor = "" } = {}) {
  const referralId = caseItem?.referral?.referralId;
  const current = referralId ? getReferralById(referralId) : null;
  if (!current || current.status !== "opened" || String(current.caseId) !== String(caseItem.id)) return null;
  const closedAt = caseItem.closure?.closedAt || toDateString(nowDateTime());
  return mutate(current.id, (r) => {
    r.status = "closed";
    r.closedAt = closedAt;
    r.history = [...r.history, historyEntry("case_closed", "closed", actorName(actor), `個案 ${caseItem.code} 結案`)];
  });
}
