// 註冊申請、審核、停用、建立帳號、設定與重設密碼（doc/specs/account-schema.md）
// ⚠ 原型階段：帳號與密碼存在瀏覽器（storage.js 的 ACCOUNT_STORAGE），通知信寫入模擬信箱；正式版需由後端處理
// 登入與登入狀態見 utils/auth.js；權限（account.manage）由頁面與路由檢查

import { DEMO_ACCOUNTS, REGISTERABLE_ROLES, getRoleLabel, isValidRole } from "../config/roles.js";
import {
  RESET_TOKEN_MINUTES,
  ROLE_DETAIL_FIELDS,
  SETUP_TOKEN_DAYS,
  checkPassword,
  isEmail,
  isMobile,
} from "../config/accounts.js";
import { accountStatusOf, findUserByEmail, getUsers, isDemoEmail, saveUsers, writeBinding } from "../utils/auth.js";
import { readAccountList, writeAccountList } from "./storage.js";
import { sendMail } from "./mailService.js";
import { getResourceById } from "./resourceService.js";
import { generateId } from "../utils/id.js";
import { formatDateTime } from "../utils/date.js";

const TOKENS_KEY = "passwordTokens"; // 設定密碼與重設密碼的連結 [{ token, email, purpose, createdAt, expiresAt, usedAt }]
const FORGOT_PASSWORD_HINT = "請在登入頁使用「忘記密碼」重新取得連結";

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const text = (value) => String(value ?? "").trim();
const stamp = (now) => formatDateTime(now);
const actorOf = (actor) => ({ name: actor?.name ?? "", email: normalizeEmail(actor?.email) });

// ── 讀取 ──────────────────────────────────────────────────

// 示範帳號以帳號列表的格式呈現（寫在程式中，只能檢視）
const demoAsAccount = (a) => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: a.role,
  status: "active",
  isDemo: true,
  organization: "示範帳號",
  history: [],
  createdAt: null,
});

const withStatus = (u) => ({ ...u, status: accountStatusOf(u), history: Array.isArray(u.history) ? u.history : [] });

// 排序：待審核排最前面（先申請的在前），其他依建立時間新的在前，示範帳號最後
const STATUS_ORDER = { pending: 0, active: 1, suspended: 2, rejected: 3 };
function compareAccounts(a, b) {
  if (!!a.isDemo !== !!b.isDemo) return a.isDemo ? 1 : -1;
  const byStatus = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
  if (byStatus) return byStatus;
  const ta = String(a.createdAt ?? "");
  const tb = String(b.createdAt ?? "");
  return a.status === "pending" ? ta.localeCompare(tb) : tb.localeCompare(ta);
}

// 全部帳號（註冊與建立的帳號，再加上示範帳號），密碼不列出
export function listAccounts() {
  return [...getUsers().map(withStatus), ...DEMO_ACCOUNTS.map(demoAsAccount)]
    .map(({ password: _password, ...rest }) => ({ ...rest, hasPassword: !!_password }))
    .sort(compareAccounts);
}

export function getAccountById(id) {
  return listAccounts().find((a) => String(a.id) === String(id)) ?? null;
}

// 待審核的申請，先申請的在前（待辦使用）
export function getPendingApplications() {
  return listAccounts().filter((a) => a.status === "pending");
}

export function countByStatus(accounts = listAccounts()) {
  const counts = { pending: 0, active: 0, rejected: 0, suspended: 0 };
  for (const a of accounts) counts[a.status] = (counts[a.status] ?? 0) + 1;
  return counts;
}

function updateUser(id, update) {
  const users = getUsers();
  const index = users.findIndex((u) => String(u.id) === String(id));
  if (index === -1) return null;
  users[index] = update(withStatus(users[index]));
  saveUsers(users);
  return withStatus(users[index]);
}

// 所有已啟用的系統管理員 Email（新申請通知用）
export function adminEmails() {
  const registered = getUsers()
    .filter((u) => u.role === "admin" && accountStatusOf(u) === "active")
    .map((u) => normalizeEmail(u.email));
  return [...new Set([...DEMO_ACCOUNTS.filter((a) => a.role === "admin").map((a) => a.email), ...registered])];
}

const resourceName = (id) => {
  const r = getResourceById(id);
  return r ? [r.code, r.name].filter(Boolean).join(" ") : "";
};

// ── 註冊申請 ──────────────────────────────────────────────

export function createEmptyApplication() {
  return {
    name: "",
    email: "",
    phone: "",
    organization: "",
    jobTitle: "",
    role: "",
    supervisorName: "",
    supervisorContact: "",
    reason: "",
    consent: false,
    details: {
      reader: { medicalType: "", licenseNo: "", institution: "" },
      manager: { employeeIdOrEmployer: "" },
      provider: { resourceId: "", orgName: "", registrationNo: "", orgContact: "" },
    },
  };
}

// Email 是否已被使用：示範帳號、已啟用、待審核、已停用的帳號都不能再申請；已退回的可以重新申請
function emailConflict(email, { allowRejected = true } = {}) {
  if (isDemoEmail(email)) return "這是示範帳號的 Email，請直接登入";
  const existing = findUserByEmail(email);
  if (!existing) return "";
  if (allowRejected && accountStatusOf(existing) === "rejected") return "";
  return "此 Email 已註冊或正在審核中";
}

/**
 * 檢查註冊申請
 * @returns {Record<string, string>} 欄位路徑 → 錯誤訊息；額外欄位的路徑為 details.角色.欄位
 */
export function validateApplication(form) {
  const errors = {};
  const required = {
    name: "姓名",
    organization: "目前任職或服務單位",
    jobTitle: "職稱",
    supervisorName: "目前單位主管或聯絡人姓名",
    supervisorContact: "目前單位主管或聯絡人電話或 Email",
    reason: "申請理由",
  };
  for (const [key, label] of Object.entries(required)) if (!text(form[key])) errors[key] = `請填寫${label}`;

  if (!text(form.email)) errors.email = "請填寫 Email";
  else if (!isEmail(form.email)) errors.email = "Email 格式不正確";
  else if (emailConflict(form.email)) errors.email = emailConflict(form.email);

  if (!text(form.phone)) errors.phone = "請填寫手機";
  else if (!isMobile(form.phone)) errors.phone = "手機格式不正確，例：0900-000-001";

  if (!REGISTERABLE_ROLES.includes(form.role)) errors.role = "請選擇申請角色";
  else {
    const details = form.details?.[form.role] ?? {};
    for (const field of ROLE_DETAIL_FIELDS[form.role]) {
      if (field.required && !text(details[field.key])) errors[`details.${form.role}.${field.key}`] = `請填寫${field.label}`;
    }
    if (form.role === "provider" && text(details.resourceId) && !getResourceById(details.resourceId)) {
      errors["details.provider.resourceId"] = "找不到這筆資源，請重新選擇";
    }
  }

  if (!form.consent) errors.consent = "請閱讀並勾選個資保護與保密同意";
  return errors;
}

// 申請資料中只保留所選角色的額外欄位
function roleDetails(role, details = {}) {
  return Object.fromEntries((ROLE_DETAIL_FIELDS[role] ?? []).map((f) => [f.key, text(details[f.key])]));
}

/**
 * 送出註冊申請：帳號狀態為待審核，寄信給申請人與所有系統管理員
 * 已退回的 Email 重新申請時覆蓋原本的申請，保留狀態歷程
 * @returns {{ ok: true, account: object } | { ok: false, errors: Record<string, string> }}
 */
export function submitApplication(form, { now = new Date() } = {}) {
  const errors = validateApplication(form);
  if (Object.keys(errors).length) return { ok: false, errors };

  const email = normalizeEmail(form.email);
  const previous = findUserByEmail(email);
  const at = stamp(now);
  const account = {
    id: previous?.id ?? generateId(),
    name: text(form.name),
    email,
    phone: text(form.phone),
    organization: text(form.organization),
    jobTitle: text(form.jobTitle),
    role: form.role,
    supervisorName: text(form.supervisorName),
    supervisorContact: text(form.supervisorContact),
    reason: text(form.reason),
    details: roleDetails(form.role, form.details?.[form.role]),
    consentAt: at,
    // 註冊時不設密碼：審核通過後寄出設定密碼信
    password: null,
    status: "pending",
    statusReason: null,
    review: null,
    history: [
      ...(previous?.history ?? []),
      { at, action: previous ? "reapply" : "apply", status: "pending", reason: null, actor: { name: text(form.name), email } },
    ],
    createdBy: null,
    createdAt: at,
    updatedAt: at,
  };
  const others = getUsers().filter((u) => normalizeEmail(u.email) !== email);
  saveUsers([...others, account]);

  const roleLabel = getRoleLabel(account.role);
  sendMail({
    to: email,
    type: "application_received",
    subject: "【CareLink】註冊申請已送出",
    body: `${account.name} 您好：\n\n我們已收到您申請「${roleLabel}」帳號的資料，系統管理員審核後會以 Email 通知結果。審核通過後會寄出設定密碼的連結，設定密碼後即可登入。\n\n如非本人申請，請忽略此信。`,
  });
  for (const to of adminEmails()) {
    sendMail({
      to,
      type: "application_new",
      subject: `【CareLink】有新的註冊申請：${account.name}（${roleLabel}）`,
      body: `有一筆新的註冊申請待審核。\n\n姓名：${account.name}\n申請角色：${roleLabel}\n目前任職或服務單位：${account.organization}\n目前單位主管或聯絡人：${account.supervisorName}（${account.supervisorContact}）\n申請時間：${at}`,
      links: [{ label: "前往審核", path: `/admin/accounts?review=${account.id}` }],
    });
  }
  return { ok: true, account: withStatus(account) };
}

// 退回的申請重新申請時帶入原本的資料（密碼除外）；不是已退回的帳號回傳 null
export function getReapplyForm(id) {
  const account = getUsers().find((u) => String(u.id) === String(id));
  if (!account || accountStatusOf(account) !== "rejected") return null;
  const form = createEmptyApplication();
  for (const key of ["name", "email", "phone", "organization", "jobTitle", "role", "supervisorName", "supervisorContact", "reason"]) {
    form[key] = account[key] ?? "";
  }
  if (form.details[account.role]) form.details[account.role] = { ...form.details[account.role], ...account.details };
  return { form, rejectReason: account.statusReason ?? "" };
}

// ── 審核 ──────────────────────────────────────────────────

/**
 * 審核待審核的申請
 * @param {{ decision: "approve"|"reject", methods: string[], methodOther?: string, note?: string, reason?: string, resourceId?: string }} input
 *   methods：確認方式（至少一種；選 other 時需填 methodOther）；退回須填 reason；資源點通過須指定綁定的資源 resourceId
 * @param {{ name: string, email: string }} reviewer
 */
export function reviewAccount(id, input = {}, reviewer = {}, { now = new Date() } = {}) {
  const account = getUsers().find((u) => String(u.id) === String(id));
  if (!account || accountStatusOf(account) !== "pending") return { ok: false, errors: { form: "這筆申請不是待審核狀態" } };

  const errors = {};
  const methods = Array.isArray(input.methods) ? input.methods : [];
  if (!["approve", "reject"].includes(input.decision)) errors.decision = "請選擇通過或退回";
  if (!methods.length) errors.methods = "請選擇至少一種確認方式";
  else if (methods.includes("other") && !text(input.methodOther)) errors.methodOther = "請說明其他確認方式";
  if (input.decision === "reject" && !text(input.reason)) errors.reason = "退回須填寫原因";
  const resourceId = text(input.resourceId || account.details?.resourceId);
  if (input.decision === "approve" && account.role === "provider") {
    if (!resourceId) errors.resourceId = "資源點須選擇要綁定的資源";
    else if (!getResourceById(resourceId)) errors.resourceId = "找不到這筆資源，請重新選擇";
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const at = stamp(now);
  const approve = input.decision === "approve";
  const status = approve ? "active" : "rejected";
  const reason = approve ? null : text(input.reason);
  const review = {
    decision: input.decision,
    methods,
    methodOther: methods.includes("other") ? text(input.methodOther) : "",
    note: text(input.note),
    reason,
    reviewer: actorOf(reviewer),
    at,
    ...(approve && account.role === "provider" ? { resourceId } : {}),
  };
  const updated = updateUser(id, (u) => ({
    ...u,
    status,
    statusReason: reason,
    review,
    ...(approve && u.role === "reader" ? { readerType: u.details?.medicalType ?? "" } : {}),
    ...(approve && u.role === "provider" ? { resourceId } : {}),
    history: [...u.history, { at, action: input.decision, status, reason, actor: actorOf(reviewer) }],
    updatedAt: at,
  }));
  if (approve && updated.role === "provider") writeBinding(updated.email, resourceId);

  const roleLabel = getRoleLabel(updated.role);
  if (approve) {
    const bound = updated.role === "provider" ? `\n綁定的資源：${resourceName(resourceId)}` : "";
    const token = createToken(updated.email, "setup", now);
    sendMail({
      to: updated.email,
      type: "approved",
      subject: "【CareLink】帳號已開通，請設定密碼",
      body: `${updated.name} 您好：\n\n您申請的「${roleLabel}」帳號已審核通過。請在 ${SETUP_TOKEN_DAYS} 天內開啟下方連結設定密碼，設定後即可登入。${bound}\n\n連結逾時可在登入頁使用「忘記密碼」重新取得。`,
      links: [{ label: "設定密碼", path: `/reset-password?token=${token}` }],
    });
  } else {
    sendMail({
      to: updated.email,
      type: "rejected",
      subject: "【CareLink】帳號申請未通過",
      body: `${updated.name} 您好：\n\n您申請的「${roleLabel}」帳號未通過審核。\n\n原因：${reason}\n\n您可以依原因修改申請資料後重新送出。`,
      links: [{ label: "重新申請", path: `/register?reapply=${updated.id}` }],
    });
  }
  return { ok: true, account: updated };
}

// ── 停用與重新啟用 ────────────────────────────────────────

export function suspendAccount(id, { reason } = {}, actor = {}, { now = new Date() } = {}) {
  const account = getUsers().find((u) => String(u.id) === String(id));
  if (!account) return { ok: false, errors: { form: "示範帳號寫在程式中，不能停用" } };
  if (accountStatusOf(account) !== "active") return { ok: false, errors: { form: "只有已啟用的帳號可以停用" } };
  if (normalizeEmail(account.email) === normalizeEmail(actor.email)) {
    return { ok: false, errors: { form: "不能停用自己的帳號" } };
  }
  if (!text(reason)) return { ok: false, errors: { reason: "停用須填寫原因" } };

  const at = stamp(now);
  const updated = updateUser(id, (u) => ({
    ...u,
    status: "suspended",
    statusReason: text(reason),
    history: [...u.history, { at, action: "suspend", status: "suspended", reason: text(reason), actor: actorOf(actor) }],
    updatedAt: at,
  }));
  sendMail({
    to: updated.email,
    type: "suspended",
    subject: "【CareLink】帳號已停用",
    body: `${updated.name} 您好：\n\n您的帳號已停用，停用期間無法登入。\n\n原因：${text(reason)}\n\n如有疑問請聯絡系統管理員。`,
  });
  return { ok: true, account: updated };
}

export function reactivateAccount(id, { note = "" } = {}, actor = {}, { now = new Date() } = {}) {
  const account = getUsers().find((u) => String(u.id) === String(id));
  if (!account || accountStatusOf(account) !== "suspended") {
    return { ok: false, errors: { form: "只有已停用的帳號可以重新啟用" } };
  }
  const at = stamp(now);
  const updated = updateUser(id, (u) => ({
    ...u,
    status: "active",
    statusReason: null,
    history: [...u.history, { at, action: "reactivate", status: "active", reason: text(note) || null, actor: actorOf(actor) }],
    updatedAt: at,
  }));
  sendMail({
    to: updated.email,
    type: "reactivated",
    subject: "【CareLink】帳號已重新啟用",
    body: `${updated.name} 您好：\n\n您的帳號已重新啟用，可以使用原本的密碼登入。`,
    links: [{ label: "前往登入", path: "/login" }],
  });
  return { ok: true, account: updated };
}

// ── 系統管理員建立帳號 ────────────────────────────────────

export function createEmptyAccountForm() {
  return { name: "", email: "", phone: "", organization: "", jobTitle: "", role: "", resourceId: "", medicalType: "" };
}

export function validateAccountForm(form) {
  const errors = {};
  if (!text(form.name)) errors.name = "請填寫姓名";
  if (!text(form.email)) errors.email = "請填寫 Email";
  else if (!isEmail(form.email)) errors.email = "Email 格式不正確";
  else if (emailConflict(form.email, { allowRejected: false })) {
    errors.email = isDemoEmail(form.email) ? "這是示範帳號的 Email" : "此 Email 已有帳號或申請，請從帳號列表處理";
  }
  if (text(form.phone) && !isMobile(form.phone)) errors.phone = "手機格式不正確，例：0900-000-001";
  if (!isValidRole(form.role)) errors.role = "請選擇角色";
  if (form.role === "provider") {
    if (!text(form.resourceId)) errors.resourceId = "資源點須選擇要綁定的資源";
    else if (!getResourceById(form.resourceId)) errors.resourceId = "找不到這筆資源，請重新選擇";
  }
  return errors;
}

/**
 * 系統管理員建立帳號：直接為已啟用，不設密碼，寄出「設定密碼」信（連結與重設密碼頁共用）
 * 可建立全部角色（含系統管理員、資源管理員）；建立系統管理員的再次確認由頁面處理
 */
export function createAccount(form, actor = {}, { now = new Date() } = {}) {
  const errors = validateAccountForm(form);
  if (Object.keys(errors).length) return { ok: false, errors };

  const at = stamp(now);
  const email = normalizeEmail(form.email);
  const account = {
    id: generateId(),
    name: text(form.name),
    email,
    phone: text(form.phone),
    organization: text(form.organization),
    jobTitle: text(form.jobTitle),
    role: form.role,
    supervisorName: "",
    supervisorContact: "",
    reason: "",
    details: {},
    consentAt: null,
    password: null,
    status: "active",
    statusReason: null,
    review: null,
    ...(form.role === "reader" && text(form.medicalType) ? { readerType: text(form.medicalType) } : {}),
    ...(form.role === "provider" ? { resourceId: text(form.resourceId) } : {}),
    history: [{ at, action: "create", status: "active", reason: null, actor: actorOf(actor) }],
    createdBy: actorOf(actor),
    createdAt: at,
    updatedAt: at,
  };
  saveUsers([...getUsers(), account]);
  if (form.role === "provider") writeBinding(email, form.resourceId);

  const token = createToken(email, "setup", now);
  const mail = sendMail({
    to: email,
    type: "account_created",
    subject: "【CareLink】您的帳號已建立，請設定密碼",
    body: `${account.name} 您好：\n\n系統管理員已為您建立「${getRoleLabel(account.role)}」帳號。請在 ${SETUP_TOKEN_DAYS} 天內開啟下方連結設定密碼，設定後即可登入。\n\n連結逾時可在登入頁使用「忘記密碼」重新取得。`,
    links: [{ label: "設定密碼", path: `/reset-password?token=${token}` }],
  });
  return { ok: true, account: withStatus(account), mail };
}

// ── 設定與重設密碼 ────────────────────────────────────────

const readTokens = () => readAccountList(TOKENS_KEY);

// 有效時間：設定密碼（審核通過、建立帳號）SETUP_TOKEN_DAYS 天；重設密碼（忘記密碼）RESET_TOKEN_MINUTES 分鐘
const tokenLifetime = (purpose) =>
  purpose === "setup" ? SETUP_TOKEN_DAYS * 24 * 60 * 60_000 : RESET_TOKEN_MINUTES * 60_000;

function createToken(email, purpose, now) {
  const token = generateId();
  writeAccountList(TOKENS_KEY, [
    ...readTokens(),
    {
      token,
      email: normalizeEmail(email),
      purpose,
      createdAt: now.getTime(),
      expiresAt: now.getTime() + tokenLifetime(purpose),
      usedAt: null,
    },
  ]);
  return token;
}

/**
 * 忘記密碼：只對已啟用的註冊帳號寄出重設密碼信；示範帳號的密碼寫在程式中，不寄
 * 不論 Email 是否存在都回傳相同結果，避免透露哪些 Email 有帳號
 */
export function requestPasswordReset(email, { now = new Date() } = {}) {
  const account = findUserByEmail(email);
  if (account && accountStatusOf(account) === "active") {
    const token = createToken(account.email, "reset", now);
    sendMail({
      to: account.email,
      type: "password_reset",
      subject: "【CareLink】重設密碼",
      body: `${account.name} 您好：\n\n我們收到重設密碼的要求。請在 ${RESET_TOKEN_MINUTES} 分鐘內開啟下方連結設定新密碼，連結只能使用一次。\n\n如果不是您本人操作，請忽略此信，原本的密碼仍然有效。`,
      links: [{ label: "重設密碼", path: `/reset-password?token=${token}` }],
    });
  }
  return { ok: true, message: "若此 Email 已註冊，我們已寄出重設密碼信，請到信箱查看。" };
}

// 檢查連結：不存在、已使用、已過期都不能用
export function checkResetToken(token, { now = new Date() } = {}) {
  const entry = readTokens().find((t) => t.token === token);
  if (!entry) return { ok: false, error: `連結無效，${FORGOT_PASSWORD_HINT}` };
  if (entry.usedAt) return { ok: false, error: `此連結已使用過，如需設定新密碼，${FORGOT_PASSWORD_HINT}` };
  if (now.getTime() > entry.expiresAt) return { ok: false, error: `連結已過期，${FORGOT_PASSWORD_HINT}` };
  const account = findUserByEmail(entry.email);
  if (!account || accountStatusOf(account) !== "active") return { ok: false, error: "此帳號目前無法設定密碼，請聯絡系統管理員" };
  return { ok: true, email: entry.email, purpose: entry.purpose, name: account.name };
}

// 設定新密碼：成功後這個帳號所有未使用的連結都失效
export function resetPassword(token, password, passwordConfirm, { now = new Date() } = {}) {
  const check = checkResetToken(token, { now });
  if (!check.ok) return check;
  const passwordError = checkPassword(password, passwordConfirm);
  if (passwordError) return { ok: false, error: passwordError };

  const users = getUsers();
  const index = users.findIndex((u) => normalizeEmail(u.email) === check.email);
  users[index] = { ...users[index], password, updatedAt: stamp(now) };
  saveUsers(users);
  writeAccountList(
    TOKENS_KEY,
    readTokens().map((t) => (t.email === check.email && !t.usedAt ? { ...t, usedAt: now.getTime() } : t))
  );
  return { ok: true, email: check.email, purpose: check.purpose };
}
