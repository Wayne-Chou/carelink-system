// 示範資源：示範情境「林示範的故事」使用的 4 筆花蓮縣虛構資源（doc/demo-guide.md）
// 機構、人名、電話、網址皆為虛構：名稱含「示範／範例」、電話為 0000 號段、網址為 example.com
// 每筆帶 isDemo: true；日期依載入當天產生（createDemoResources(today)）
//
// 組成（tests/demoResources.test.js 會逐項檢查）：
//   Res001 示範社區太極班（花蓮市｜綠燈）：故事主線，資源點示範帳號綁定這筆
//   Res002 範例長青共餐食堂（吉安鄉｜綠燈）、Res003 示範關懷據點歌唱班（花蓮市｜黃燈，轉介時提示需陪同）：轉介選單的其他選項
//   Res004 範例園藝療癒小組（新城鄉｜暫停）：展示暫停中的資源不出現在轉介選單

import { derivePrescriptionTypes } from "../config/needTags.js";
import { VERIFY_INTERVAL_MONTHS, VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW } from "../config/resourceRules.js";
import { addDays, addMonths, todayString } from "../utils/date.js";

// 示範資源的 id 固定（資源點示範帳號以 id 綁定 Res001，見 config/roles.js）
export const DEMO_RESOURCE_IDS = {
  Res001: "5f0c1a2b-7d3e-4c5a-9b1f-0a1b2c3d0001",
  Res002: "5f0c1a2b-7d3e-4c5a-9b1f-0a1b2c3d0002",
  Res003: "5f0c1a2b-7d3e-4c5a-9b1f-0a1b2c3d0003",
  Res004: "5f0c1a2b-7d3e-4c5a-9b1f-0a1b2c3d0004",
};

// 測試用的固定基準日；實際載入時一律用載入當天
export const DEMO_BASE_DATE = "2026-10-14";

const CRITERIA_ALL_GREEN = {
  management: "green",
  insurance: "green",
  environment: "green",
  complaints: "green",
  staffQualification: "green",
};
const SAME_AS_PUBLIC = { sameAsPublic: true, name: null, phone: null, emailOrLine: null };
const NO_HIGH_RISK = { isHighRisk: false, types: [] };
const weekly = (weekdays, startTime, endTime) => ({
  type: "regular",
  frequency: "weekly",
  weekdays,
  monthDays: [],
  startTime,
  endTime,
});

// 共用的管理欄位：兩年前建立、上個月驗證；預計驗證日期依規則（黃燈 3 個月、其他 6 個月）
function managed(code, today, riskLevel, patch = {}) {
  const lastVerifiedAt = addDays(today, -30);
  const months = riskLevel === "yellow" ? VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW : VERIFY_INTERVAL_MONTHS;
  const createdAt = `${addMonths(today, -24)}T09:00:00+08:00`;
  return {
    id: DEMO_RESOURCE_IDS[code],
    isDemo: true,
    code,
    verifiedBy: { type: "team", name: "王示範" },
    lastVerifiedAt,
    nextVerifyAt: addMonths(lastVerifiedAt, months),
    status: "active",
    pauseReason: null,
    resumeAt: null,
    seasonalNote: null,
    createdAt,
    updatedAt: `${lastVerifiedAt}T09:00:00+08:00`,
    ...patch,
  };
}

const withTypes = (resource) => ({ ...resource, prescriptionTypes: derivePrescriptionTypes(resource.needTags) });

export function createDemoResources(today = todayString()) {
  return [
    // 1. 花蓮市｜綠燈｜正式合作｜每週二、四早上 → 故事主線：林示範轉介到這裡
    withTypes({
      ...managed("Res001", today, "green"),
      name: "示範社區太極班",
      organization: "示範社區發展協會",
      description: "教練每週二、四早上在社區公園帶領長者太極拳，動作和緩，結束後一起喝茶聊天。",
      needTags: ["exercise", "companionship"],
      needTagOther: null,
      staff: [{ name: "陳範例", role: "太極拳教練", license: "國民體適能指導員", experience: "帶領長者太極 8 年" }],
      capacity: { type: "limited", limit: 25 },
      availability: { type: "available", slots: 8, nextBatch: null },
      schedule: weekly([2, 4], "07:00", "08:00"),
      placeName: "示範公園涼亭",
      address: { zip: "970", city: "花蓮縣", district: "花蓮市", detail: "示範路 100 號旁" },
      geo: { lat: 23.976, lng: 121.6048 },
      riskLevel: "green",
      riskCriteria: CRITERIA_ALL_GREEN,
      highRisk: NO_HIGH_RISK,
      riskChangeNote: "首次評估，五項條件皆為綠燈",
      ageGroups: ["senior"],
      identities: ["all"],
      identityOther: null,
      notSuitableFor: "無法站立 30 分鐘者",
      participation: "walk_in",
      participationOther: null,
      languages: ["mandarin", "taiwanese"],
      indigenousTribe: null,
      languageOther: null,
      transport: ["public_transit", "dropoff"],
      transportNote: { publicTransit: "市區公車「示範公園站」下車即達", shuttle: null, other: null },
      accessibility: ["senior_friendly"],
      accessibilityOther: null,
      fee: { type: "free", detail: null },
      notice: "請穿輕便服裝與平底鞋，雨天改在社區活動中心",
      partnership: "formal",
      publicContact: { name: "陳範例", phone: "03-0000-0001", emailOrLine: "demo-taichi@example.com" },
      adminContact: SAME_AS_PUBLIC,
      followUpMethods: ["provider_contact"],
      followUpOther: null,
      links: ["https://example.com/demo-taichi"],
      keywords: ["太極", "運動", "長者", "免費", "交朋友"],
      scenarios: "適合一個人在家、想出門活動筋骨又想認識朋友的長者",
    }),

    // 2. 吉安鄉｜綠燈｜正式合作｜每週一三五中午 → 轉介選單的其他選項
    withTypes({
      ...managed("Res002", today, "green"),
      name: "範例長青共餐食堂",
      organization: "範例社區關懷協會",
      description: "每週一、三、五中午提供營養午餐，長輩一起用餐、聊天，飯後有簡單的健康講座。",
      needTags: ["food", "companionship"],
      needTagOther: null,
      staff: [{ name: "黃示例", role: "餐食督導", license: "營養師", experience: "社區供餐規劃 6 年" }],
      capacity: { type: "limited", limit: 40 },
      availability: { type: "available", slots: 10, nextBatch: null },
      schedule: weekly([1, 3, 5], "11:30", "13:00"),
      placeName: "範例社區活動中心",
      address: { zip: "973", city: "花蓮縣", district: "吉安鄉", detail: "範例路 20 號" },
      geo: { lat: 23.9681, lng: 121.5665 },
      riskLevel: "green",
      riskCriteria: CRITERIA_ALL_GREEN,
      highRisk: NO_HIGH_RISK,
      riskChangeNote: "首次評估，五項條件皆為綠燈",
      ageGroups: ["senior"],
      identities: ["living_alone"],
      identityOther: null,
      notSuitableFor: "需特殊飲食調整（如管灌）者",
      participation: "registration",
      participationOther: null,
      languages: ["mandarin", "taiwanese"],
      indigenousTribe: null,
      languageOther: null,
      transport: ["dropoff", "parking"],
      transportNote: { publicTransit: null, shuttle: null, other: null },
      accessibility: ["barrier_free", "senior_friendly"],
      accessibilityOther: null,
      fee: { type: "subsidized", detail: "每餐 30 元，中低收入長者免費" },
      notice: "請提前一天電話報名",
      partnership: "formal",
      publicContact: { name: "黃示例", phone: "03-0000-0002", emailOrLine: "LINE：demo_meal" },
      adminContact: SAME_AS_PUBLIC,
      followUpMethods: ["manager_contact"],
      followUpOther: null,
      links: ["https://example.com/demo-meal"],
      keywords: ["共餐", "午餐", "長者", "交朋友"],
      scenarios: "適合獨居、三餐常隨便解決，想有人一起吃飯的長者",
    }),

    // 3. 花蓮市｜黃燈｜口頭確認｜每週三下午 → 轉介時提示需健康管理員陪同
    withTypes({
      ...managed("Res003", today, "yellow"),
      name: "示範關懷據點歌唱班",
      organization: "示範部落文化協會",
      description: "每週三下午在關懷據點唱歌、跳簡單的律動，也會教唱族語歌謠。",
      needTags: ["arts_culture", "companionship"],
      needTagOther: null,
      staff: [{ name: "張範本", role: "帶唱老師", license: "社區照顧關懷據點志工訓練結業", experience: "帶領長者歌唱 4 年" }],
      capacity: { type: "limited", limit: 30 },
      availability: { type: "available", slots: 5, nextBatch: null },
      schedule: weekly([3], "14:00", "16:00"),
      placeName: "示範社區關懷據點",
      address: { zip: "970", city: "花蓮縣", district: "花蓮市", detail: "示範街 8 號 2 樓" },
      geo: { lat: 23.983, lng: 121.609 },
      riskLevel: "yellow",
      riskCriteria: { ...CRITERIA_ALL_GREEN, environment: "yellow" },
      highRisk: NO_HIGH_RISK,
      riskChangeNote: "據點位於 2 樓、沒有電梯，環境安全調整為黃燈",
      ageGroups: ["senior"],
      identities: ["all"],
      identityOther: null,
      notSuitableFor: "無法自行上下樓梯者",
      participation: "walk_in",
      participationOther: null,
      languages: ["mandarin", "indigenous"],
      indigenousTribe: "阿美族",
      languageOther: null,
      transport: ["public_transit"],
      transportNote: { publicTransit: "市區公車「示範街口站」步行 3 分鐘", shuttle: null, other: null },
      accessibility: ["senior_friendly", "culture_friendly"],
      accessibilityOther: null,
      fee: { type: "free", detail: null },
      notice: "據點在 2 樓，沒有電梯",
      partnership: "verbal",
      publicContact: { name: "張範本", phone: "03-0000-0003", emailOrLine: "demo-sing@example.com" },
      adminContact: SAME_AS_PUBLIC,
      followUpMethods: ["manager_contact"],
      followUpOther: null,
      links: ["https://example.com/demo-sing"],
      keywords: ["唱歌", "律動", "族語", "長者"],
      scenarios: "適合喜歡唱歌、想找人一起熱鬧的長者",
    }),

    // 4. 新城鄉｜綠燈｜正式合作｜暫停 → 不出現在探索頁與轉介選單
    withTypes({
      ...managed("Res004", today, "green", {
        status: "paused",
        pauseReason: "園區整修中",
        resumeAt: addMonths(today, 2),
      }),
      name: "範例園藝療癒小組",
      organization: "範例農業推廣協會",
      description: "由園藝治療師帶領種植香草與蔬菜，在照顧植物的過程中放鬆心情。",
      needTags: ["nature", "mental"],
      needTagOther: null,
      staff: [{ name: "吳示範", role: "園藝治療師", license: "園藝治療師認證", experience: "長者園藝活動 5 年" }],
      capacity: { type: "limited", limit: 12 },
      availability: { type: "realtime", slots: 0, nextBatch: null },
      schedule: weekly([6], "09:00", "11:00"),
      placeName: "範例療癒農園",
      address: { zip: "971", city: "花蓮縣", district: "新城鄉", detail: "範例路 3 段 50 號" },
      geo: { lat: 24.0395, lng: 121.604 },
      riskLevel: "green",
      riskCriteria: CRITERIA_ALL_GREEN,
      highRisk: NO_HIGH_RISK,
      riskChangeNote: "首次評估，五項條件皆為綠燈",
      ageGroups: ["senior", "adult"],
      identities: ["all"],
      identityOther: null,
      notSuitableFor: "對花粉嚴重過敏者",
      participation: "referral_only",
      participationOther: null,
      languages: ["mandarin", "taiwanese"],
      indigenousTribe: null,
      languageOther: null,
      transport: ["shuttle"],
      transportNote: { publicTransit: null, shuttle: "每週六 8:30 自新城鄉公所前接駁", other: null },
      accessibility: ["senior_friendly"],
      accessibilityOther: null,
      fee: { type: "free", detail: null },
      notice: "請自備帽子與水壺",
      partnership: "formal",
      publicContact: { name: "吳示範", phone: "03-0000-0004", emailOrLine: "demo-garden@example.com" },
      adminContact: SAME_AS_PUBLIC,
      followUpMethods: ["provider_contact"],
      followUpOther: null,
      links: ["https://example.com/demo-garden"],
      keywords: ["園藝", "種菜", "放鬆"],
      scenarios: "適合心情低落、喜歡親近自然的民眾",
    }),
  ];
}

// 以固定基準日產生的示範資源（測試與 resourceService.loadDemoResources 的預設值）
export const DEMO_RESOURCES = createDemoResources(DEMO_BASE_DATE);
