// 生活近況評估與個案流程的設定值（doc/assessment-schema.md 第九節）
// 對話指引標註「待驗證」的週期都集中在這裡，確認後改設定即可

// ── 第九節：週期與門檻 ──────────────────────────────────────

// 橘燈開案後首次聯繫期限（小時）；簡報：48–72 小時
export const FIRST_CONTACT_HOURS = 72;

// 連結後的追蹤排程（月）
export const FOLLOW_UP_MONTHS = [1, 3, 6];

// 黃燈：幾個月後確認是否前往（待驗證）
export const YELLOW_RECHECK_MONTHS = 3;

// 綠燈：幾個月後提醒重新評估（待驗證）
export const GREEN_REASSESS_MONTHS = 12;

// 橘燈保留：連續婉拒幾次後延長再確認間隔
export const ORANGE_DECLINE_LIMIT = 3;

// 橘燈保留：延長後的再確認間隔（月，待驗證）
export const ORANGE_EXTENDED_MONTHS = 6;

// 連結狀態 pending 超過幾天列入「資源點未回報」（待驗證）
export const PROVIDER_REPORT_DAYS = 14;

// Q11 勾選幾項以上（不含「目前沒有其他需要」）提示需求可能交織
export const Q11_INTERWOVEN_COUNT = 3;

// ── 第十節待確認事項的假設，確認後改這裡即可 ──────────────────

// 待確認事項：「身分證字號在原型階段是否可以只存後四碼或完全不存？」
// "full"：存完整字號，畫面只顯示遮罩；"last4"：只存後四碼；"none"：不存
// 原型階段只用假資料，預設只存後四碼
export const NATIONAL_ID_STORAGE = "last4";

// 待確認事項：「黃燈民眾選擇『請專人陪同』時，是否應改判橘燈並開案？」
// true：判讀時提示考慮改判橘燈（只提示，不自動改判）；false：不提示
export const YELLOW_ESCORT_SUGGESTS_ORANGE = true;

// 待確認事項：「追蹤 1、3、6 個月是從『連結成功』起算，還是從『開案』起算？」
// "linked"：建立連結時產生排程，從連結日起算（第六節目前寫法）
// "success"：連結狀態改為成功時才產生排程，從成功日起算
// "opened"：建立連結時產生排程，從開案日起算
export const FOLLOW_UP_START = "linked";

// ── 實作階段開關 ────────────────────────────────────────────

// 判讀為橘燈轉介或退縮時是否立即開案
// true：判讀送出時自動開案（步驟 3 個案頁改用 caseService 後啟用）
// false：判讀照常儲存但不開案，由 getPendingCaseOpenings() 列出待開案的評估；
//        改回 true 後，網站啟動時 openPendingCases() 會替這些評估補開案
export const AUTO_OPEN_CASE = true;

// ── 代碼表 ──────────────────────────────────────────────

export const LIGHTS = ["red", "orange", "yellow", "green"];
export const ORANGE_TYPES = ["refer", "hesitant", "reserved"];
// 會開案的橘燈類型（第五節）
export const CASE_OPENING_ORANGE_TYPES = ["refer", "hesitant"];
export const RED_REASONS = ["suicide", "violence", "psychosis", "homeless", "basic_needs"];
export const READER_TYPES = ["doctor", "nurse", "dietitian", "other"];
// 待確認事項：「民眾在候診時是用平板自填，還是紙本填寫後由工作人員輸入？」
// 目前兩者都支援：self 自行填答（平板）；oral、proxy 由工作人員協助或代為輸入
export const FILL_MODES = ["self", "oral", "proxy"];
export const ANSWER_VALUES = ["yes", "no", "skip"];
export const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"];
export const EXTRA_ASSESSMENTS = ["bsrs5", "phq9", "icope"];
// voided：已作廢（不刪除資料，不列入待辦與下次確認日期計算）
// 待確認事項：「評估紀錄是否允許作廢，作廢需要什麼權限？」目前任何登入者都可作廢，已開案的評估除外
export const ASSESSMENT_STATUSES = ["filled", "reviewed", "closed", "voided"];
