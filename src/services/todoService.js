// 待辦（doc/specs/assessment-schema.md 第七節）：每次依今天日期即時計算，不另外儲存
// 純計算：資料由呼叫端傳入（預設讀取各 service），方便測試指定日期

import { FIRST_CONTACT_HOURS, PROVIDER_REPORT_DAYS } from "../config/assessmentRules.js";
import { getAllAssessments, isActiveAssessment } from "./assessmentService.js";
import { getAllCases, getNextFollowUp, isFirstContactOverdue, isFollowUpDue } from "./caseService.js";
import { getAllResources, isVerifyOverdue } from "./resourceService.js";
import { getPendingApplications } from "./accountService.js";
import { getRoleLabel } from "../config/roles.js";
import { addDays, daysBetween, formatDate, todayString, toDateString } from "../utils/date.js";

export const AUDIENCES = [
  { code: "reader", label: "判讀人員" },
  { code: "manager", label: "健康管理員" },
  { code: "admin", label: "管理員" },
];

export const TODO_TYPES = [
  { code: "unreviewed", label: "尚未判讀", audience: "reader" },
  { code: "first_contact_overdue", label: "逾期未聯繫", audience: "manager" },
  { code: "follow_up_due", label: "追蹤到期", audience: "manager" },
  { code: "provider_unreported", label: "資源點未回報", audience: "manager" },
  { code: "yellow_recheck", label: "黃燈三個月確認", audience: "reader" },
  { code: "green_reassess", label: "綠燈年度重評", audience: "reader" },
  { code: "orange_reserved", label: "橘燈保留再確認", audience: "reader" },
  { code: "resource_verify", label: "資源待驗證", audience: "admin" },
  // 只有系統管理員（account.manage）看得到；資源管理員雖然也屬於「管理員」，但不會列出
  { code: "account_review", label: "待審核帳號", audience: "admin", permission: "account.manage" },
];

const TYPE_BY_CODE = Object.fromEntries(TODO_TYPES.map((t) => [t.code, t]));

/**
 * @typedef {object} Todo
 * @property {string} type        TODO_TYPES 的 code
 * @property {string} typeLabel
 * @property {string} audience    給誰：reader、manager、admin
 * @property {string} name        對象姓名（資源為資源名稱）
 * @property {string} code        對象編碼（Ast／Case／Res）
 * @property {string|null} dueDate  到期日；橘燈保留「下次來院時」沒有日期
 * @property {number|null} overdueDays  今天減到期日的天數：大於 0 為逾期，0 為今天到期
 * @property {string} detail      補充說明
 * @property {string} link        前往的頁面
 * @property {string} [permission] 需要的權限（沒有權限的角色不列出）
 * @property {string} [dateText]   沒有到期日時顯示的時間說明（例：申請時間）
 */

function makeTodo(type, fields, today) {
  const dueDate = fields.dueDate ?? null;
  return {
    type,
    typeLabel: TYPE_BY_CODE[type].label,
    audience: TYPE_BY_CODE[type].audience,
    ...(TYPE_BY_CODE[type].permission ? { permission: TYPE_BY_CODE[type].permission } : {}),
    overdueDays: dueDate ? daysBetween(dueDate, today) : null,
    ...fields,
    dueDate,
  };
}

// 開案時間 + FIRST_CONTACT_HOURS 小時的日期
function firstContactDueDate(createdAt) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  return formatDate(new Date(created.getTime() + FIRST_CONTACT_HOURS * 3_600_000));
}

// 橘燈保留：只看同一位民眾最新的一筆（已有後續評估的舊紀錄不列出）
function latestInChain(assessments) {
  const superseded = new Set(assessments.map((a) => String(a.previousAssessmentId ?? "")).filter(Boolean));
  return (a) => !superseded.has(String(a.id));
}

/**
 * 計算全部待辦，逾期最多的排最前面，沒有日期的（橘燈保留下次來院時）排最後
 * @returns {Todo[]}
 */
export function computeTodos({
  today = todayString(),
  now = new Date(),
  assessments = getAllAssessments(),
  cases = getAllCases(),
  resources = getAllResources(),
  applications = getPendingApplications(),
} = {}) {
  const todos = [];
  const activeAssessments = assessments.filter(isActiveAssessment);
  const isLatest = latestInChain(activeAssessments);
  const openCases = cases.filter((c) => c.stage !== "closed");

  // ── 評估紀錄（判讀人員）──
  for (const a of activeAssessments) {
    const base = { name: a.person?.name || "未填姓名", code: a.code, link: `/assessments/${a.id}` };
    const light = a.review?.light;

    if (a.status === "filled") {
      todos.push(makeTodo("unreviewed", { ...base, dueDate: a.filledAt, detail: `填表日期 ${a.filledAt}` }, today));
      continue;
    }
    if (a.status !== "reviewed" || !isLatest(a)) continue;

    if (light === "yellow" && a.nextCheckAt && a.nextCheckAt <= today) {
      todos.push(
        makeTodo("yellow_recheck", { ...base, dueDate: a.nextCheckAt, detail: "確認是否前往提供的資源；未前往且需求仍在時改判橘燈" }, today)
      );
    }
    if (light === "green" && a.nextCheckAt && a.nextCheckAt <= today) {
      todos.push(makeTodo("green_reassess", { ...base, dueDate: a.nextCheckAt, detail: "提醒民眾重新填寫評估表" }, today));
    }
    if (light === "orange" && a.review.orangeType === "reserved") {
      // 一般為「下次來院時」（沒有日期）；連續婉拒達上限後延長為固定日期
      if (!a.nextCheckAt || a.nextCheckAt <= today) {
        todos.push(
          makeTodo(
            "orange_reserved",
            {
              ...base,
              dueDate: a.nextCheckAt,
              detail: `民眾再次來院時再詢問意願（已婉拒 ${a.declineCount || 1} 次${a.review.declineReason ? `：${a.review.declineReason}` : ""}）`,
            },
            today
          )
        );
      }
    }
  }

  // ── 個案（健康管理員）──
  for (const c of openCases) {
    const base = { name: c.person?.name || "未命名個案", code: c.code, link: `/case/${c.id}` };

    if (isFirstContactOverdue(c, now)) {
      todos.push(
        makeTodo(
          "first_contact_overdue",
          { ...base, dueDate: firstContactDueDate(c.createdAt), detail: `開案 ${toDateString(c.createdAt)}，超過 ${FIRST_CONTACT_HOURS} 小時尚未首次聯繫` },
          today
        )
      );
    }

    if (isFollowUpDue(c, today)) {
      const next = getNextFollowUp(c);
      todos.push(makeTodo("follow_up_due", { ...base, dueDate: next.plannedAt, detail: `${next.round} 個月追蹤` }, today));
    }

    const latest = c.linkages.at(-1);
    if (latest?.status === "pending" && latest.linkedAt) {
      const dueDate = addDays(latest.linkedAt, PROVIDER_REPORT_DAYS);
      if (dueDate <= today) {
        todos.push(
          makeTodo(
            "provider_unreported",
            { ...base, dueDate, detail: `${latest.resourceName || "資源"}於 ${latest.linkedAt} 轉介後超過 ${PROVIDER_REPORT_DAYS} 天未回報` },
            today
          )
        );
      }
    }
  }

  // ── 資源（管理員）── 已終止的資源不需驗證
  for (const r of resources) {
    if (r.status === "terminated" || !isVerifyOverdue(r, today)) continue;
    todos.push(
      makeTodo(
        "resource_verify",
        { name: r.name || "未命名資源", code: r.code || "", link: `/resources/${r.id}`, dueDate: r.nextVerifyAt, detail: `預計驗證日期 ${r.nextVerifyAt}` },
        today
      )
    );
  }

  // ── 帳號（系統管理員）── 待審核的註冊申請，先申請的在前；沒有到期日，排在有日期的項目之後
  for (const a of applications) {
    todos.push(
      makeTodo(
        "account_review",
        {
          name: a.name || "未填姓名",
          code: a.email,
          link: `/accounts?review=${a.id}`,
          dateText: `申請時間 ${a.createdAt ?? "—"}`,
          detail: [`申請角色：${getRoleLabel(a.role)}`, a.organization].filter(Boolean).join("｜"),
        },
        today
      )
    );
  }

  return todos.sort((a, b) => {
    if (a.overdueDays === null || b.overdueDays === null) {
      if (a.overdueDays === b.overdueDays) return 0;
      return a.overdueDays === null ? 1 : -1;
    }
    return b.overdueDays - a.overdueDays;
  });
}

// 首頁徽章：逾期（到期日已過）的項目數
export const countOverdue = (todos) => todos.filter((t) => (t.overdueDays ?? 0) > 0).length;
