// 資源編輯的欄位設定：資源點可以修改的欄位、修改紀錄的欄位名稱（doc/specs/resource-schema.md 第十四節）
// 欄位以資源資料的第一層 key 為單位（例：schedule 整組、address 整組）

// 資源點（resource.editOwn）可以修改的欄位；修改後直接生效，不需審核
//   其餘欄位（風險評級、合作狀態、驗證資訊、資源狀態、需求標籤、行政聯絡人、追蹤方式、AI 輔助欄位）對資源點唯讀
export const PROVIDER_EDITABLE_FIELDS = [
  // 資源內容
  "name",
  "organization",
  "description",
  "staff",
  "placeName",
  "address",
  "geo",
  // 服務週期與時間
  "schedule",
  // 可容納人數與服務量能
  "capacity",
  "availability",
  // 適用對象與可近性
  "ageGroups",
  "identities",
  "identityOther",
  "notSuitableFor",
  "participation",
  "participationOther",
  "languages",
  "indigenousTribe",
  "languageOther",
  "transport",
  "transportNote",
  "accessibility",
  "accessibilityOther",
  // 參與須知、費用
  "notice",
  "fee",
  // 公眾聯絡方式、相關連結
  "publicContact",
  "links",
];

export const isProviderEditable = (field) => PROVIDER_EDITABLE_FIELDS.includes(field);

// 修改紀錄不記錄的欄位：識別資料、系統時間，以及由其他欄位自動推得的欄位
export const CHANGE_LOG_IGNORED_FIELDS = ["id", "code", "createdAt", "updatedAt", "changeLog", "prescriptionTypes", "nextVerifyAt"];

// 修改紀錄顯示的欄位名稱
export const FIELD_LABELS = {
  verifiedBy: "驗證者",
  lastVerifiedAt: "最後驗證日期",
  nextVerifyAt: "預計驗證日期",
  status: "資源狀態",
  pauseReason: "暫停原因",
  resumeAt: "預計恢復日期",
  seasonalNote: "季節性說明",
  name: "資源名稱",
  organization: "所屬單位",
  description: "資源說明",
  prescriptionTypes: "處方類型",
  needTags: "需求標籤",
  needTagOther: "其他標籤",
  staff: "人力配置",
  capacity: "可容納人數",
  availability: "服務量能",
  schedule: "服務週期與時間",
  placeName: "地點名稱",
  address: "地址",
  geo: "座標",
  riskLevel: "整體風險等級",
  riskCriteria: "風險判斷條件",
  highRisk: "高風險情境",
  riskChangeNote: "風險調整說明",
  ageGroups: "適合年齡",
  identities: "適合身分",
  identityOther: "其他身分",
  notSuitableFor: "不適合對象",
  participation: "參與方式",
  participationOther: "其他參與方式",
  languages: "使用語言",
  indigenousTribe: "原住民族語族別",
  languageOther: "其他語言",
  transport: "交通方式",
  transportNote: "交通說明",
  accessibility: "無障礙與友善設施",
  accessibilityOther: "其他無障礙設施",
  fee: "費用",
  notice: "參與須知",
  partnership: "合作狀態",
  publicContact: "公眾聯絡人",
  adminContact: "行政聯絡人",
  followUpMethods: "追蹤方式",
  followUpOther: "其他追蹤方式",
  links: "相關連結",
  keywords: "關鍵字",
  scenarios: "對應生活情境",
};

export const fieldLabel = (field) => FIELD_LABELS[field] ?? field;
