// 資源欄位檢核（doc/resource-schema.md 第一～五節）
// 回傳 { errors, missing }，兩者皆為 { 欄位路徑: 訊息 }，欄位路徑與表單對應，例如 "address.city"
//   errors   會阻擋送出：格式錯誤、資源名稱未填，以及嚴格模式下的所有必填未填
//   missing  不阻擋送出：非嚴格模式下未填的必填欄位，畫面顯示為「建議填寫」
// 模式由 STRICT_VALIDATION 決定，可用 options.strict 覆寫（測試用）

import {
  RISK_CRITERIA_KEYS,
  STRICT_VALIDATION,
  computeOverallRisk,
} from "../config/resourceRules.js";

export const DESCRIPTION_MAX_LENGTH = 100;

const isBlank = (v) => v === null || v === undefined || String(v).trim() === "";
const isEmptyArray = (v) => !Array.isArray(v) || v.length === 0;
const has = (arr, code) => Array.isArray(arr) && arr.includes(code);
const charLength = (v) => [...String(v ?? "")].length;

function isValidDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
const isHttpUrl = (value) => /^https?:\/\/\S+$/i.test(String(value).trim());

export function validateResource(resource, { original = null, strict = STRICT_VALIDATION } = {}) {
  const r = resource ?? {};
  const errors = {};
  const missing = {};

  // 必填：嚴格模式阻擋，非嚴格模式列為建議
  const require = (path, filled, message) => {
    if (!filled) (strict ? errors : missing)[path] = message;
  };
  // 格式：有填才檢查，任何模式都阻擋
  const format = (path, invalid, message) => {
    if (invalid) {
      errors[path] = message;
      delete missing[path];
    }
  };
  const checkDate = (path, value) =>
    format(path, !isBlank(value) && !isValidDate(value), "日期格式需為 YYYY-MM-DD");
  const checkTime = (path, value) =>
    format(path, !isBlank(value) && !isValidTime(value), "時間格式需為 HH:mm");

  // 一、管理欄位
  // 資源編碼由系統產生（新增前尚未產生，可為空）；有值時格式必須正確
  format(
    "code",
    !isBlank(r.code) && !/^Res\d{3,}$/.test(String(r.code)),
    "資源編碼格式需為 Res 加三位數流水號，例如 Res001"
  );
  require("verifiedBy.type", !isBlank(r.verifiedBy?.type), "請選擇驗證者類型");
  require("verifiedBy.name", !isBlank(r.verifiedBy?.name), "請填寫驗證者姓名");
  require("lastVerifiedAt", !isBlank(r.lastVerifiedAt), "請填寫最後驗證日期");
  require("nextVerifyAt", !isBlank(r.nextVerifyAt), "請填寫預計驗證日期");
  checkDate("lastVerifiedAt", r.lastVerifiedAt);
  checkDate("nextVerifyAt", r.nextVerifyAt);
  format(
    "nextVerifyAt",
    isValidDate(r.lastVerifiedAt) && isValidDate(r.nextVerifyAt) && r.nextVerifyAt < r.lastVerifiedAt,
    "預計驗證日期不可早於最後驗證日期"
  );
  require("status", !isBlank(r.status), "請選擇資源狀態");
  if (r.status === "paused") {
    require("pauseReason", !isBlank(r.pauseReason), "暫停時請填寫原因");
    require("resumeAt", !isBlank(r.resumeAt), "暫停時請填寫預計恢復日期");
  }
  checkDate("resumeAt", r.resumeAt);
  if (r.status === "seasonal") {
    require("seasonalNote", !isBlank(r.seasonalNote), "季節性關閉時請填寫週期說明");
  }

  // 二、資源內容
  // 資源名稱在任何模式都必填
  if (isBlank(r.name)) errors.name = "請填寫資源名稱";
  require("organization", !isBlank(r.organization), "請填寫所屬單位");
  require("description", !isBlank(r.description), "請填寫資源內容");
  format(
    "description",
    charLength(r.description) > DESCRIPTION_MAX_LENGTH,
    `資源內容請在 ${DESCRIPTION_MAX_LENGTH} 字以內`
  );
  require("needTags", !isEmptyArray(r.needTags), "請至少選擇一個需求標籤");
  if (has(r.needTags, "other")) {
    require("needTagOther", !isBlank(r.needTagOther), "選擇「其他」時請填寫標籤說明");
  }

  require("capacity.type", !isBlank(r.capacity?.type), "請選擇可容納人數");
  if (r.capacity?.type === "limited") {
    require("capacity.limit", !isBlank(r.capacity?.limit), "請填寫人數上限");
  }
  format(
    "capacity.limit",
    !isBlank(r.capacity?.limit) && !(Number.isInteger(Number(r.capacity.limit)) && Number(r.capacity.limit) > 0),
    "人數上限需為大於 0 的整數"
  );
  require("availability.type", !isBlank(r.availability?.type), "請選擇服務量能");
  format(
    "availability.slots",
    !isBlank(r.availability?.slots) &&
      !(Number.isInteger(Number(r.availability.slots)) && Number(r.availability.slots) >= 0),
    "可用名額需為 0 以上的整數"
  );

  const s = r.schedule ?? {};
  if (s.type === "regular") {
    require("schedule.frequency", !isBlank(s.frequency), "請選擇頻率");
    if (s.frequency === "weekly") {
      require("schedule.weekdays", !isEmptyArray(s.weekdays), "請至少選擇一個星期");
    }
    if (s.frequency === "monthly") {
      require("schedule.monthDays", !isEmptyArray(s.monthDays), "請至少選擇一個日期");
    }
  } else if (s.type === "batch") {
    require("schedule.startDate", !isBlank(s.startDate), "請填寫開始日期");
    require("schedule.endDate", !isBlank(s.endDate), "請填寫結束日期");
    require("schedule.weekdays", !isEmptyArray(s.weekdays), "請至少選擇一個星期");
  } else if (s.type === "once") {
    require("schedule.date", !isBlank(s.date), "請填寫日期");
  } else {
    require("schedule.type", false, "請選擇服務週期");
  }
  if (s.type) {
    require("schedule.startTime", !isBlank(s.startTime), "請填寫開始時間");
    require("schedule.endTime", !isBlank(s.endTime), "請填寫結束時間");
  }
  checkDate("schedule.startDate", s.startDate);
  checkDate("schedule.endDate", s.endDate);
  checkDate("schedule.date", s.date);
  format(
    "schedule.endDate",
    isValidDate(s.startDate) && isValidDate(s.endDate) && s.endDate < s.startDate,
    "結束日期不可早於開始日期"
  );
  checkTime("schedule.startTime", s.startTime);
  checkTime("schedule.endTime", s.endTime);
  format(
    "schedule.endTime",
    isValidTime(s.startTime) && isValidTime(s.endTime) && s.endTime <= s.startTime,
    "結束時間需晚於開始時間"
  );

  require("address.city", !isBlank(r.address?.city), "請選擇縣市");
  require("address.district", !isBlank(r.address?.district), "請選擇行政區");
  require("address.zip", !isBlank(r.address?.zip), "請填寫郵遞區號");
  require("address.detail", !isBlank(r.address?.detail), "請填寫詳細地址");
  format(
    "address.zip",
    !isBlank(r.address?.zip) && !/^\d{3}(\d{2,3})?$/.test(String(r.address.zip).trim()),
    "郵遞區號需為 3、5 或 6 碼數字"
  );

  // 三、安全與風險
  for (const key of RISK_CRITERIA_KEYS) {
    require(`riskCriteria.${key}`, !isBlank(r.riskCriteria?.[key]), "請選擇燈號");
  }
  // 整體等級可由五項條件推得時不需另填；設定為人工判定時才檢查
  if (computeOverallRisk(r.riskCriteria) === null) {
    require("riskLevel", !isBlank(r.riskLevel), "請選擇整體風險等級");
  }
  if (r.highRisk?.isHighRisk) {
    require("highRisk.types", !isEmptyArray(r.highRisk?.types), "高風險情境請至少選擇一種類型");
  }
  // 編輯時風險等級變更：不受 STRICT_VALIDATION 影響，一律必填，且不可沿用上一次的說明
  // 原本沒有風險等級（首次評估）不算變更
  if (original?.riskLevel && r.riskLevel !== original.riskLevel) {
    const note = String(r.riskChangeNote ?? "").trim();
    if (!note) {
      errors.riskChangeNote = "風險等級變更時請填寫調整說明";
    } else if (note === String(original.riskChangeNote ?? "").trim()) {
      errors.riskChangeNote = "請填寫本次的調整說明，不可沿用上一次的內容";
    }
  }

  // 四、適用對象與可近性
  require("ageGroups", !isEmptyArray(r.ageGroups), "請至少選擇一個年齡層");
  require("identities", !isEmptyArray(r.identities), "請至少選擇一個身分");
  require("participation", !isBlank(r.participation), "請選擇參與條件");
  require("languages", !isEmptyArray(r.languages), "請至少選擇一種語言");
  if (has(r.languages, "indigenous")) {
    require("indigenousTribe", !isBlank(r.indigenousTribe), "選擇原住民語時請填寫族別");
  }
  require("fee.type", !isBlank(r.fee?.type), "請選擇費用");
  if (r.fee?.type === "paid" || r.fee?.type === "subsidized") {
    require("fee.detail", !isBlank(r.fee?.detail), "請填寫收費標準或補助資格");
  }

  // 五、協作介面
  require("partnership", !isBlank(r.partnership), "請選擇合作狀態");
  const checkContact = (prefix, contact) => {
    require(`${prefix}.name`, !isBlank(contact?.name), "請填寫聯絡人姓名");
    require(
      `${prefix}.phone`,
      !isBlank(contact?.phone) || !isBlank(contact?.emailOrLine),
      "電話與 Email／LINE 至少填一項"
    );
  };
  checkContact("publicContact", r.publicContact);
  if (r.adminContact && r.adminContact.sameAsPublic === false) {
    checkContact("adminContact", r.adminContact);
  }
  require("followUpMethods", !isEmptyArray(r.followUpMethods), "請至少選擇一種追蹤方式");
  format(
    "links",
    (Array.isArray(r.links) ? r.links : []).some((link) => !isHttpUrl(link)),
    "連結需以 http:// 或 https:// 開頭"
  );

  return { errors, missing };
}
