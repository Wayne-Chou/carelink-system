// 示範個案：8 筆虛構個案，新格式（doc/assessment-schema.md 第六節，由 caseService 讀寫）
// 姓名皆含「示範／範例／示例／範本」，電話為 0900-000 號段
// 每筆帶 isDemo: true，可與示範資源、評估一起一鍵移除
// 日期以 2026-10-14 為「載入當天」撰寫，載入時依實際日期平移（見 demoService.js 的 DEMO_BASE_DATE）
//
// 階段分布：辨識 1、諮詢 1、連結 3、追蹤 2、已結案 1
//   由評估開案：周範例 ← Ast002（橘燈轉介）、呂示例 ← Ast003（橘燈退縮），從諮詢階段開始（見 demoAssessments.js）
//   連結：呂示例連到黃燈 Res001（提示需陪同）；曾範本連到暫停中的 Res004（提示需重新選擇）；潘範例待資源端回報
//   追蹤排程依 FOLLOW_UP_START（linked）從連結日起算 1、3、6 個月；方範本的 1 個月追蹤已到期
// 資源端後台：Res001、Res002 各有 2 筆轉介個案，各含「待回報」與「成功」；Res003 有 1 筆成功
// 逾期未聯繫：李示範開案超過 72 小時尚未首次聯繫

import { FOLLOW_UP_MONTHS } from "../config/assessmentRules.js";
import { addMonths } from "../utils/date.js";

const MANAGER = "高示範";
const at = (date, time = "10:00") => `${date}T${time}:00+08:00`;
const h = (stage, date, action, note, actor = MANAGER) => ({ stage, date, at: at(date), actor, action, note });

// 示範資源（見 demoResources.js）
const WALKING = { id: "7c1e2a40-5b3d-4f1a-9e2c-1a2b3c4d5e6f", name: "湳興河濱長者健走班" }; // Res001 黃燈
const MEAL = { id: "d3a1f0b2-1c4e-4a6b-8d2f-0a1b2c3d4e02", name: "範例里社區共餐食堂" }; // Res002
const CAREGIVER = { id: "d3a1f0b2-1c4e-4a6b-8d2f-0a1b2c3d4e04", name: "範例照顧者喘息支持團體" }; // Res003
const REPAIR = { id: "d3a1f0b2-1c4e-4a6b-8d2f-0a1b2c3d4e06", name: "示範居家安全修繕服務" }; // Res004 暫停

// 依連結日產生 1、3、6 個月追蹤排程；done 以 round 指定已完成的追蹤
function followUps(linkedAt, done = {}) {
  return FOLLOW_UP_MONTHS.map((round) => ({
    round,
    plannedAt: addMonths(linkedAt, round),
    doneAt: null,
    attendance: null,
    participation: null,
    impact: null,
    note: "",
    ...(done[round] || {}),
  }));
}

const linkage = (resource, linkedAt, patch = {}) => ({
  resourceId: resource.id,
  resourceName: resource.name,
  reason: "",
  linkedAt,
  escortNeeded: false,
  status: "pending",
  attendance: null,
  providerNote: "",
  ...patch,
});

const EMPTY_CONSULTATION = { firstContactAt: null, whatMatters: "", needTags: [], goals: [], note: "" };
const EMPTY_CLOSURE = { reason: "", closedAt: null, returnedToMedical: false, reentryExplained: false, note: "" };

export const DEMO_CASES = [
  // 1. 辨識：剛轉介，尚未取得同意，也尚未首次聯繫（已超過 72 小時，列為逾期未聯繫）
  {
    id: "case_demo_01",
    code: "Case001",
    isDemo: true,
    stage: 1,
    managerName: MANAGER,
    createdAt: at("2026-10-03"),
    updatedAt: at("2026-10-03"),
    person: { name: "李示範", nationalId: "", phone: "0900-000-001", livingAlone: true },
    referral: {
      referrerType: "medical",
      referrerName: "郭範例醫師",
      assessmentId: null,
      assessmentCode: null,
      reason: "家醫科門診轉介：獨居，近半年很少出門，醫師建議多參加社區活動",
      consent: false,
      consentAt: null,
    },
    consultation: EMPTY_CONSULTATION,
    linkages: [],
    followUps: [],
    closure: EMPTY_CLOSURE,
    history: [h(1, "2026-10-03", "create", "建立個案")],
  },

  // 2. 諮詢：由評估 Ast002（橘燈轉介）開案，已首次聯繫，晤談進行中（尚未填「對我而言什麼最重要」與目標）
  {
    id: "case_demo_02",
    code: "Case002",
    isDemo: true,
    stage: 2,
    managerName: MANAGER,
    createdAt: at("2026-09-26", "10:30"),
    updatedAt: at("2026-09-28", "14:00"),
    person: { name: "周範例", nationalId: "", phone: "0900-000-002", livingAlone: false },
    referral: {
      referrerType: "medical",
      referrerName: "杜範例",
      assessmentId: "ast_demo_02",
      assessmentCode: "Ast002",
      reason: "生活近況評估 Ast002：橘燈（轉介）；Q11：社區活動引導、想找人聊聊",
      consent: true,
      consentAt: at("2026-09-26", "10:30"),
    },
    consultation: {
      firstContactAt: at("2026-09-28", "14:00"),
      whatMatters: "",
      needTags: ["companionship", "exercise"],
      goals: [],
      note:
        "Q12 民眾填寫：退休以後每天不知道要做什麼\n" +
        "Q12 談話紀錄：退休兩年，糖尿病控制不穩，生活缺少重心，希望有人一起討論接下來的安排\n" +
        "初訪：對運動有興趣，但擔心運動時血糖過低，下次訪談再確認參與意願",
    },
    linkages: [],
    followUps: [],
    closure: EMPTY_CLOSURE,
    history: [
      h(2, "2026-09-26", "create", "建立個案", "杜範例"),
      h(2, "2026-09-26", "open_from_assessment", "由評估 Ast002 開案（橘燈轉介），進入諮詢階段", "杜範例"),
      h(2, "2026-09-28", "first_contact", "首次聯繫"),
    ],
  },

  // 3. 連結：已連結黃燈資源 Res001，等待資源端回報
  {
    id: "case_demo_03",
    code: "Case003",
    isDemo: true,
    stage: 3,
    managerName: MANAGER,
    createdAt: at("2026-09-15", "10:20"),
    updatedAt: at("2026-09-24"),
    person: { name: "呂示例", nationalId: "", phone: "0900-000-003", livingAlone: true },
    referral: {
      referrerType: "medical",
      referrerName: "郭範例",
      assessmentId: "ast_demo_03",
      assessmentCode: "Ast003",
      reason: "生活近況評估 Ast003：橘燈（退縮）；Q11：社區活動引導",
      consent: true,
      consentAt: at("2026-09-15", "10:20"),
    },
    consultation: {
      firstContactAt: at("2026-09-17"),
      whatMatters: "希望能再自己出門散步，不要一直待在家裡",
      needTags: ["exercise", "companionship"],
      goals: ["每週參加一次團體運動", "三個月內能自行步行 30 分鐘"],
      note:
        "Q12 民眾填寫：跌倒之後就不太敢自己出門\n" +
        "Q12 談話紀錄：半年前在家門口跌倒，之後多半待在家；想運動但怕再跌倒，問到是否需要協助時猶豫\n" +
        "晤談：表示想運動，但擔心再次跌倒，希望第一次有人陪同",
    },
    linkages: [
      linkage(WALKING, "2026-09-24", {
        reason: "住家附近、免費，且帶班老師具體適能證照；首次參加由健康管理員陪同",
        escortNeeded: true,
      }),
    ],
    followUps: followUps("2026-09-24"),
    closure: EMPTY_CLOSURE,
    history: [
      h(2, "2026-09-15", "create", "建立個案", "郭範例"),
      h(2, "2026-09-15", "open_from_assessment", "由評估 Ast003 開案（橘燈退縮），進入諮詢階段", "郭範例"),
      h(2, "2026-09-17", "first_contact", "首次聯繫"),
      h(3, "2026-09-22", "advance", "進入「連結」"),
      h(3, "2026-09-24", "link", `連結資源：${WALKING.name}（需健康管理員陪同至少一次）`),
    ],
  },

  // 4. 連結：連結的 Res004 之後暫停服務，個案頁會提示需重新選擇資源
  {
    id: "case_demo_04",
    code: "Case004",
    isDemo: true,
    stage: 3,
    managerName: MANAGER,
    createdAt: at("2026-09-01"),
    updatedAt: at("2026-09-10"),
    person: { name: "曾範本", nationalId: "", phone: "0900-000-004", livingAlone: false },
    referral: {
      referrerType: "watcher",
      referrerName: "宋範本（社區守望員）",
      assessmentId: null,
      assessmentCode: null,
      reason: "浴室濕滑曾滑倒，家中缺少扶手，行動需使用助行器",
      consent: true,
      consentAt: at("2026-09-01"),
    },
    consultation: {
      firstContactAt: at("2026-09-03"),
      whatMatters: "在家裡洗澡、走動時不用擔心跌倒",
      needTags: ["home_support", "housing"],
      goals: ["一個月內完成浴室與走道扶手加裝"],
      note: "家屬同意居家評估，希望盡快改善浴室安全",
    },
    linkages: [
      linkage(REPAIR, "2026-09-10", { reason: "提供到府評估與扶手加裝，身障者可申請材料費補助" }),
    ],
    followUps: followUps("2026-09-10"),
    closure: EMPTY_CLOSURE,
    history: [
      h(1, "2026-09-01", "create", "建立個案"),
      h(2, "2026-09-01", "advance", "進入「諮詢」"),
      h(2, "2026-09-03", "first_contact", "首次聯繫"),
      h(3, "2026-09-08", "advance", "進入「連結」"),
      h(3, "2026-09-10", "link", `連結資源：${REPAIR.name}`),
    ],
  },

  // 5. 追蹤：連結 Res002 成功，已完成 1 個月追蹤
  {
    id: "case_demo_05",
    code: "Case005",
    isDemo: true,
    stage: 4,
    managerName: MANAGER,
    createdAt: at("2026-08-20"),
    updatedAt: at("2026-09-28"),
    person: { name: "謝示範", nationalId: "", phone: "0900-000-005", livingAlone: true },
    referral: {
      referrerType: "self",
      referrerName: "",
      assessmentId: null,
      assessmentCode: null,
      reason: "自行詢問：子女在外地工作，平時一個人吃飯，三餐常隨便解決",
      consent: true,
      consentAt: at("2026-08-20"),
    },
    consultation: {
      firstContactAt: at("2026-08-22"),
      whatMatters: "吃飯時有人陪，不用每天一個人隨便吃",
      needTags: ["food", "companionship"],
      goals: ["每週至少參加兩次共餐"],
      note: "喜歡和人聊天，對共餐很有興趣；經濟狀況符合餐費補助",
    },
    linkages: [
      linkage(MEAL, "2026-08-29", {
        reason: "步行可到，經評估可申請餐費全額補助",
        status: "success",
        attendance: "attended",
        providerNote: "已固定週一、三出席",
      }),
    ],
    followUps: followUps("2026-08-29", {
      1: {
        doneAt: "2026-09-28",
        attendance: "attended",
        participation: "success",
        impact: "improved",
        note: "第一次參加就和同桌長輩聊開，飲食變得規律",
      },
    }),
    closure: EMPTY_CLOSURE,
    history: [
      h(1, "2026-08-20", "create", "建立個案"),
      h(2, "2026-08-20", "advance", "進入「諮詢」"),
      h(2, "2026-08-22", "first_contact", "首次聯繫"),
      h(3, "2026-08-27", "advance", "進入「連結」"),
      h(3, "2026-08-29", "link", `連結資源：${MEAL.name}`),
      h(3, "2026-09-02", "linkage_status", "連結狀態更新：成功｜已固定週一、三出席", "範例食物銀行協會"),
      h(4, "2026-09-02", "advance", "進入「追蹤」"),
      h(4, "2026-09-28", "follow_up", "1 個月追蹤：改善｜第一次參加就和同桌長輩聊開，飲食變得規律"),
    ],
  },

  // 6. 連結：連結 Res002，資源端尚未回報
  {
    id: "case_demo_06",
    code: "Case006",
    isDemo: true,
    stage: 3,
    managerName: MANAGER,
    createdAt: at("2026-09-10"),
    updatedAt: at("2026-09-18"),
    person: { name: "潘範例", nationalId: "", phone: "0900-000-006", livingAlone: false },
    referral: {
      referrerType: "medical",
      referrerName: "郭範例醫師",
      assessmentId: null,
      assessmentCode: null,
      reason: "高血壓，飲食偏鹹，營養師建議調整飲食",
      consent: true,
      consentAt: at("2026-09-10"),
    },
    consultation: {
      firstContactAt: at("2026-09-11"),
      whatMatters: "想吃得健康一點，但不想放棄喜歡的口味",
      needTags: ["nutrition", "food"],
      goals: ["了解少鹽飲食", "每週參加一次共餐"],
      note: "願意嘗試，但擔心餐點口味太淡",
    },
    linkages: [linkage(MEAL, "2026-09-18", { reason: "共餐由營養師規劃菜單，可體驗少鹽飲食" })],
    followUps: followUps("2026-09-18"),
    closure: EMPTY_CLOSURE,
    history: [
      h(1, "2026-09-10", "create", "建立個案"),
      h(2, "2026-09-10", "advance", "進入「諮詢」"),
      h(2, "2026-09-11", "first_contact", "首次聯繫"),
      h(3, "2026-09-16", "advance", "進入「連結」"),
      h(3, "2026-09-18", "link", `連結資源：${MEAL.name}`),
    ],
  },

  // 7. 已結案：連結 Res001 成功，1、3 個月追蹤皆改善，達成目標
  {
    id: "case_demo_07",
    code: "Case007",
    isDemo: true,
    stage: "closed",
    managerName: MANAGER,
    createdAt: at("2026-05-20"),
    updatedAt: at("2026-09-01"),
    person: { name: "葉示例", nationalId: "", phone: "0900-000-007", livingAlone: false },
    referral: {
      referrerType: "medical",
      referrerName: "郭範例醫師",
      assessmentId: null,
      assessmentCode: null,
      reason: "膝關節退化，活動量少，醫師建議規律散步",
      consent: true,
      consentAt: at("2026-05-20"),
    },
    consultation: {
      firstContactAt: at("2026-05-22"),
      whatMatters: "可以和朋友一起走走，膝蓋不要再那麼痛",
      needTags: ["exercise", "companionship"],
      goals: ["三個月內養成每週固定散步的習慣"],
      note: "一個人散步提不起勁，希望有同伴一起",
    },
    linkages: [
      linkage(WALKING, "2026-06-02", {
        reason: "團體步行有同伴，步調和緩適合膝關節退化者",
        escortNeeded: true,
        status: "success",
        attendance: "attended",
        providerNote: "每週二固定出席",
      }),
    ],
    followUps: followUps("2026-06-02", {
      1: {
        doneAt: "2026-06-30",
        attendance: "attended",
        participation: "success",
        impact: "improved",
        note: "已能自行前往，結交兩位固定同伴",
      },
      3: {
        doneAt: "2026-08-28",
        attendance: "attended",
        participation: "success",
        impact: "improved",
        note: "連續一個月每週出席，膝蓋疼痛減輕",
      },
    }),
    closure: {
      reason: "goal_met",
      closedAt: "2026-09-01",
      returnedToMedical: true,
      reentryExplained: true,
      note: "已能自行參加健走班，每週固定出席並結交同伴，膝蓋疼痛減輕",
    },
    history: [
      h(1, "2026-05-20", "create", "建立個案"),
      h(2, "2026-05-20", "advance", "進入「諮詢」"),
      h(2, "2026-05-22", "first_contact", "首次聯繫"),
      h(3, "2026-05-29", "advance", "進入「連結」"),
      h(3, "2026-06-02", "link", `連結資源：${WALKING.name}（需健康管理員陪同至少一次）`),
      h(3, "2026-06-09", "linkage_status", "連結狀態更新：成功｜每週二固定出席", "示範社區發展協會"),
      h(4, "2026-06-09", "advance", "進入「追蹤」"),
      h(4, "2026-06-30", "follow_up", "1 個月追蹤：改善｜已能自行前往，結交兩位固定同伴"),
      h(4, "2026-08-28", "follow_up", "3 個月追蹤：改善｜連續一個月每週出席，膝蓋疼痛減輕"),
      h(5, "2026-08-28", "advance", "進入「結案」"),
      h("closed", "2026-09-01", "advance", "進入「已結案」"),
    ],
  },

  // 8. 追蹤：連結 Res003 成功，1 個月追蹤（2026-09-10）已到期尚未記錄
  {
    id: "case_demo_08",
    code: "Case008",
    isDemo: true,
    stage: 4,
    managerName: MANAGER,
    createdAt: at("2026-07-25"),
    updatedAt: at("2026-08-17"),
    person: { name: "方範本", nationalId: "", phone: "0900-000-008", livingAlone: false },
    referral: {
      referrerType: "watcher",
      referrerName: "宋範本（社區守望員）",
      assessmentId: null,
      assessmentCode: null,
      reason: "社區守望員轉介：獨自照顧失智母親三年，常說睡不好、沒有自己的時間",
      consent: true,
      consentAt: at("2026-07-25"),
    },
    consultation: {
      firstContactAt: at("2026-07-27"),
      whatMatters: "每個月能有一點屬於自己的時間，也想知道別人是怎麼照顧的",
      needTags: ["caregiver_support", "mental"],
      goals: ["每月參加一次照顧者團體", "學會一項減輕照顧壓力的方法"],
      note: "母親白天可由妹妹照看，參加團體時間沒有問題",
    },
    linkages: [
      linkage(CAREGIVER, "2026-08-10", {
        reason: "由諮商心理師帶領，可交流照顧經驗；團體時段可安排臨時照顧",
        status: "success",
        attendance: "attended",
        providerNote: "首次出席，分享照顧經驗",
      }),
    ],
    followUps: followUps("2026-08-10"),
    closure: EMPTY_CLOSURE,
    history: [
      h(1, "2026-07-25", "create", "建立個案"),
      h(2, "2026-07-25", "advance", "進入「諮詢」"),
      h(2, "2026-07-27", "first_contact", "首次聯繫"),
      h(3, "2026-08-06", "advance", "進入「連結」"),
      h(3, "2026-08-10", "link", `連結資源：${CAREGIVER.name}`),
      h(3, "2026-08-17", "linkage_status", "連結狀態更新：成功｜首次出席，分享照顧經驗", "許範例"),
      h(4, "2026-08-17", "advance", "進入「追蹤」"),
    ],
  },
];
