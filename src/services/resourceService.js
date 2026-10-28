// 社區資源資料層：所有資源的讀寫集中在這裡（規格見 doc/specs/resource-schema.md）
// 讀取時會把舊格式資料在記憶體中轉成新格式；只有呼叫寫入函式時才會把整份新格式寫回儲存區（經 storage.js）。

import { NEED_TAGS, derivePrescriptionTypes } from "../config/needTags.js";
import { parseCityDistrict } from "../config/districts.js";
import {
  DERIVE_PRESCRIPTION_TYPES_FROM_TAGS,
  NEW_RESOURCE_WINDOW_MONTHS,
  RISK_LEVELS,
  VERIFY_INTERVAL_MONTHS,
  VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW,
  applyHighRiskRule,
  computeOverallRisk,
  isRecommendable,
} from "../config/resourceRules.js";
import { CHANGE_LOG_IGNORED_FIELDS } from "../config/resourceEditing.js";
import { readList, writeList } from "./storage.js";
import { addMonths, formatDate, nowDateTime, todayString } from "../utils/date.js";
import { generateId } from "../utils/id.js";
import { deepMerge, isPlainObject } from "../utils/object.js";
import { codePattern, formatCode, nextCode } from "../utils/sequenceCode.js";

const STORAGE_KEY = "resources";

const toArray = (v) => (Array.isArray(v) ? v : []);
const toNumberOrNull = (v) => (v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// ── 儲存（經 storage.js）────────────────────────────────────

const readRaw = () => readList(STORAGE_KEY);
const writeAll = (resources) => writeList(STORAGE_KEY, resources);

// ── 預設值 ────────────────────────────────────────────────

export function createEmptySchedule(type = "regular") {
  if (type === "batch") {
    return { type, startDate: "", endDate: "", weekdays: [], startTime: "", endTime: "" };
  }
  if (type === "once") {
    return { type, date: "", startTime: "", endTime: "" };
  }
  return { type: "regular", frequency: "weekly", weekdays: [], monthDays: [], startTime: "", endTime: "" };
}

// 新格式資源的完整欄位與預設值（id、建立時間於 createResource 時產生）
export function createEmptyResource() {
  return {
    id: null,
    code: null,
    verifiedBy: { type: "", name: "" },
    lastVerifiedAt: "",
    nextVerifyAt: "",
    status: "active",
    pauseReason: null,
    resumeAt: null,
    seasonalNote: null,
    createdAt: null,
    updatedAt: null,

    name: "",
    organization: "",
    description: "",
    prescriptionTypes: [],
    needTags: [],
    needTagOther: null,
    staff: [],
    capacity: { type: "", limit: null },
    availability: { type: "", slots: null, nextBatch: null },
    schedule: createEmptySchedule("regular"),
    placeName: "",
    address: { zip: "", city: "", district: "", detail: "" },
    // { lat, lng } 或 null；表單不提供輸入，之後可能改由地址自動轉換座標
    geo: null,

    riskLevel: "",
    riskCriteria: {
      management: "",
      insurance: "",
      environment: "",
      complaints: "",
      staffQualification: "",
    },
    highRisk: { isHighRisk: false, types: [] },
    riskChangeNote: null,

    ageGroups: [],
    identities: [],
    identityOther: null,
    notSuitableFor: null,
    participation: "",
    participationOther: null,
    languages: [],
    indigenousTribe: null,
    languageOther: null,
    transport: [],
    transportNote: { publicTransit: null, shuttle: null, other: null },
    accessibility: [],
    accessibilityOther: null,
    fee: { type: "", detail: null },
    notice: null,

    partnership: "unconfirmed",
    publicContact: { name: "", phone: "", emailOrLine: null },
    adminContact: { sameAsPublic: true, name: null, phone: null, emailOrLine: null },
    followUpMethods: [],
    followUpOther: null,
    links: [],

    keywords: [],
    scenarios: null,

    // 修改紀錄（系統自動，由舊到新）：{ at, actor: { name, role }, changes: [{ field, before, after }] }
    changeLog: [],
  };
}

// 經緯度都是有效數字才保留，否則為 null
function normalizeGeo(lat, lng) {
  const la = toNumberOrNull(lat);
  const ln = toNumberOrNull(lng);
  return la === null || ln === null ? null : { lat: la, lng: ln };
}

// 以預設值補齊缺漏欄位；巢狀物件逐層補、型別不符的陣列改用預設值
// 已從資料結構移除的欄位（mapUrl）在這裡一併清掉
function mergeWithDefaults(raw) {
  const defaults = createEmptyResource();
  const merged = { ...raw };
  for (const [key, def] of Object.entries(defaults)) {
    const value = raw[key];
    if (key === "schedule") {
      merged.schedule = isPlainObject(value)
        ? { ...createEmptySchedule(value.type), ...value }
        : def;
    } else if (isPlainObject(def)) {
      merged[key] = isPlainObject(value) ? { ...def, ...value } : def;
    } else if (Array.isArray(def)) {
      merged[key] = Array.isArray(value) ? value : def;
    } else {
      merged[key] = value === undefined ? def : value;
    }
  }
  merged.geo = isPlainObject(merged.geo) ? normalizeGeo(merged.geo.lat, merged.geo.lng) : null;
  delete merged.mapUrl;
  if (merged.id !== null && merged.id !== undefined) merged.id = String(merged.id);
  return merged;
}

// ── 舊資料轉換 ────────────────────────────────────────────
// 舊格式來自目前的 ResourceForm.vue：中文選項值、address 為字串、沒有 needTags

const LEGACY_STATUS = { active: "active", approved: "active", pause: "paused", end: "terminated", season: "seasonal" };
const LEGACY_PARTNERSHIP = { formal: "formal", oral: "verbal", none: "unconfirmed" };
const LEGACY_SCHEDULE_TYPE = { normal: "regular", batch: "batch", once: "once" };
const LEGACY_PARTICIPATION = { 自由參加: "walk_in", 須報名: "registration", 僅接受轉介: "referral_only" };
const LEGACY_FEE = { 免費: "free", 自費: "paid", 補助: "subsidized" };
const LEGACY_ACCESSIBILITY = {
  無障礙空間: "barrier_free",
  失智者友善: "dementia_friendly",
  長者友善: "senior_friendly",
  兒童友善: "child_friendly",
  性別友善: "gender_friendly",
};
const LEGACY_AGE_GROUPS = { 長者: "senior", 成人: "adult" };
const LEGACY_IDENTITIES = { 慢性病: "chronic", 照顧者: "caregiver", 身心障礙: "disability" };
// 舊表單標籤文字與新代碼表不同的另列
const LEGACY_TAG_ALIASES = { 藝術文化: "arts_culture" };
const TAG_CODE_BY_LABEL = {
  ...Object.fromEntries(NEED_TAGS.map((t) => [t.label, t.code])),
  ...LEGACY_TAG_ALIASES,
};

function isLegacyResource(raw) {
  return typeof raw.address === "string" || !Array.isArray(raw.needTags);
}

function convertLegacyTags(tags) {
  const codes = [];
  const unknown = [];
  for (const tag of toArray(tags)) {
    const code = TAG_CODE_BY_LABEL[tag];
    if (code) codes.push(code);
    else if (tag) unknown.push(tag);
  }
  if (unknown.length) codes.push("other");
  return { needTags: [...new Set(codes)], needTagOther: unknown.length ? unknown.join("、") : null };
}

function convertLegacyCapacity(value) {
  const text = String(value ?? "").trim();
  if (!text) return { type: "", limit: null };
  if (text.includes("不限")) return { type: "open", limit: null };
  const number = /\d+/.exec(text);
  return number ? { type: "limited", limit: Number(number[0]) } : { type: "other", limit: null };
}

function convertLegacyStatus(value) {
  if (LEGACY_STATUS[value]) return { status: LEGACY_STATUS[value], pauseReason: null };
  // 無法辨識的狀態一律暫停，避免出現在民眾端
  return { status: "paused", pauseReason: `舊資料狀態無法辨識（原值：${value ?? "空白"}）` };
}

// 舊資料的數字 id 是 Date.now() 產生的，可還原為建立時間
function legacyCreatedAt(id) {
  return typeof id === "number" && id > 1e12 ? new Date(id).toISOString() : null;
}

function convertLegacyResource(raw, index) {
  const { status, pauseReason } = convertLegacyStatus(raw.status);
  const { needTags, needTagOther } = convertLegacyTags(raw.tags);
  const addressText = typeof raw.address === "string" ? raw.address : "";
  const { city, district, zip } = parseCityDistrict(addressText);
  const targetGroups = toArray(raw.targetGroups);
  const ageGroups = targetGroups.map((g) => LEGACY_AGE_GROUPS[g]).filter(Boolean);
  const identities = targetGroups.map((g) => LEGACY_IDENTITIES[g]).filter(Boolean);
  const participation = LEGACY_PARTICIPATION[raw.participation];
  const createdAt = legacyCreatedAt(raw.id);

  return mergeWithDefaults({
    id: raw.id ?? `legacy-${index}`,
    lastVerifiedAt: raw.lastVerifyDate || "",
    nextVerifyAt: raw.nextVerifyDate || "",
    status,
    pauseReason,
    createdAt,
    updatedAt: createdAt,

    name: raw.name || "",
    organization: raw.organization || "",
    description: raw.content || "",
    needTags,
    needTagOther,
    prescriptionTypes: derivePrescriptionTypes(needTags),
    capacity: convertLegacyCapacity(raw.capacity),
    availability: { type: raw.capacityStatus || "", slots: null, nextBatch: null },
    schedule: createEmptySchedule(LEGACY_SCHEDULE_TYPE[raw.cycle] || "regular"),
    placeName: raw.locationName || "",
    address: { zip, city, district, detail: addressText },
    // 舊資料若有 lat/lng 保留到 geo
    geo: normalizeGeo(raw.lat, raw.lng),

    // 舊資料沒有五項判斷條件，保留原本的整體等級；缺值時保守視為黃燈
    riskLevel: RISK_LEVELS.includes(raw.riskLevel) ? raw.riskLevel : "yellow",
    riskChangeNote: raw.riskNote || null,

    ageGroups: ageGroups.length ? ageGroups : ["all"],
    identities: identities.length ? identities : ["all"],
    participation: participation || (raw.participation ? "other" : ""),
    participationOther: !participation && raw.participation ? raw.participation : null,
    accessibility: toArray(raw.accessibility).map((a) => LEGACY_ACCESSIBILITY[a]).filter(Boolean),
    fee: { type: LEGACY_FEE[raw.feeType] || "", detail: null },

    partnership: LEGACY_PARTNERSHIP[raw.coopStatus] || "unconfirmed",
    publicContact: { name: raw.contactName || "", phone: raw.contactPhone || "", emailOrLine: null },

    keywords: String(raw.keywords ?? "")
      .split(/[,，、\s]+/)
      .map((k) => k.trim())
      .filter(Boolean),
    scenarios: raw.aiContext || null,
  });
}

// 任一筆資料（新或舊格式）轉成完整的新格式；非物件回傳 null
export function normalizeResource(raw, index = 0) {
  if (!isPlainObject(raw)) return null;
  return isLegacyResource(raw) ? convertLegacyResource(raw, index) : mergeWithDefaults(raw);
}

// ── 驗證週期 ──────────────────────────────────────────────

// 最後驗證日距離建立日不到 NEW_RESOURCE_WINDOW_MONTHS 個月，視為新開發資源；
// 沒有建立時間（例如正在建立）也視為新開發
function isNewResource(resource) {
  const created = new Date(resource.createdAt);
  if (!resource.createdAt || Number.isNaN(created.getTime())) return true;
  return resource.lastVerifiedAt < addMonths(formatDate(created), NEW_RESOURCE_WINDOW_MONTHS);
}

// 預計驗證日期：最後驗證日 + 6 個月；新開發或黃燈資源 + 3 個月
export function calcNextVerifyAt(resource) {
  if (!resource?.lastVerifiedAt) return "";
  const months =
    resource.riskLevel === "yellow" || isNewResource(resource)
      ? VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW
      : VERIFY_INTERVAL_MONTHS;
  return addMonths(resource.lastVerifiedAt, months);
}

// 今天已超過預計驗證日期 → 後台標示「待驗證」
export function isVerifyOverdue(resource, today = todayString()) {
  return !!resource?.nextVerifyAt && today > resource.nextVerifyAt;
}

// 儲存前套用規則：高風險檢核 → 整體風險 → 處方類型
function applyRules(resource) {
  const result = applyHighRiskRule(resource);
  const overall = computeOverallRisk(result.riskCriteria);
  return {
    ...result,
    riskLevel: overall ?? result.riskLevel,
    prescriptionTypes: DERIVE_PRESCRIPTION_TYPES_FROM_TAGS
      ? derivePrescriptionTypes(result.needTags)
      : result.prescriptionTypes,
  };
}

// ── 讀取 ──────────────────────────────────────────────────

export function getAllResources() {
  return readRaw()
    .map((raw, index) => normalizeResource(raw, index))
    .filter(Boolean);
}

export function getResourceById(id) {
  return getAllResources().find((r) => String(r.id) === String(id)) ?? null;
}

// context："explore" 民眾探索頁；"referral" 健康管理員轉介選單
export function getRecommendableResources(context = "referral") {
  return getAllResources().filter((r) => isRecommendable(r, context));
}

// ── 資源編碼 ──────────────────────────────────────────────
// 格式：Res 加三位數流水號（Res001），超過 999 時位數自動增加（Res1000）
// 由系統在新增時產生，不可手動修改；流水號取目前最大編號加一

const CODE_PREFIX = "Res";
export const RESOURCE_CODE_PATTERN = codePattern(CODE_PREFIX);

export function formatResourceCode(number) {
  return formatCode(CODE_PREFIX, number);
}

// 下一個可用的資源編碼（新增表單用來預覽）
export function getNextResourceCode(resources = getAllResources()) {
  return nextCode(CODE_PREFIX, resources);
}

// ── 寫入 ──────────────────────────────────────────────────

// 新增時一律由系統產生 id 與資源編碼，忽略傳入的值
export function createResource(data = {}) {
  const now = nowDateTime();
  const resources = getAllResources();
  const resource = applyRules({
    ...mergeWithDefaults(data),
    id: generateId(),
    code: getNextResourceCode(resources),
    createdAt: now,
    updatedAt: now,
    changeLog: [],
  });
  if (!resource.nextVerifyAt) resource.nextVerifyAt = calcNextVerifyAt(resource);

  writeAll([...resources, resource]);
  return resource;
}

// ── 修改紀錄 ──────────────────────────────────────────────

// 比對用的值：null、undefined、空字串視為相同；物件的空值欄位不列入、key 依字母排序
function comparable(value) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.map(comparable);
  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((k) => [k, comparable(value[k])])
      .filter(([, v]) => v !== null);
    return entries.length ? Object.fromEntries(entries) : null;
  }
  return value;
}

const sameValue = (a, b) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));

/**
 * 比對修改前後的資源，列出有變動的第一層欄位與前後內容
 * 不比對 CHANGE_LOG_IGNORED_FIELDS（識別資料、系統時間、自動推得的欄位）
 * @returns {Array<{ field: string, before: any, after: any }>}
 */
export function diffResource(before = {}, after = {}) {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...fields]
    .filter((field) => !CHANGE_LOG_IGNORED_FIELDS.includes(field))
    .filter((field) => !sameValue(before[field], after[field]))
    .map((field) => ({
      field,
      before: structuredClone(before[field] ?? null),
      after: structuredClone(after[field] ?? null),
    }));
}

// 只保留允許修改的欄位（資源點編輯時使用）；allowed 為 null 時不限制
export function pickFields(patch = {}, allowed = null) {
  if (!allowed) return patch;
  return Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
}

// patch 為深層合併：例如只傳 { address: { city } }，address 其他欄位保留；陣列整個替換
// schedule.type 變更時以新類型的空白結構為底，避免殘留舊類型欄位
// patch 若明確帶 nextVerifyAt 視為手動調整；否則在最後驗證日或風險等級變動時重新計算
// 資源編碼不可修改；沒有編碼的舊資料在這次儲存時補上
/**
 * 修改資源
 * options.actor：修改者 { name, role }，寫入修改紀錄
 * options.editableFields：只允許修改的欄位（資源點傳入 PROVIDER_EDITABLE_FIELDS），其他欄位一律忽略
 * 有實際變動時在 changeLog 新增一筆紀錄；修改紀錄本身不能由 patch 修改
 */
export function updateResource(id, rawPatch = {}, { actor = null, editableFields = null } = {}) {
  const resources = getAllResources();
  const index = resources.findIndex((r) => String(r.id) === String(id));
  if (index === -1) return null;

  const patchWithoutLog = { ...rawPatch };
  delete patchWithoutLog.changeLog;
  const patch = pickFields(patchWithoutLog, editableFields);
  const current = resources[index];
  const scheduleTypeChanged =
    isPlainObject(patch.schedule) &&
    patch.schedule.type !== undefined &&
    patch.schedule.type !== current.schedule?.type;
  const base = scheduleTypeChanged
    ? { ...current, schedule: createEmptySchedule(patch.schedule.type) }
    : current;

  const updated = applyRules({
    ...mergeWithDefaults(deepMerge(base, patch)),
    id: current.id,
    code: RESOURCE_CODE_PATTERN.test(String(current.code ?? ""))
      ? current.code
      : getNextResourceCode(resources),
    createdAt: current.createdAt,
    updatedAt: nowDateTime(),
  });

  const manualNextVerify = Object.prototype.hasOwnProperty.call(patch, "nextVerifyAt");
  const verifyInputsChanged =
    updated.lastVerifiedAt !== current.lastVerifiedAt || updated.riskLevel !== current.riskLevel;
  if (!manualNextVerify && (verifyInputsChanged || !updated.nextVerifyAt)) {
    updated.nextVerifyAt = calcNextVerifyAt(updated);
  }

  const changes = diffResource(current, updated);
  updated.changeLog = changes.length
    ? [
        ...current.changeLog,
        { at: updated.updatedAt, actor: { name: actor?.name ?? "", role: actor?.role ?? "" }, changes },
      ]
    : current.changeLog;

  resources[index] = updated;
  writeAll(resources);
  return updated;
}

// 規格：終止的資源保留資料供歷史個案查詢，頁面應優先使用 terminateResource
export function terminateResource(id, options = {}) {
  return updateResource(id, { status: "terminated" }, options);
}

export function deleteResource(id) {
  const resources = getAllResources();
  const next = resources.filter((r) => String(r.id) !== String(id));
  if (next.length === resources.length) return false;
  writeAll(next);
  return true;
}
