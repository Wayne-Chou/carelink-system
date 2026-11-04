// 帳號與註冊的設定（doc/specs/account-schema.md）
// ⚠ 原型階段：帳號、密碼、通知信都存在瀏覽器（sessionStorage），正式版需由後端處理

import { READER_TYPE_OPTIONS } from "./assessmentLabels.js";

// 帳號狀態：只有 active 可以登入
export const ACCOUNT_STATUSES = [
  { code: "pending", label: "待審核" },
  { code: "active", label: "已啟用" },
  { code: "rejected", label: "已退回" },
  { code: "suspended", label: "已停用" },
];

export const accountStatusLabel = (code) => ACCOUNT_STATUSES.find((s) => s.code === code)?.label ?? "";

// 醫事人員類別（判讀人員申請時填寫；通過後帶入判讀頁的判讀人員類別 readerType）
export const MEDICAL_TYPES = READER_TYPE_OPTIONS;

// 審核時的確認方式（可複選）
export const VERIFY_METHODS = [
  { code: "phone", label: "電話" },
  { code: "line", label: "LINE" },
  { code: "email", label: "Email" },
  { code: "medical_license", label: "查詢醫事人員證書" },
  { code: "org_registration", label: "查詢立案資料" },
  { code: "supervisor", label: "向主管確認" },
  { code: "other", label: "其他" },
];

// 密碼連結的有效時間；只能使用一次
//   設定密碼（審核通過、系統管理員建立帳號）：SETUP_TOKEN_DAYS 天
//   重設密碼（忘記密碼）：RESET_TOKEN_MINUTES 分鐘
export const SETUP_TOKEN_DAYS = 7;
export const RESET_TOKEN_MINUTES = 60;

// 密碼規則：設定密碼、重設密碼都套用（註冊時不設密碼，審核通過後由設定密碼信設定）
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_RULE_TEXT = `至少 ${PASSWORD_MIN_LENGTH} 碼，需包含英文字母與數字`;

// 回傳錯誤訊息；符合規則時回傳空字串
export function checkPassword(password, confirm) {
  const value = String(password ?? "");
  if (!value) return "請輸入密碼";
  if (value.length < PASSWORD_MIN_LENGTH || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return `密碼需${PASSWORD_RULE_TEXT}`;
  }
  if (confirm !== undefined && value !== String(confirm ?? "")) return "兩次輸入的密碼不一致";
  return "";
}

// 手機：09 開頭共 10 碼，可含連字號或空白（例：0900-000-001）
export const isMobile = (value) => /^09\d{8}$/.test(String(value ?? "").replace(/[\s-]/g, ""));
// Email 格式（申請帳號、建立帳號、忘記密碼、登入共用）：前後空白不計，
// 「名稱@網域」，名稱與網域都不能有空白或第二個 @，網域至少含一個「.」且「.」前後都要有字（例：name@example.com）
export const isEmail = (value) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(String(value ?? "").trim());
export const EMAIL_FORMAT_ERROR = "Email 格式不正確";

// Email 欄位的錯誤訊息；沒有錯誤時回傳空字串
export function emailError(value) {
  if (!String(value ?? "").trim()) return "請填寫 Email";
  return isEmail(value) ? "" : EMAIL_FORMAT_ERROR;
}

// 守望員的身分類別（選「其他」時另填說明）
export const WATCHER_IDENTITY_TYPES = [
  { code: "village_chief", label: "里長" },
  { code: "volunteer", label: "志工" },
  { code: "community_staff", label: "社區據點人員" },
  { code: "other", label: "其他" },
];

// 依申請角色的額外欄位（註冊頁與審核畫面共用）；required 為 false 的是選填
// type：text 文字、select 選項（options）、resource 選擇資源
// showWhen：只在另一個欄位為指定值時顯示與檢查（例：身分類別選「其他」才出現說明欄）
export const ROLE_DETAIL_FIELDS = {
  reader: [
    { key: "medicalType", label: "醫事人員類別", type: "select", options: MEDICAL_TYPES, required: true },
    { key: "licenseNo", label: "醫事人員證書字號", type: "text", required: true },
    { key: "institution", label: "執業機構", type: "text", required: true },
  ],
  manager: [{ key: "employeeIdOrEmployer", label: "員工編號或聘任單位", type: "text", required: true }],
  provider: [
    { key: "resourceId", label: "要綁定的資源", type: "resource", required: true },
    { key: "orgName", label: "機構名稱", type: "text", required: true },
    { key: "registrationNo", label: "立案字號", type: "text", required: false },
    { key: "orgContact", label: "機構聯絡電話或 LINE", type: "text", required: true },
  ],
  watcher: [
    { key: "unit", label: "所屬單位或社區", type: "text", required: true, placeholder: "例：○○里辦公處、○○社區關懷據點" },
    { key: "identityType", label: "身分類別", type: "select", options: WATCHER_IDENTITY_TYPES, required: true },
    {
      key: "identityOther",
      label: "身分類別說明",
      type: "text",
      required: true,
      placeholder: "請說明您的身分",
      showWhen: { key: "identityType", value: "other" },
    },
  ],
};

// 依目前填寫的內容，這個角色要顯示的額外欄位（未符合 showWhen 的不顯示、不檢查）
export function visibleDetailFields(role, details = {}) {
  return (ROLE_DETAIL_FIELDS[role] ?? []).filter((f) => !f.showWhen || details?.[f.showWhen.key] === f.showWhen.value);
}

// 守望員的身分類別文字：選「其他」時顯示說明
export function watcherIdentityText(details = {}) {
  const label = WATCHER_IDENTITY_TYPES.find((o) => o.code === details?.identityType)?.label ?? "";
  if (details?.identityType === "other" && details.identityOther) return `其他：${details.identityOther}`;
  return label;
}

// 共同欄位（註冊頁與審核畫面顯示用）
export const APPLICATION_FIELDS = [
  { key: "name", label: "姓名" },
  { key: "email", label: "Email" },
  { key: "phone", label: "手機" },
  { key: "organization", label: "目前任職或服務單位" },
  { key: "jobTitle", label: "職稱" },
  { key: "supervisorName", label: "目前單位主管或聯絡人姓名" },
  { key: "supervisorContact", label: "目前單位主管或聯絡人電話或 Email" },
  { key: "reason", label: "申請理由" },
];

export const SUPERVISOR_HINT =
  "請填寫目前單位可協助確認身分的主管或聯絡人，審核時可能會向對方確認；沒有直屬主管者，請填機構負責人、里長等可確認身分的人。";

// 狀態歷程的動作
export const ACCOUNT_ACTIONS = [
  { code: "apply", label: "送出申請" },
  { code: "reapply", label: "重新申請" },
  { code: "approve", label: "審核通過" },
  { code: "reject", label: "審核退回" },
  { code: "suspend", label: "停用" },
  { code: "reactivate", label: "重新啟用" },
  { code: "create", label: "系統管理員建立" },
  { code: "resend_setup", label: "重新寄送設定密碼信" },
];

export const accountActionLabel = (code) => ACCOUNT_ACTIONS.find((a) => a.code === code)?.label ?? code;
