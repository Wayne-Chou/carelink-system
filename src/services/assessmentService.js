// 生活近況評估紀錄資料層（doc/specs/assessment-schema.md 第三、五節）
// 存在「assessments」（經 storage.js）；一次填表加一次判讀為一筆，同一位民眾可有多筆（以 previousAssessmentId 串起）

import {
  AUTO_OPEN_CASE,
  CASE_OPENING_ORANGE_TYPES,
  GREEN_REASSESS_MONTHS,
  LIGHTS,
  ORANGE_DECLINE_LIMIT,
  ORANGE_EXTENDED_MONTHS,
  ORANGE_TYPES,
  YELLOW_RECHECK_MONTHS,
} from "../config/assessmentRules.js";
import { getCaseById, openCaseFromAssessment } from "./caseService.js";
import { readList, writeList } from "./storage.js";
import { addMonths, nowDateTime, todayString, toDateString } from "../utils/date.js";
import { generateId } from "../utils/id.js";
import { maskNationalId, storeNationalId } from "../utils/nationalId.js";
import { deepMerge, fillDefaults, isPlainObject } from "../utils/object.js";
import { nextCode } from "../utils/sequenceCode.js";

export { maskNationalId };

const STORAGE_KEY = "assessments";
// 待確認事項：「評估紀錄的編碼格式：簡報第三頁沒有列評估，暫定 Ast001，是否另有規劃？」
const CODE_PREFIX = "Ast";

// ── 預設值 ────────────────────────────────────────────────

const emptyAnswers = () => ({
  q1: "",
  q2: "",
  q3: "",
  q4: "",
  q5: "",
  q6: "",
  q7: "",
  q8: "",
  q9: "",
  q10: "",
  q11: [],
  q12: "",
});

const emptyReview = () => ({
  readerName: "",
  readerType: "",
  reviewedAt: null,
  q12Note: "",
  q11Notes: {},
  questionNotes: {},
  formerInterests: "",
  extraAssessments: [],
  light: "",
  orangeType: "",
  redReasons: [],
  redReferredTo: "",
  declineReason: "",
  consent: null,
  suggestedTags: [],
  confirmedTags: [],
  providedResources: [],
  escortOffered: false,
});

export function createEmptyAssessment() {
  return {
    id: null,
    code: null,
    // 待確認事項：「民眾在候診時是用平板自填，還是紙本填寫後由工作人員輸入？」→ fillMode 兩者都支援
    person: { name: "", nationalId: "" },
    filledAt: "",
    fillMode: "self",
    fillNote: "",
    answers: emptyAnswers(),
    review: emptyReview(),
    caseId: null,
    nextCheckAt: null,
    declineCount: 0,
    previousAssessmentId: null,
    status: "filled",
    // 作廢紀錄（status 為 voided 時才有值）
    voidedAt: null,
    voidedBy: "",
    voidReason: "",
    createdAt: null,
    updatedAt: null,
  };
}

// 作廢的評估不列入待辦提醒、下次確認日期與婉拒次數計算
export const isVoided = (a) => a?.status === "voided";
export const isActiveAssessment = (a) => !!a && !isVoided(a);

function normalizeAssessment(raw) {
  const filled = fillDefaults(raw, createEmptyAssessment());
  if (filled.id !== null && filled.id !== undefined) filled.id = String(filled.id);
  return filled;
}

// ── 讀取 ──────────────────────────────────────────────────

export function getAllAssessments() {
  return readList(STORAGE_KEY).filter(isPlainObject).map(normalizeAssessment);
}

export function getAssessmentById(id) {
  return getAllAssessments().find((a) => String(a.id) === String(id)) ?? null;
}

// 同一位民眾的評估歷程：沿 previousAssessmentId 往前，由新到舊
// 待確認事項：「判讀人員能否直接看到民眾過去的評估與個案紀錄？」目前資料層提供，頁面是否顯示待確認
export function getAssessmentChain(assessment, all = getAllAssessments()) {
  const chain = [];
  const seen = new Set();
  let current = assessment;
  while (current && !seen.has(current.id)) {
    chain.push(current);
    seen.add(current.id);
    current = all.find((a) => String(a.id) === String(current.previousAssessmentId)) ?? null;
  }
  return chain;
}

const writeAll = (list) => writeList(STORAGE_KEY, list);

// ── 新增與修改 ────────────────────────────────────────────

export function createAssessment(data = {}) {
  const list = getAllAssessments();
  const now = nowDateTime();
  const base = normalizeAssessment(deepMerge(createEmptyAssessment(), data));
  const created = {
    ...base,
    id: generateId(),
    code: nextCode(CODE_PREFIX, list),
    filledAt: base.filledAt || todayString(),
    status: "filled",
    createdAt: now,
    updatedAt: now,
    person: { ...base.person, nationalId: storeNationalId(base.person.nationalId) },
  };
  writeAll([...list, created]);
  return created;
}

// 深層合併：物件逐層合併、陣列整個替換；id、code、createdAt 不可修改
export function updateAssessment(id, patch = {}) {
  const list = getAllAssessments();
  const current = list.find((a) => String(a.id) === String(id));
  if (!current) return null;
  const updated = {
    ...normalizeAssessment(deepMerge(current, patch)),
    id: current.id,
    code: current.code,
    createdAt: current.createdAt,
    updatedAt: nowDateTime(),
  };
  if (patch.person?.nationalId !== undefined) {
    updated.person = { ...updated.person, nationalId: storeNationalId(patch.person.nationalId) };
  }
  writeAll(list.map((a) => (String(a.id) === String(id) ? updated : a)));
  return updated;
}

// ── 後續處置（第五節）──────────────────────────────────────

const isReserved = (a) => a?.review?.light === "orange" && a?.review?.orangeType === "reserved";

// 沿 previousAssessmentId 往前找第一筆未作廢的評估（作廢的評估視同不存在）
function findPreviousActive(assessment, all) {
  const seen = new Set();
  let previousId = assessment?.previousAssessmentId;
  while (previousId && !seen.has(String(previousId))) {
    seen.add(String(previousId));
    const previous = all.find((a) => String(a.id) === String(previousId));
    if (!previous) return null;
    if (isActiveAssessment(previous)) return previous;
    previousId = previous.previousAssessmentId;
  }
  return null;
}

// 連續婉拒次數：本筆為橘燈保留時，前一筆（跳過作廢的）也是橘燈保留就累加
export function calcDeclineCount(assessment, all = getAllAssessments()) {
  if (!isReserved(assessment)) return 0;
  const previous = findPreviousActive(assessment, all);
  return isReserved(previous) ? (previous.declineCount || 1) + 1 : 1;
}

/**
 * 下次確認日期，以判讀日（沒有時用填表日）起算
 *   黃燈 + YELLOW_RECHECK_MONTHS；綠燈 + GREEN_REASSESS_MONTHS
 *   橘燈保留：下次來院時（無日期）；連續婉拒達 ORANGE_DECLINE_LIMIT 次後 + ORANGE_EXTENDED_MONTHS
 *   紅燈、橘燈轉介與退縮：無（紅燈走院內程序；橘燈由個案追蹤）
 *   已作廢：無
 */
export function calcNextCheckAt(assessment) {
  if (isVoided(assessment)) return null;
  const review = assessment?.review || {};
  const base = toDateString(review.reviewedAt) || assessment?.filledAt;
  if (!base) return null;
  if (review.light === "yellow") return addMonths(base, YELLOW_RECHECK_MONTHS);
  if (review.light === "green") return addMonths(base, GREEN_REASSESS_MONTHS);
  // 待確認事項：「橘燈保留的『再確認』由誰執行？」目前不指派，只記錄日期
  if (isReserved(assessment) && (assessment.declineCount || 0) >= ORANGE_DECLINE_LIMIT) {
    return addMonths(base, ORANGE_EXTENDED_MONTHS);
  }
  return null;
}

// 判讀必填檢核（第三節）；回傳 { 欄位: 訊息 }
export function validateReview(review = {}) {
  const errors = {};
  if (!LIGHTS.includes(review.light)) errors.light = "請判定燈號";
  if (review.light === "red" && !(review.redReasons || []).length) {
    errors.redReasons = "紅燈請至少選擇一項原因";
  }
  if (review.light === "orange") {
    if (!ORANGE_TYPES.includes(review.orangeType)) errors.orangeType = "請選擇橘燈類型";
    if (CASE_OPENING_ORANGE_TYPES.includes(review.orangeType) && review.consent !== true) {
      errors.consent = "橘燈轉介或退縮需取得民眾同意轉介";
    }
    if (review.orangeType === "reserved" && !String(review.declineReason ?? "").trim()) {
      errors.declineReason = "橘燈保留請填寫婉拒原因";
    }
  }
  return errors;
}

/**
 * 橘燈轉介或退縮時開案，並回寫 caseId 與 status = closed；已開過案時回傳既有個案，不重複建立
 * @returns {{ ok: true, case: object, assessment: object } | { ok: false, reasons: string[] }}
 */
export function openCaseForAssessment(id, options = {}) {
  const assessment = getAssessmentById(id);
  if (!assessment) return { ok: false, reasons: ["找不到評估紀錄"] };
  if (isVoided(assessment)) return { ok: false, reasons: ["已作廢的評估不能開案"] };
  if (assessment.caseId) {
    const existing = getCaseById(assessment.caseId);
    if (existing) return { ok: true, case: existing, assessment };
  }
  const result = openCaseFromAssessment(assessment, options);
  if (!result.ok) return result;
  const updated = updateAssessment(id, { caseId: result.case.id, status: "closed" });
  return { ok: true, case: result.case, assessment: updated };
}

/**
 * 評估列表的排序：未判讀的排最前面，其中等最久的（填表最早）在上；
 * 其餘依判讀時間由新到舊（沒有判讀時間時用填表日期）；已作廢的排最後，依作廢時間由新到舊
 */
export function sortForList(assessments) {
  const group = (a) => (a.status === "filled" ? 0 : isVoided(a) ? 2 : 1);
  const filledKey = (a) => `${a.filledAt || ""} ${a.createdAt || ""}`;
  const reviewedKey = (a) => String(a.review?.reviewedAt || a.filledAt || "");
  return [...(assessments || [])].sort((a, b) => {
    if (group(a) !== group(b)) return group(a) - group(b);
    if (group(a) === 0) return filledKey(a).localeCompare(filledKey(b));
    if (group(a) === 2) return String(b.voidedAt || "").localeCompare(String(a.voidedAt || ""));
    return reviewedKey(b).localeCompare(reviewedKey(a));
  });
}

// ── 作廢（不刪除資料）──────────────────────────────────────

/**
 * 能否作廢：已作廢或已開案的評估不能作廢
 * @returns {{ ok: boolean, reason: string }}
 */
export function canVoid(assessment) {
  if (!assessment) return { ok: false, reason: "找不到評估紀錄" };
  if (isVoided(assessment)) return { ok: false, reason: "這筆評估已經作廢" };
  if (assessment.caseId) {
    return { ok: false, reason: "這筆評估已經開案，不能作廢；如需結束，請在個案中處理" };
  }
  return { ok: true, reason: "" };
}

/**
 * 作廢評估：狀態改為 voided，記錄原因、時間與操作者，並清除下次確認日期
 * @returns {{ ok: true, assessment: object } | { ok: false, errors: object }}
 */
export function voidAssessment(id, { reason = "", actor = "" } = {}) {
  const current = getAssessmentById(id);
  const check = canVoid(current);
  if (!check.ok) return { ok: false, errors: { id: check.reason } };
  if (!String(reason).trim()) return { ok: false, errors: { voidReason: "請填寫作廢原因" } };
  const updated = updateAssessment(id, {
    status: "voided",
    voidedAt: nowDateTime(),
    voidedBy: String(actor).trim(),
    voidReason: String(reason).trim(),
    nextCheckAt: null,
  });
  return { ok: true, assessment: updated };
}

const needsCase = (a) =>
  a?.review?.light === "orange" &&
  CASE_OPENING_ORANGE_TYPES.includes(a.review.orangeType) &&
  a.review.consent === true;

// 已判讀為橘燈轉介或退縮、但尚未開案（AUTO_OPEN_CASE 為 false 期間累積，步驟 3 補開案用）
export const isPendingCaseOpening = (a) => isActiveAssessment(a) && needsCase(a) && !a.caseId;

export function getPendingCaseOpenings(all = getAllAssessments()) {
  return all.filter(isPendingCaseOpening);
}

/**
 * 補開案：替已判讀為橘燈轉介或退縮、但尚未開案的評估開案（AUTO_OPEN_CASE 為 false 期間累積的）
 * AUTO_OPEN_CASE 為 true 時由 main.js 在網站啟動時呼叫；重複呼叫不會重複開案
 * @returns {{ opened: { assessmentCode: string, caseCode: string }[], failed: { assessmentCode: string, reasons: string[] }[] }}
 */
export function openPendingCases({ enabled = AUTO_OPEN_CASE, actor = "系統補開案" } = {}) {
  const result = { opened: [], failed: [] };
  if (!enabled) return result;
  for (const assessment of getPendingCaseOpenings()) {
    const opened = openCaseForAssessment(assessment.id, { actor });
    if (opened.ok) result.opened.push({ assessmentCode: assessment.code, caseCode: opened.case.code });
    else result.failed.push({ assessmentCode: assessment.code, reasons: opened.reasons });
  }
  return result;
}

/**
 * 儲存判讀結果：檢核必填 → 填入判讀時間、狀態、婉拒次數、下次確認日期 → 橘燈轉介或退縮開案
 * 燈號一律由判讀人員決定，這裡不依建議改動 review.light
 * openCase 預設依 AUTO_OPEN_CASE；不開案時回傳 caseDeferred: true，評估狀態維持 reviewed
 * @returns {{ ok: true, assessment: object, case: object|null, caseDeferred: boolean } | { ok: false, errors: object }}
 */
export function reviewAssessment(
  id,
  review = {},
  { managerName = "", actor = "", openCase = AUTO_OPEN_CASE } = {}
) {
  const current = getAssessmentById(id);
  if (!current) return { ok: false, errors: { id: "找不到評估紀錄" } };
  if (isVoided(current)) return { ok: false, errors: { id: "已作廢的評估不能判讀" } };

  const mergedReview = deepMerge(current.review, review);
  const errors = validateReview(mergedReview);
  if (Object.keys(errors).length) return { ok: false, errors };

  const draft = {
    ...current,
    review: { ...mergedReview, reviewedAt: mergedReview.reviewedAt || nowDateTime() },
    status: "reviewed",
  };
  draft.declineCount = calcDeclineCount(draft);
  draft.nextCheckAt = calcNextCheckAt(draft);

  const saved = updateAssessment(id, draft);
  if (!needsCase(saved)) return { ok: true, assessment: saved, case: null, caseDeferred: false };
  if (!openCase) return { ok: true, assessment: saved, case: null, caseDeferred: true };

  const opened = openCaseForAssessment(id, { managerName, actor: actor || saved.review.readerName });
  return opened.ok
    ? { ok: true, assessment: opened.assessment, case: opened.case, caseDeferred: false }
    : { ok: false, errors: { case: opened.reasons.join("；") } };
}
