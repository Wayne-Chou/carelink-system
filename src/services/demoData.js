// 示範資料（角色預覽面板的「載入示範資料」，原型展示用）：一位虛構民眾從評估到轉介的一串資料
//   1 筆資源：綠燈、正式合作，綁定資源點示範帳號 provider@demo.carelink
//   1 筆評估：判讀人員判讀為橘燈轉介並取得同意
//   1 筆個案：由這筆評估開案，已晤談、已轉介到上面的資源，等待資源點回報
// 一律透過各 service 的正式流程建立（與頁面操作相同），不直接寫入資料
// 名稱、電話、網址皆為明顯虛構：名稱含「示範」與「（虛構）」、電話為 0000 號段、網址為 example.com

import { DEMO_ACCOUNTS } from "../config/roles.js";
import { DATA_KEYS, readList, writeList } from "./storage.js";
import { createResource, getAllResources } from "./resourceService.js";
import { createAssessment, getAllAssessments, reviewAssessment } from "./assessmentService.js";
import { addLinkage, advanceStage, getAllCases, recordFirstContact, updateCase } from "./caseService.js";
import { bindProviderAccount } from "../utils/auth.js";
import { todayString } from "../utils/date.js";

// 用名稱辨識示範資料（資料本身不另加標記）
export const DEMO_NAMES = {
  resource: "示範社區健走班（虛構）",
  person: "王示範（虛構民眾）",
};

const accountOf = (role) => DEMO_ACCOUNTS.find((a) => a.role === role);

const DEMO_RESOURCE = {
  name: DEMO_NAMES.resource,
  organization: "示範社區發展協會（虛構）",
  description: "每週二、四早上由教練帶領長者在社區公園健走，結束後一起喝茶聊天。",
  needTags: ["exercise", "companionship"],
  staff: [{ name: "陳範例", role: "健走教練", license: "國民體適能指導員", experience: "帶領長者運動 5 年" }],
  capacity: { type: "limited", limit: 20 },
  availability: { type: "available", slots: 6, nextBatch: null },
  schedule: {
    type: "regular",
    frequency: "weekly",
    weekdays: [2, 4],
    monthDays: [],
    startTime: "07:00",
    endTime: "08:00",
  },
  placeName: "示範公園涼亭",
  address: { zip: "970", city: "花蓮縣", district: "花蓮市", detail: "示範路 100 號旁" },
  geo: { lat: 23.976, lng: 121.6048 },
  verifiedBy: { type: "team", name: "王範例" },
  status: "active",
  riskCriteria: {
    management: "green",
    insurance: "green",
    environment: "green",
    complaints: "green",
    staffQualification: "green",
  },
  highRisk: { isHighRisk: false, types: [] },
  riskChangeNote: "首次評估，五項條件皆為綠燈",
  ageGroups: ["senior"],
  identities: ["all"],
  participation: "walk_in",
  languages: ["mandarin", "taiwanese"],
  transport: ["public_transit", "dropoff"],
  transportNote: { publicTransit: "市區公車「示範公園站」下車即達", shuttle: null, other: null },
  accessibility: ["senior_friendly"],
  fee: { type: "free", detail: null },
  notice: "請穿輕便服裝與平底鞋",
  partnership: "formal",
  publicContact: { name: "陳範例", phone: "03-0000-0001", emailOrLine: "demo-walk@example.com" },
  adminContact: { sameAsPublic: true, name: null, phone: null, emailOrLine: null },
  followUpMethods: ["provider_contact"],
  links: ["https://example.com/demo-walk"],
  keywords: ["健走", "運動", "長者", "免費", "交朋友"],
  scenarios: "適合一個人在家、想出門活動又想認識朋友的長者",
};

// 民眾的答案：Q1、Q2 答否，其餘答是；Q11 勾社區活動引導
const DEMO_ANSWERS = {
  q1: "no",
  q2: "no",
  q3: "yes",
  q4: "yes",
  q5: "yes",
  q6: "yes",
  q7: "yes",
  q8: "yes",
  q9: "yes",
  q10: "yes",
  q11: ["q11_activity"],
  q12: "老伴走了以後很少出門，想找附近可以活動、認識朋友的地方",
};

/**
 * 目前的示範資料（以名稱辨識）；沒有載入時各項為 null
 * @returns {{ resource: object|null, assessment: object|null, case: object|null }}
 */
export function findDemoData() {
  return {
    resource: getAllResources().find((r) => r.name === DEMO_NAMES.resource) ?? null,
    assessment: getAllAssessments().find((a) => a.person?.name === DEMO_NAMES.person) ?? null,
    case: getAllCases().find((c) => c.person?.name === DEMO_NAMES.person) ?? null,
  };
}

// 目前的資料筆數（載入前的確認訊息使用）
export function countData() {
  return Object.fromEntries(DATA_KEYS.map((key) => [key, readList(key).length]));
}

/**
 * 載入示範資料：清空所有資源、評估、個案後，依正式流程建立一串示範資料
 * 帳號、資源點綁定以外的帳號資料不受影響；資源點示範帳號改綁到示範資源
 * @returns {{ resource: object, assessment: object, case: object }}
 */
export function loadDemoData({ today = todayString() } = {}) {
  for (const key of DATA_KEYS) writeList(key, []);

  const reader = accountOf("reader");
  const manager = accountOf("manager");
  const provider = accountOf("provider");

  // 1. 資源：綠燈、正式合作，綁定資源點示範帳號
  const resource = createResource({ ...structuredClone(DEMO_RESOURCE), lastVerifiedAt: today });
  bindProviderAccount(provider.email, resource.id);

  // 2. 評估：民眾填表 → 判讀人員判讀為橘燈轉介並取得同意（同時開案）
  const filled = createAssessment({
    person: { name: DEMO_NAMES.person },
    fillMode: "oral",
    fillNote: "示範資料：由判讀人員協助唸題",
    answers: DEMO_ANSWERS,
  });
  const reviewed = reviewAssessment(
    filled.id,
    {
      readerName: reader.name,
      readerType: reader.readerType,
      q12Note: "獨居，平日很少出門，對社區活動有興趣但不知道從哪裡開始",
      light: "orange",
      orangeType: "refer",
      consent: true,
      confirmedTags: ["exercise", "companionship"],
    },
    { managerName: manager.name, actor: reader.name, openCase: true }
  );
  if (!reviewed.ok) throw new Error(`示範評估判讀失敗：${JSON.stringify(reviewed.errors)}`);

  // 3. 個案：首次聯繫與晤談 → 進入連結 → 轉介到示範資源，等待資源點回報
  const caseId = reviewed.case.id;
  recordFirstContact(caseId, { actor: manager.name });
  updateCase(caseId, {
    consultation: {
      whatMatters: "每週能出門和朋友一起活動",
      goals: ["每週參加兩次社區活動"],
    },
  });
  const advanced = advanceStage(caseId, { actor: manager.name });
  if (!advanced.ok) throw new Error(`示範個案無法進入連結階段：${advanced.reasons.join("、")}`);
  addLinkage(caseId, { resourceId: resource.id, reason: "離家近、免費，可以認識朋友" }, { actor: manager.name });

  return findDemoData();
}
