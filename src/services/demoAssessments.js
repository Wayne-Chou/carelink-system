// 示範評估紀錄：9 筆虛構評估（doc/assessment-schema.md 第三節，由 assessmentService 讀寫）
// 姓名皆含「示範／範例／示例／範本」，與示範個案不重複；只有開案的兩筆與對應個案同名
// 每筆帶 isDemo: true，可與示範資源、個案一起一鍵移除
//
// 日期以 2026-10-14 為「載入當天」撰寫，載入時依實際日期平移（見 demoService.js 的 DEMO_BASE_DATE）
//
// 燈號分布：紅 1、橘燈轉介 1、橘燈退縮 1、橘燈保留 1、黃 2、綠 1、未判讀 1、已作廢 1
//   橘燈轉介 Ast002 ↔ Case002 周範例；橘燈退縮 Ast003 ↔ Case003 呂示例（評估 caseId 與個案 referral.assessmentId 互相對應）
//   黃燈 Ast005 下次確認日已過 13 天（待辦「黃燈三個月確認」）；Ast006 尚未到期
//   綠燈 Ast007 為一年多前的評估，年度重評已過 7 天（待辦「綠燈年度重評」）
//   橘燈保留 Ast004 下次來院時再確認（待辦「橘燈保留再確認」）

import { addMonths } from "../utils/date.js";

const NURSE = "杜範例";
const DOCTOR = "郭範例";
const at = (date, time = "10:00") => `${date}T${time}:00+08:00`;

// 示範資源（見 demoResources.js）
const WALKING_ID = "7c1e2a40-5b3d-4f1a-9e2c-1a2b3c4d5e6f"; // Res001 黃燈
const MEAL_ID = "d3a1f0b2-1c4e-4a6b-8d2f-0a1b2c3d4e02"; // Res002

// Q1–Q10 預設全部答「是」，no 列出答「否」的題號
function answers({ no = [], skip = [], q11 = [], q12 = "" } = {}) {
  const result = {};
  for (let i = 1; i <= 10; i += 1) {
    const key = `q${i}`;
    result[key] = no.includes(key) ? "no" : skip.includes(key) ? "skip" : "yes";
  }
  return { ...result, q11, q12 };
}

const EMPTY_REVIEW = {
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
};

function assessment(no, fields) {
  const { review, ...rest } = fields;
  const createdAt = at(rest.filledAt, "09:30");
  return {
    id: `ast_demo_${String(no).padStart(2, "0")}`,
    code: `Ast${String(no).padStart(3, "0")}`,
    isDemo: true,
    fillMode: "self",
    fillNote: "",
    caseId: null,
    nextCheckAt: null,
    declineCount: 0,
    previousAssessmentId: null,
    status: "reviewed",
    voidedAt: null,
    voidedBy: "",
    voidReason: "",
    createdAt,
    updatedAt: review?.reviewedAt || createdAt,
    ...rest,
    review: { ...EMPTY_REVIEW, ...(review || {}) },
  };
}

export const DEMO_ASSESSMENTS = [
  // 1. 紅燈：Q11 經濟負擔標記急迫，轉院內社工室
  assessment(1, {
    person: { name: "邱示範", nationalId: "" },
    filledAt: "2026-10-08",
    answers: answers({
      no: ["q3", "q4", "q7", "q9"],
      q11: ["q11_financial", "q11_home"],
      q12: "這個月房租繳不出來，家裡的米也快吃完了",
    }),
    review: {
      readerName: DOCTOR,
      readerType: "doctor",
      reviewedAt: at("2026-10-08", "11:00"),
      q12Note: "房東催繳房租，存款已用完，三餐常只吃一餐",
      q11Notes: {
        q11_financial: { note: "已無存款，下週可能被要求搬離", urgent: true },
        q11_home: { note: "家中食物不足", urgent: false },
      },
      light: "red",
      redReasons: ["basic_needs"],
      redReferredTo: "院內社工室（急難救助）",
      suggestedTags: ["financial_aid", "food", "home_support"],
      confirmedTags: ["financial_aid", "food"],
    },
  }),

  // 2. 橘燈轉介：勾選「想找人聊聊」，同意轉介 → 開案 Case002（周範例）
  assessment(2, {
    person: { name: "周範例", nationalId: "" },
    filledAt: "2026-09-26",
    answers: answers({
      no: ["q2", "q5", "q6"],
      q11: ["q11_activity", "q11_talk"],
      q12: "退休以後每天不知道要做什麼",
    }),
    caseId: "case_demo_02",
    status: "closed",
    review: {
      readerName: NURSE,
      readerType: "nurse",
      reviewedAt: at("2026-09-26", "10:30"),
      q12Note: "退休兩年，糖尿病控制不穩，生活缺少重心，希望有人一起討論接下來的安排",
      formerInterests: "年輕時常和同事去爬山",
      light: "orange",
      orangeType: "refer",
      consent: true,
      suggestedTags: ["companionship", "exercise", "community", "volunteer"],
      confirmedTags: ["companionship", "exercise"],
    },
  }),

  // 3. 橘燈退縮：跌倒後不太敢出門，封閉提問後同意轉介 → 開案 Case003（呂示例）
  assessment(3, {
    person: { name: "呂示例", nationalId: "" },
    filledAt: "2026-09-15",
    answers: answers({
      no: ["q2", "q4", "q8"],
      q11: ["q11_activity"],
      q12: "跌倒之後就不太敢自己出門",
    }),
    caseId: "case_demo_03",
    status: "closed",
    review: {
      readerName: DOCTOR,
      readerType: "doctor",
      reviewedAt: at("2026-09-15", "10:20"),
      q12Note: "半年前在家門口跌倒，之後多半待在家；想運動但怕再跌倒，問到是否需要協助時猶豫",
      questionNotes: { q8: { note: "膝蓋無力，走久會怕" } },
      extraAssessments: ["icope"],
      light: "orange",
      orangeType: "hesitant",
      consent: true,
      suggestedTags: ["companionship", "exercise", "arts_culture", "nature"],
      confirmedTags: ["exercise", "companionship"],
    },
  }),

  // 4. 橘燈保留：婉拒轉介，下次來院時再確認
  assessment(4, {
    person: { name: "卓範例", nationalId: "" },
    filledAt: "2026-10-02",
    answers: answers({
      no: ["q1", "q3", "q6"],
      q11: ["q11_caregiver"],
      q12: "照顧中風的先生，覺得很累",
    }),
    declineCount: 1,
    review: {
      readerName: NURSE,
      readerType: "nurse",
      reviewedAt: at("2026-10-02", "11:10"),
      q12Note: "先生中風兩年由本人照顧，晚上睡不好；擔心外人來家裡不方便",
      light: "orange",
      orangeType: "reserved",
      consent: false,
      declineReason: "家裡的事想先自己處理，等先生狀況穩定再說",
      suggestedTags: ["caregiver_support", "companionship", "mental"],
      confirmedTags: ["caregiver_support"],
    },
  }),

  // 5. 黃燈：當場提供共餐資源，三個月確認已到期
  assessment(5, {
    person: { name: "魏示例", nationalId: "" },
    filledAt: "2026-07-01",
    answers: answers({ no: ["q9"], q11: ["q11_financial"], q12: "" }),
    nextCheckAt: addMonths("2026-07-01", 3),
    review: {
      readerName: NURSE,
      readerType: "nurse",
      reviewedAt: at("2026-07-01", "10:40"),
      q11Notes: { q11_financial: { note: "退休金不多，三餐想省一點", urgent: false } },
      light: "yellow",
      suggestedTags: ["financial_aid", "food"],
      confirmedTags: ["food"],
      providedResources: [MEAL_ID],
    },
  }),

  // 6. 黃燈：當場提供健走班資源，三個月確認尚未到期
  assessment(6, {
    person: { name: "孔範本", nationalId: "" },
    filledAt: "2026-10-06",
    answers: answers({ no: ["q2"], q12: "想多出去走走" }),
    nextCheckAt: addMonths("2026-10-06", 3),
    review: {
      readerName: DOCTOR,
      readerType: "doctor",
      reviewedAt: at("2026-10-06", "10:15"),
      q12Note: "最近搬到附近，還不認識鄰居，想找個固定的運動",
      light: "yellow",
      suggestedTags: ["companionship", "arts_culture", "nature", "spiritual", "education", "community"],
      confirmedTags: ["exercise", "companionship"],
      providedResources: [WALKING_ID],
    },
  }),

  // 7. 綠燈：去年的評估，一年重評已到期
  assessment(7, {
    person: { name: "嚴示範", nationalId: "" },
    filledAt: "2025-10-07",
    answers: answers({ q11: ["q11_none"] }),
    nextCheckAt: addMonths("2025-10-07", 12),
    review: {
      readerName: DOCTOR,
      readerType: "doctor",
      reviewedAt: at("2025-10-07", "10:05"),
      light: "green",
    },
  }),

  // 8. 未判讀：昨天由施測者口語協助填寫，等待判讀
  assessment(8, {
    person: { name: "白範例", nationalId: "" },
    filledAt: "2026-10-13",
    fillMode: "oral",
    fillNote: "視力不佳，由志工逐題唸題",
    answers: answers({ no: ["q1", "q2"], skip: ["q3"], q11: ["q11_transport"], q12: "看病要轉兩班公車" }),
    status: "filled",
    review: {},
  }),

  // 9. 已作廢：平板測試時誤送出
  assessment(9, {
    person: { name: "石示例", nationalId: "" },
    filledAt: "2026-10-09",
    answers: answers({ q11: ["q11_none"] }),
    status: "voided",
    voidedAt: at("2026-10-09", "15:00"),
    voidedBy: NURSE,
    voidReason: "測試平板時誤送出，並非民眾填寫",
    review: {},
  }),
];
