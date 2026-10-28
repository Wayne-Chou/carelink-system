// 個案資料層（doc/specs/assessment-schema.md 第六節）
// 比照資源的做法：讀取時把舊格式在記憶體中轉成新格式，只有呼叫寫入函式時才整份寫回「cases」（經 storage.js）
//
// 注意：CaseList、CaseDetail、ResourceDashboard 目前仍直接讀寫舊格式，
// 步驟 3 改寫這些頁面之前，頁面不應呼叫本檔的寫入函式，以免新格式讓舊頁面顯示錯誤。

import {
  CASE_OPENING_ORANGE_TYPES,
  FIRST_CONTACT_HOURS,
  FOLLOW_UP_MONTHS,
  FOLLOW_UP_START,
} from "../config/assessmentRules.js";
import {
  IMPACT_OPTIONS,
  LINKAGE_STATUS_OPTIONS,
  STAGE_OPTIONS,
  caseLabel,
} from "../config/caseLabels.js";
import { Q11_OPTIONS } from "../config/needMapping.js";
import { getResourceById } from "./resourceService.js";
import { readList, writeList } from "./storage.js";
import { addMonths, hoursBetween, nowDateTime, todayString, toDateString } from "../utils/date.js";
import { generateId } from "../utils/id.js";
import { storeNationalId } from "../utils/nationalId.js";
import { deepMerge, fillDefaults, isPlainObject } from "../utils/object.js";
import { isValidCode, nextCode } from "../utils/sequenceCode.js";

const STORAGE_KEY = "cases";
const CODE_PREFIX = "Case";

export const CASE_STAGES = [1, 2, 3, 4, 5, "closed"];
export const STAGE_LABELS = Object.fromEntries(STAGE_OPTIONS.map((o) => [o.code, o.label]));

// 待確認事項：「第 1 階段的轉介來源除了評估表，是否也要支援守望員轉介與民眾自我轉介？」
// 目前 createCase 三種來源都支援；只有 medical 會帶入 assessmentId
export const REFERRER_TYPES = ["medical", "watcher", "self"];
export const LINKAGE_STATUSES = ["pending", "success", "failed"];
export const CLOSURE_REASONS = ["goal_met", "integrated", "withdrew", "other"];

// ── 預設值 ────────────────────────────────────────────────

export function createEmptyCase() {
  return {
    id: null,
    code: null,
    stage: 1,
    // 待確認事項：「個案要不要指派到特定健康管理員？」目前沒有管理員名冊，只記錄姓名文字
    managerName: "",
    createdAt: null,
    updatedAt: null,
    person: { name: "", nationalId: "", phone: "", livingAlone: false },
    referral: {
      referrerType: "",
      referrerName: "",
      assessmentId: null,
      assessmentCode: null,
      reason: "",
      consent: false,
      consentAt: null,
    },
    consultation: { firstContactAt: null, whatMatters: "", needTags: [], goals: [], note: "" },
    linkages: [],
    followUps: [],
    closure: {
      reason: "",
      closedAt: null,
      // 待確認事項：「結案時『轉回醫療端執行結案評估』是否需要醫療端在系統內確認？」
      // 目前只記錄是否已轉回（布林值），不需醫療端在系統內確認
      returnedToMedical: false,
      reentryExplained: false,
      // 規格外補充欄位：結案說明（舊個案的結案原因與成果文字也放這裡）
      note: "",
    },
    history: [],
  };
}

function normalizeCase(raw) {
  const filled = fillDefaults(raw, createEmptyCase());
  filled.stage = CASE_STAGES.includes(filled.stage) ? filled.stage : 1;
  if (filled.id !== null && filled.id !== undefined) filled.id = String(filled.id);
  return filled;
}

// 歷程紀錄：沿用現有的 stage、date、note，另加 at（時間）、actor（操作者）、action（動作）
function historyEntry(stage, action, note, actor = "") {
  return { stage, date: todayString(), at: nowDateTime(), actor, action, note };
}

// ── 舊個案轉換 ────────────────────────────────────────────
// 舊格式來自目前的 CaseList／CaseDetail：basic、單一 linkage、tracking、stage 1–6

const LEGACY_SOURCE = { 醫療: "medical", 社區: "watcher", 自主: "self" };
const LEGACY_LINK_STATUS = { 成功: "success", 失敗: "failed", 中斷: "failed" };
const LEGACY_ATTENDANCE = { 出席: "attended", 未出席: "absent" };
const LEGACY_IMPACT = { 改善: "improved", 無變化: "same", 惡化: "worse" };
const LEGACY_CLOSURE = { 目標達成: "goal_met", 達成目標: "goal_met", 自主融入: "integrated", 主動退出: "withdrew" };
const ROLE_PREFIX = /^\[(.+?)\]\s*/;

const isLegacyCase = (raw) => !Array.isArray(raw.linkages) || "basic" in raw || "linkage" in raw;

function convertLegacyCase(raw) {
  const basic = raw.basic || {};
  const consultation = raw.consultation || {};
  const linkage = raw.linkage || {};
  const history = Array.isArray(raw.history) ? raw.history : [];
  const stage = raw.stage === 6 ? "closed" : CASE_STAGES.includes(raw.stage) ? raw.stage : 1;
  const reachedConsultation = stage === "closed" || stage >= 2;

  const linkNote = [...history].reverse().find((h) => String(h?.note ?? "").includes("連結資源"));
  const firstConsultation = history.find((h) => h?.stage === 2);

  const linkages = [];
  const resourceId = linkage.resourceId ?? raw.resourceId ?? null;
  if (resourceId !== null && resourceId !== "") {
    linkages.push({
      resourceId: String(resourceId),
      resourceName: linkage.resourceName || "",
      reason: linkage.reason || "",
      linkedAt: linkNote?.date ?? null,
      escortNeeded: String(linkNote?.note ?? "").includes("陪同"),
      status: LEGACY_LINK_STATUS[linkage.status] ?? "pending",
      attendance: null,
      providerNote: linkage.status === "中斷" ? "資源端回報：中斷" : "",
    });
  }

  const followUps = (Array.isArray(raw.tracking) ? raw.tracking : []).map((t, i) => ({
    round: FOLLOW_UP_MONTHS[i] ?? null,
    plannedAt: t.date ?? null,
    doneAt: t.date ?? null,
    attendance: LEGACY_ATTENDANCE[t.status] ?? null,
    participation: t.status === "出席" ? "success" : t.status === "未出席" ? "failed" : null,
    impact: LEGACY_IMPACT[t.effect] ?? null,
    note: t.note || "",
  }));

  const closureText = [raw.closure?.reason, raw.closure?.outcome].filter(Boolean).join("｜");

  return normalizeCase({
    id: raw.id,
    code: raw.code ?? null,
    stage,
    managerName: "",
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? null,
    person: {
      name: basic.name || raw.name || "",
      nationalId: "",
      phone: "",
      livingAlone: (basic.identity || []).includes("獨居長者"),
    },
    referral: {
      referrerType: LEGACY_SOURCE[basic.source] ?? "",
      referrerName: "",
      assessmentId: null,
      assessmentCode: null,
      reason: basic.problem || "",
      // 舊個案已進入諮詢以後的階段，視為已取得同意
      consent: reachedConsultation,
      consentAt: null,
    },
    consultation: {
      firstContactAt: reachedConsultation ? firstConsultation?.date ?? raw.createdAt ?? null : null,
      whatMatters: "",
      needTags: [],
      goals: consultation.goal ? [consultation.goal] : [],
      note: [
        consultation.note,
        consultation.needLevel && `需求程度：${consultation.needLevel}`,
        consultation.motivation && `參與動機：${consultation.motivation}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    linkages,
    followUps,
    closure: {
      reason: closureText ? LEGACY_CLOSURE[raw.closure?.reason] ?? "other" : "",
      closedAt: stage === "closed" ? history.at(-1)?.date ?? null : null,
      returnedToMedical: false,
      reentryExplained: false,
      note: closureText,
    },
    history: history.map((h) => {
      const note = String(h?.note ?? "");
      const role = ROLE_PREFIX.exec(note);
      return {
        stage: h?.stage ?? null,
        date: h?.date ?? null,
        at: null,
        actor: role ? role[1] : "",
        action: "legacy",
        note: note.replace(ROLE_PREFIX, ""),
      };
    }),
    // 規格外補充欄位：新架構沒有對應位置的舊欄位，保留避免資料遺失
    legacy: {
      age: basic.age ?? "",
      gender: basic.gender ?? "",
      identity: Array.isArray(basic.identity) ? basic.identity : [],
      source: basic.source ?? "",
      needLevel: consultation.needLevel ?? "",
      motivation: consultation.motivation ?? "",
    },
  });
}

// ── 讀取 ──────────────────────────────────────────────────

// 讀取時轉換舊格式，並替沒有編碼的個案依序補上 Case 流水號（只在記憶體中，寫入時才存回）
export function getAllCases() {
  const cases = readList(STORAGE_KEY)
    .filter(isPlainObject)
    .map((raw) => (isLegacyCase(raw) ? convertLegacyCase(raw) : normalizeCase(raw)));
  for (const item of cases) {
    if (!isValidCode(CODE_PREFIX, item.code)) item.code = nextCode(CODE_PREFIX, cases);
  }
  return cases;
}

export function getCaseById(id) {
  return getAllCases().find((c) => String(c.id) === String(id)) ?? null;
}

const writeAll = (cases) => writeList(STORAGE_KEY, cases);

function replaceCase(cases, updated) {
  const next = cases.map((c) => (String(c.id) === String(updated.id) ? updated : c));
  writeAll(next);
  return updated;
}

// ── 新增與修改 ────────────────────────────────────────────

export function createCase(data = {}, { actor = "" } = {}) {
  const cases = getAllCases();
  const now = nowDateTime();
  const base = normalizeCase(deepMerge(createEmptyCase(), data));
  const created = {
    ...base,
    id: generateId(),
    code: nextCode(CODE_PREFIX, cases),
    createdAt: now,
    updatedAt: now,
    person: { ...base.person, nationalId: storeNationalId(base.person.nationalId) },
    history: [...base.history, historyEntry(base.stage, "create", "建立個案", actor)],
  };
  writeAll([...cases, created]);
  return created;
}

// 深層合併：物件逐層合併、陣列整個替換；id、code、createdAt 不可修改
export function updateCase(id, patch = {}) {
  const cases = getAllCases();
  const current = cases.find((c) => String(c.id) === String(id));
  if (!current) return null;
  const merged = normalizeCase(deepMerge(current, patch));
  const updated = {
    ...merged,
    id: current.id,
    code: current.code,
    createdAt: current.createdAt,
    updatedAt: nowDateTime(),
  };
  if (patch.person?.nationalId !== undefined) {
    updated.person = { ...updated.person, nationalId: storeNationalId(patch.person.nationalId) };
  }
  return replaceCase(cases, updated);
}

// 在現有資料上套用變更並附加一筆歷程
function mutate(id, fn, history) {
  const current = getCaseById(id);
  if (!current) return null;
  const draft = structuredClone(current);
  fn(draft);
  if (history) draft.history = [...draft.history, history(draft)];
  return updateCase(id, draft);
}

// ── 階段推進 ──────────────────────────────────────────────

const isFilled = (v) => String(v ?? "").trim() !== "";
const latestLinkage = (c) => c.linkages.at(-1) ?? null;

/**
 * 檢查能否進入下一階段（第六節階段推進規則）
 * @returns {{ ok: boolean, nextStage: number|string|null, reasons: string[] }}
 */
export function checkAdvance(caseItem) {
  const c = normalizeCase(caseItem || {});
  const reasons = [];
  switch (c.stage) {
    case 1:
      if (c.referral.consent !== true) reasons.push("需取得民眾同意轉介");
      return { ok: !reasons.length, nextStage: 2, reasons };
    case 2:
      if (!isFilled(c.consultation.whatMatters)) reasons.push("需填寫「對我而言什麼最重要」");
      if (!c.consultation.goals.some(isFilled)) reasons.push("需至少設定一個目標");
      return { ok: !reasons.length, nextStage: 3, reasons };
    case 3:
      if (latestLinkage(c)?.status !== "success") reasons.push("最新一筆連結的狀態需為成功");
      return { ok: !reasons.length, nextStage: 4, reasons };
    case 4:
      // 規格未訂進入結案階段的條件
      return { ok: true, nextStage: 5, reasons };
    case 5:
      if (!isFilled(c.closure.reason)) reasons.push("需填寫結案原因");
      if (c.closure.reentryExplained !== true) reasons.push("需勾選已說明再入口機制");
      return { ok: !reasons.length, nextStage: "closed", reasons };
    default:
      return { ok: false, nextStage: null, reasons: ["個案已結案"] };
  }
}

export function advanceStage(id, { actor = "" } = {}) {
  const current = getCaseById(id);
  if (!current) return { ok: false, reasons: ["找不到個案"] };
  const check = checkAdvance(current);
  if (!check.ok) return { ok: false, reasons: check.reasons };
  const updated = mutate(
    id,
    (c) => {
      c.stage = check.nextStage;
      if (check.nextStage === "closed") c.closure.closedAt = todayString();
    },
    () => historyEntry(check.nextStage, "advance", `進入「${STAGE_LABELS[check.nextStage]}」`, actor)
  );
  return { ok: true, case: updated };
}

// 退回第 2 階段重新評估（連結失敗或追蹤惡化時由頁面詢問後呼叫）
export function returnToConsultation(id, { actor = "", note = "退回諮詢階段重新評估" } = {}) {
  return mutate(
    id,
    (c) => {
      c.stage = 2;
    },
    () => historyEntry(2, "return_to_consultation", note, actor)
  );
}

export function recordFirstContact(id, { at = nowDateTime(), actor = "" } = {}) {
  return mutate(
    id,
    (c) => {
      c.consultation.firstContactAt = at;
    },
    (c) => historyEntry(c.stage, "first_contact", "首次聯繫", actor)
  );
}

// ── 連結與追蹤 ────────────────────────────────────────────

// 待確認事項：「追蹤 1、3、6 個月是從『連結成功』起算，還是從『開案』起算？」→ FOLLOW_UP_START
function buildFollowUps(baseDate) {
  return FOLLOW_UP_MONTHS.map((months) => ({
    round: months,
    plannedAt: addMonths(baseDate, months),
    doneAt: null,
    attendance: null,
    participation: null,
    impact: null,
    note: "",
  }));
}

// 重新排程：保留已完成的追蹤，未完成的以新排程取代
function rescheduleFollowUps(c, baseDate) {
  c.followUps = [...c.followUps.filter((f) => f.doneAt), ...buildFollowUps(baseDate)];
}

/**
 * 建立連結：記下資源名稱快照，狀態 pending，並依 FOLLOW_UP_START 產生 1、3、6 個月追蹤排程
 * escortNeeded 未指定時，資源為黃燈即視為需陪同
 */
export function addLinkage(id, { resourceId, reason = "", escortNeeded } = {}, { actor = "" } = {}) {
  const resource = getResourceById(resourceId);
  const linkedAt = todayString();
  const linkage = {
    resourceId: String(resourceId),
    resourceName: resource?.name ?? "",
    reason,
    linkedAt,
    escortNeeded: escortNeeded ?? resource?.riskLevel === "yellow",
    status: "pending",
    attendance: null,
    providerNote: "",
  };
  return mutate(
    id,
    (c) => {
      c.linkages = [...c.linkages, linkage];
      if (FOLLOW_UP_START === "linked") rescheduleFollowUps(c, linkedAt);
      if (FOLLOW_UP_START === "opened") rescheduleFollowUps(c, toDateString(c.createdAt) || linkedAt);
    },
    () =>
      historyEntry(
        3,
        "link",
        `連結資源：${linkage.resourceName || "未知資源"}${linkage.escortNeeded ? "（需健康管理員陪同至少一次）" : ""}`,
        actor
      )
  );
}

/**
 * 更新連結狀態（資源點回報），預設更新最新一筆
 * @returns {{ case: object, suggestReturnToConsultation: boolean } | null}
 *   狀態為 failed 時建議退回第 2 階段，由頁面詢問後再呼叫 returnToConsultation
 */
export function updateLinkageStatus(id, { index, status, attendance, providerNote } = {}, { actor = "" } = {}) {
  const updated = mutate(
    id,
    (c) => {
      const i = index ?? c.linkages.length - 1;
      if (!c.linkages[i]) return;
      c.linkages[i] = {
        ...c.linkages[i],
        ...(status !== undefined && { status }),
        ...(attendance !== undefined && { attendance }),
        ...(providerNote !== undefined && { providerNote }),
      };
      if (status === "success" && FOLLOW_UP_START === "success") rescheduleFollowUps(c, todayString());
    },
    (c) => historyEntry(c.stage, "linkage_status", `連結狀態更新：${caseLabel(LINKAGE_STATUS_OPTIONS, status) || "（未變更）"}${providerNote ? `｜${providerNote}` : ""}`, actor)
  );
  return updated ? { case: updated, suggestReturnToConsultation: status === "failed" } : null;
}

/**
 * 記錄一次追蹤；依 round（1、3、6）找排程，找不到時新增一筆
 * @returns {{ case: object, suggestReturnToConsultation: boolean } | null}
 *   impact 為 worse 時建議退回第 2 階段
 */
export function recordFollowUp(id, round, result = {}, { actor = "" } = {}) {
  const entry = {
    doneAt: result.doneAt ?? todayString(),
    attendance: result.attendance ?? null,
    participation: result.participation ?? null,
    impact: result.impact ?? null,
    note: result.note ?? "",
  };
  const updated = mutate(
    id,
    (c) => {
      const i = c.followUps.findIndex((f) => f.round === round && !f.doneAt);
      if (i >= 0) c.followUps[i] = { ...c.followUps[i], ...entry };
      else c.followUps.push({ round, plannedAt: null, ...entry });
    },
    (c) => historyEntry(c.stage, "follow_up", `${round} 個月追蹤：${caseLabel(IMPACT_OPTIONS, entry.impact) || "未評估"}${entry.note ? `｜${entry.note}` : ""}`, actor)
  );
  return updated ? { case: updated, suggestReturnToConsultation: entry.impact === "worse" } : null;
}

// 結案：需在第 5 階段，填寫原因並勾選已說明再入口機制
export function closeCase(id, closure = {}, { actor = "" } = {}) {
  const current = getCaseById(id);
  if (!current) return { ok: false, reasons: ["找不到個案"] };
  if (current.stage !== 5) return { ok: false, reasons: ["需先進入第 5 階段（結案）"] };
  const draft = { ...current, closure: { ...current.closure, ...closure } };
  const check = checkAdvance(draft);
  if (!check.ok) return { ok: false, reasons: check.reasons };
  updateCase(id, { closure: draft.closure });
  return advanceStage(id, { actor });
}

/**
 * 資源端後台：轉介到某資源的個案
 * 每個個案取「最新一筆連到此資源的連結」，且這筆是個案的最新連結或仍待回報
 * （個案已改連其他資源、且這筆已回報的舊紀錄不列出）
 * 待回報的排前面，其餘依轉介日由新到舊
 * @returns {{ key: string, caseItem: object, linkage: object, index: number }[]}  index 為連結在 linkages 中的位置
 */
export function getReferralsForResource(resourceId, cases = getAllCases()) {
  const id = String(resourceId);
  return cases
    .map((caseItem) => {
      const index = caseItem.linkages.map((l) => String(l.resourceId)).lastIndexOf(id);
      if (index === -1) return null;
      const linkage = caseItem.linkages[index];
      const isLatest = index === caseItem.linkages.length - 1;
      if (!isLatest && linkage.status !== "pending") return null;
      return { key: `${caseItem.id}-${index}`, caseItem, linkage, index };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ap = a.linkage.status === "pending";
      const bp = b.linkage.status === "pending";
      if (ap !== bp) return ap ? -1 : 1;
      return String(b.linkage.linkedAt || "").localeCompare(String(a.linkage.linkedAt || ""));
    });
}

/**
 * 能否刪除：只有「第 1 階段、沒有任何連結與追蹤紀錄、不是由評估開案」的個案可以刪除（例如誤建）
 * 其他個案一律改用結案，保留處置紀錄
 * @returns {{ ok: boolean, reason: string }}
 */
export function canDeleteCase(caseItem) {
  if (!caseItem) return { ok: false, reason: "找不到個案" };
  const c = normalizeCase(caseItem);
  if (c.referral.assessmentId) {
    return { ok: false, reason: `由評估 ${c.referral.assessmentCode || ""} 開案的個案不能刪除，請改用結案` };
  }
  if (c.stage !== 1 || c.linkages.length || c.followUps.length) {
    return { ok: false, reason: "已進入處置流程的個案不能刪除，請改用結案；只有第 1 階段、沒有連結與追蹤紀錄的個案可以刪除" };
  }
  return { ok: true, reason: "" };
}

export function deleteCase(id) {
  const cases = getAllCases();
  const target = cases.find((c) => String(c.id) === String(id));
  const check = canDeleteCase(target);
  if (!check.ok) return check;
  writeAll(cases.filter((c) => String(c.id) !== String(id)));
  return { ok: true, reason: "" };
}

// ── 追蹤到期狀態 ──────────────────────────────────────────

/**
 * 追蹤排程的狀態（待辦「追蹤到期」：plannedAt 已到且沒有 doneAt）
 * @returns {"done" | "due" | "upcoming" | "unscheduled"}
 */
export function getFollowUpStatus(followUp, today = todayString()) {
  if (followUp?.doneAt) return "done";
  if (!followUp?.plannedAt) return "unscheduled";
  return followUp.plannedAt <= today ? "due" : "upcoming";
}

// 最近一筆尚未完成的追蹤（依排程日期）；已結案的個案不再追蹤，回傳 null
export function getNextFollowUp(caseItem) {
  const c = normalizeCase(caseItem || {});
  if (c.stage === "closed") return null;
  return (
    c.followUps
      .filter((f) => !f.doneAt && f.plannedAt)
      .sort((a, b) => a.plannedAt.localeCompare(b.plannedAt))[0] ?? null
  );
}

// 追蹤到期（待辦「追蹤到期」）：只有第 4 階段的個案才需要填寫追蹤；
// 第 3 階段的排程尚未生效（連結成功、進入追蹤後才能填寫），不列為到期
export function isFollowUpDue(caseItem, today = todayString()) {
  const c = normalizeCase(caseItem || {});
  if (c.stage !== 4) return false;
  return getFollowUpStatus(getNextFollowUp(c), today) === "due";
}

// 開案超過 FIRST_CONTACT_HOURS 小時仍未首次聯繫（待辦「逾期未聯繫」）
export function isFirstContactOverdue(caseItem, now = new Date()) {
  const c = normalizeCase(caseItem || {});
  if (c.stage === "closed" || c.consultation.firstContactAt || !c.createdAt) return false;
  const hours = hoursBetween(c.createdAt, now);
  return hours !== null && hours > FIRST_CONTACT_HOURS;
}

// ── 從評估開案（第五節）────────────────────────────────────

const q11Label = (code) => Q11_OPTIONS.find((o) => o.code === code)?.label ?? code;

/**
 * 橘燈轉介或退縮：建立個案並帶入評估編碼、確認的需求標籤與 Q12 內容，直接進入第 2 階段
 * 只建立個案，不回寫評估紀錄；回寫 caseId 由 assessmentService.openCaseForAssessment 處理
 * @returns {{ ok: true, case: object } | { ok: false, reasons: string[] }}
 */
export function openCaseFromAssessment(assessment, { managerName = "", actor = "" } = {}) {
  const review = assessment?.review || {};
  const reasons = [];
  if (review.light !== "orange" || !CASE_OPENING_ORANGE_TYPES.includes(review.orangeType)) {
    reasons.push("只有橘燈轉介或退縮會開案");
  }
  if (review.consent !== true) reasons.push("需取得民眾同意轉介");
  if (reasons.length) return { ok: false, reasons };

  const typeLabel = review.orangeType === "refer" ? "轉介" : "退縮";
  const q11 = (assessment.answers?.q11 || []).filter((c) => c !== "q11_none").map(q11Label);
  const q12Lines = [
    assessment.answers?.q12 && `Q12 民眾填寫：${assessment.answers.q12}`,
    review.q12Note && `Q12 談話紀錄：${review.q12Note}`,
  ].filter(Boolean);

  const created = createCase(
    {
      stage: 2,
      managerName,
      person: { name: assessment.person?.name ?? "", nationalId: assessment.person?.nationalId ?? "" },
      referral: {
        referrerType: "medical",
        referrerName: review.readerName ?? "",
        assessmentId: assessment.id ?? null,
        assessmentCode: assessment.code ?? null,
        reason: `生活近況評估 ${assessment.code ?? ""}：橘燈（${typeLabel}）${q11.length ? `；Q11：${q11.join("、")}` : ""}`,
        consent: true,
        consentAt: review.reviewedAt ?? nowDateTime(),
      },
      consultation: { needTags: [...(review.confirmedTags || [])], note: q12Lines.join("\n") },
    },
    { actor }
  );
  const opened = mutate(created.id, () => {}, () =>
    historyEntry(2, "open_from_assessment", `由評估 ${assessment.code ?? ""} 開案（橘燈${typeLabel}），進入諮詢階段`, actor)
  );
  return { ok: true, case: opened };
}
