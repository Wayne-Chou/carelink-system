// 推薦規則、風險計算與驗證週期（doc/resource-schema.md 第三、九節）

// ── 驗證週期（月） ──────────────────────────────────────────
export const VERIFY_INTERVAL_MONTHS = 6;
export const VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW = 3;

// ── 表單驗證模式 ──────────────────────────────────────────
// 規格定案後改為 true。
// false（原型階段）：只有資源名稱必填，其他必填欄位改為「建議填寫」，未填不阻擋送出；格式錯誤仍會阻擋
// true：依 doc/resource-schema.md 的必填欄完整檢核
export const STRICT_VALIDATION = false;

// ── 待確認事項的假設（第十一節），確認後改這裡即可 ─────────────

// 「整體風險等級是否取五項條件中最差的一項？」
// "worst"：取最差一項；"manual"：不自動計算，沿用人工填寫的 riskLevel
export const OVERALL_RISK_STRATEGY = "worst";

// 「尚未確認合作的資源，民眾探索頁是否也要隱藏？」
// true：探索頁與轉介選單都隱藏（第九節表格的寫法）；false：只從轉介選單隱藏
export const HIDE_UNCONFIRMED_IN_EXPLORE = true;

// 原型階段可不填風險判斷條件，riskLevel 可能為空
// true：沒有風險等級（未做風險評估）的資源不推薦，不出現在探索頁與轉介選單
export const REQUIRE_RISK_LEVEL_FOR_RECOMMEND = true;

// 「新開發資源的定義」
// 假設：最後驗證日距離建立日不到 N 個月，視為新開發資源，驗證週期改用 3 個月
export const NEW_RESOURCE_WINDOW_MONTHS = 6;

// 「人員資格只有綠燈與紅燈，是否刻意沒有黃燈？」
// false：staffQualification 若填 yellow，計算時視為 red
export const STAFF_QUALIFICATION_ALLOW_YELLOW = false;

// 「人力配置的姓名、證照是否在民眾端公開，或僅後台可見？」
// false：民眾端資源頁不顯示人力配置；true：顯示角色、姓名、證照與經驗
export const SHOW_STAFF_TO_PUBLIC = false;

// 「生活情境的文字是否適合直接給民眾看？」
// true：民眾端資源頁在「適合誰參加」顯示生活情境（scenarios）；false：僅供搜尋與後台使用
export const SHOW_SCENARIOS_TO_PUBLIC = true;

// 「處方類型是否同意由需求標籤自動推得，不另外勾選？」
// true：儲存時一律以標籤重新推得 prescriptionTypes，覆蓋手動值
export const DERIVE_PRESCRIPTION_TYPES_FROM_TAGS = true;

// ── 風險 ──────────────────────────────────────────────────
export const RISK_LEVELS = ["green", "yellow", "red"];
export const RISK_CRITERIA_KEYS = [
  "management",
  "insurance",
  "environment",
  "complaints",
  "staffQualification",
];

const RISK_SEVERITY = { green: 0, yellow: 1, red: 2 };

// 五項條件任一項未填時回傳 null，由呼叫端沿用既有 riskLevel
export function computeOverallRisk(riskCriteria) {
  if (OVERALL_RISK_STRATEGY !== "worst" || !riskCriteria) return null;
  const levels = RISK_CRITERIA_KEYS.map((key) => {
    const level = riskCriteria[key];
    if (key === "staffQualification" && level === "yellow" && !STAFF_QUALIFICATION_ALLOW_YELLOW) {
      return "red";
    }
    return level;
  });
  if (levels.some((level) => !(level in RISK_SEVERITY))) return null;
  return levels.reduce((worst, level) =>
    RISK_SEVERITY[level] > RISK_SEVERITY[worst] ? level : worst
  );
}

// 高風險情境成立且沒有任何人員持有證照 → staffQualification 設為 red
// 回傳新物件，不修改傳入的 resource
export function applyHighRiskRule(resource) {
  const staff = Array.isArray(resource.staff) ? resource.staff : [];
  const hasLicense = staff.some((s) => String(s?.license ?? "").trim());
  if (!resource.highRisk?.isHighRisk || hasLicense) return resource;
  return {
    ...resource,
    riskCriteria: { ...resource.riskCriteria, staffQualification: "red" },
  };
}

// ── 推薦規則 ──────────────────────────────────────────────
// context："explore" 民眾探索頁；"referral" 健康管理員轉介選單
export function isRecommendable(resource, context = "referral") {
  if (!resource || resource.status !== "active") return false;
  if (resource.riskLevel === "red") return false;
  if (REQUIRE_RISK_LEVEL_FOR_RECOMMEND && !RISK_LEVELS.includes(resource.riskLevel)) return false;
  if (resource.partnership === "unconfirmed") {
    return context === "explore" && !HIDE_UNCONFIRMED_IN_EXPLORE;
  }
  return true;
}

// 第九節表格的畫面提示代碼，由頁面對照成中文
//   needs_escort    黃燈：轉介時提示需健康管理員陪同至少一次
//   risk_tracking   紅燈：後台列為持續追蹤
//   contact_needed  合作尚未確認：後台提示需聯繫確認
//   paused          暫停：後台顯示預計恢復日期
//   seasonal        季節性關閉：後台顯示週期說明
//   terminated      終止：保留資料供歷史個案查詢
//   risk_unassessed 尚未完成風險評估（REQUIRE_RISK_LEVEL_FOR_RECOMMEND 為 true 時因此不推薦）
export function getRecommendationHints(resource) {
  if (!resource) return [];
  const hints = [];
  if (resource.status === "paused") hints.push("paused");
  if (resource.status === "seasonal") hints.push("seasonal");
  if (resource.status === "terminated") hints.push("terminated");
  if (resource.partnership === "unconfirmed") hints.push("contact_needed");
  if (!RISK_LEVELS.includes(resource.riskLevel)) hints.push("risk_unassessed");
  if (resource.riskLevel === "red") hints.push("risk_tracking");
  if (resource.riskLevel === "yellow") hints.push("needs_escort");
  return hints;
}

// 資源在探索頁與轉介選單是否顯示，以及不顯示的原因代碼（同 getRecommendationHints）
// 回傳 { explore: { visible, reasons }, referral: { visible, reasons } }
// needs_escort 只是轉介提示，不會造成隱藏，因此不列入 reasons
export function getVisibility(resource) {
  const blocking = getRecommendationHints(resource).filter(
    (code) =>
      code !== "needs_escort" && (code !== "risk_unassessed" || REQUIRE_RISK_LEVEL_FOR_RECOMMEND)
  );
  const exploreReasons = blocking.filter(
    (code) => code !== "contact_needed" || HIDE_UNCONFIRMED_IN_EXPLORE
  );
  return {
    explore: { visible: isRecommendable(resource, "explore"), reasons: exploreReasons },
    referral: { visible: isRecommendable(resource, "referral"), reasons: blocking },
  };
}
