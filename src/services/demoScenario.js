// 示範情境「林示範的故事」：依「從第幾步開始」產生該步一開始的完整資料（純函式，不讀寫儲存區）
// 資料格式與頁面操作產生的相同（assessmentService、caseService），日期一律從載入當天往回推算，
// 讓該步可以直接操作（例：第 9 步時 1 個月追蹤剛好到期）
//
// 各步一開始的狀態（前面的步驟都已完成）：
//   1 只有資源                          2 林示範的評估（未判讀，今天填寫）
//   3 已判讀橘燈轉介、已開案（第 2 階段），尚未首次聯繫（昨天開案）
//   4 已首次聯繫、晤談、訂目標（一週前開案）
//   5 第 3 階段，已連結歌唱班（3 天前），歌唱班的資源點尚未回報
//   6 歌唱班的資源點已回報失敗（昨天），仍在第 3 階段
//   7 已退回諮詢、補充晤談並再次進入連結（昨天），尚未改轉介
//   8 已連結太極班（3 天前），資源點尚未回報
//   9 資源點已回報成功（仍在第 3 階段），1 個月追蹤今天到期
//  10 第 4 階段，1 個月追蹤已完成，3、6 個月追蹤都已到期（為方便展示安排在同一天）
//  11 1、3、6 個月追蹤都已完成

import { FOLLOW_UP_MONTHS } from "../config/assessmentRules.js";
import {
  PROTAGONIST,
  STORY_FAILURE_NOTE,
  STORY_FIRST_RESOURCE_CODE,
  STORY_GOAL,
  STORY_MANAGER,
  STORY_READER,
  STORY_RESOURCE_CODE,
  STORY_STEP_COUNT,
} from "../config/demoStory.js";
import { createDemoResources } from "./demoResources.js";
import { addDays, addMonths, todayString } from "../utils/date.js";

export const STORY_ASSESSMENT_ID = "ast_story_01";
export const STORY_CASE_ID = "case_story_01";
const ASSESSMENT_CODE = "Ast001";
const CASE_CODE = "Case001";

const at = (date, time = "10:00") => `${date}T${time}:00+08:00`;
const history = (stage, date, action, note, actor = STORY_MANAGER, time = "10:00") => ({
  stage,
  date,
  at: at(date, time),
  actor,
  action,
  note,
});

// 判讀時確認的需求標籤（Q1、Q2 答否帶出的社交陪伴、社區參與）
const CONFIRMED_TAGS = ["companionship", "community"];

function assessment({ filledAt, reviewed = false }) {
  const base = {
    id: STORY_ASSESSMENT_ID,
    code: ASSESSMENT_CODE,
    isDemo: true,
    person: { name: PROTAGONIST.name, nationalId: "" },
    filledAt,
    fillMode: PROTAGONIST.fillMode,
    fillNote: PROTAGONIST.fillNote,
    answers: { ...PROTAGONIST.answers, q11: [...PROTAGONIST.answers.q11] },
    review: {
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
    },
    caseId: null,
    nextCheckAt: null,
    declineCount: 0,
    previousAssessmentId: null,
    status: "filled",
    voidedAt: null,
    voidedBy: "",
    voidReason: "",
    createdAt: at(filledAt, "09:30"),
    updatedAt: at(filledAt, "09:30"),
  };
  if (!reviewed) return base;
  return {
    ...base,
    caseId: STORY_CASE_ID,
    status: "closed",
    updatedAt: at(filledAt, "10:30"),
    review: {
      ...base.review,
      readerName: STORY_READER.name,
      readerType: STORY_READER.type,
      reviewedAt: at(filledAt, "10:30"),
      q12Note: "先生過世兩年，子女在外地；平常很少出門，想找地方走走、認識朋友，但不知道去哪裡",
      questionNotes: { q2: { note: "以前常和鄰居去市場，現在幾乎不出門" } },
      formerInterests: "年輕時喜歡早上去公園運動",
      light: "orange",
      orangeType: "refer",
      consent: true,
      suggestedTags: ["companionship", "mental", "arts_culture", "nature", "community"],
      confirmedTags: [...CONFIRMED_TAGS],
    },
  };
}

function followUps(linkedAt, doneRounds = []) {
  return FOLLOW_UP_MONTHS.map((round) => {
    const plannedAt = addMonths(linkedAt, round);
    const done = doneRounds.includes(round);
    return {
      round,
      plannedAt,
      doneAt: done ? plannedAt : null,
      attendance: done ? "attended" : null,
      participation: done ? "success" : null,
      impact: done ? "improved" : null,
      note: done ? FOLLOW_UP_NOTES[round] : "",
    };
  });
}

const FOLLOW_UP_NOTES = {
  1: "每週二、四都有去，和兩位鄰居結伴",
  3: "固定出席，會主動約鄰居一起去，精神比以前好",
  6: "已養成每週出門兩次的習慣，自己也開始去共餐",
};

// 個案（第 3 步以後）：依步驟的進度依序加上各事件（日期由 buildScenario 安排）
//   firstContact／consulted：首次聯繫與晤談（第 3 步）
//   first：轉介歌唱班 { advancedAt, linkedAt, failedAt }（第 4、5 步）
//   loop：退回諮詢與補充晤談 { returnedAt, advancedAt }（第 6 步）
//   second：轉介太極班 { linkedAt, reportedAt }（第 7、8 步）
//   advancedToFollowUp、doneRounds：追蹤（第 9、10 步）
function storyCase(options, resources) {
  const { openedAt, firstContact, consulted, first, loop, second, advancedToFollowUp, doneRounds = [] } = options;
  const singing = resources.find((r) => r.code === STORY_FIRST_RESOURCE_CODE);
  const taichi = resources.find((r) => r.code === STORY_RESOURCE_CODE);
  const reason = `生活近況評估 ${ASSESSMENT_CODE}：橘燈（轉介）；Q11：想找人聊聊`;
  const c = {
    id: STORY_CASE_ID,
    code: CASE_CODE,
    isDemo: true,
    stage: 2,
    managerName: STORY_MANAGER,
    createdAt: at(openedAt, "10:30"),
    updatedAt: at(openedAt, "10:30"),
    person: { name: PROTAGONIST.name, nationalId: "", phone: PROTAGONIST.phone, livingAlone: PROTAGONIST.livingAlone },
    referral: {
      referrerType: "medical",
      referrerName: STORY_READER.name,
      assessmentId: STORY_ASSESSMENT_ID,
      assessmentCode: ASSESSMENT_CODE,
      reason,
      consent: true,
      consentAt: at(openedAt, "10:30"),
    },
    consultation: {
      firstContactAt: null,
      whatMatters: "",
      needTags: [...CONFIRMED_TAGS],
      goals: [],
      note: `Q12 民眾填寫：${PROTAGONIST.answers.q12}\nQ12 談話紀錄：先生過世兩年，子女在外地；平常很少出門，想找地方走走、認識朋友，但不知道去哪裡`,
    },
    linkages: [],
    followUps: [],
    closure: { reason: "", closedAt: null, returnedToMedical: false, reentryExplained: false, note: "" },
    history: [
      history(2, openedAt, "create", "建立個案", STORY_READER.name, "10:30"),
      history(2, openedAt, "open_from_assessment", `由評估 ${ASSESSMENT_CODE} 開案（橘燈轉介），進入諮詢階段`, STORY_READER.name, "10:30"),
    ],
  };
  const touch = (date) => (c.updatedAt = at(date));
  const link = (resource, linkedAt, reasonText) => {
    const escortNeeded = resource.riskLevel === "yellow";
    c.linkages.push({
      resourceId: resource.id,
      resourceName: resource.name,
      reason: reasonText,
      linkedAt,
      escortNeeded,
      status: "pending",
      attendance: null,
      providerNote: "",
    });
    // 與 caseService.addLinkage 相同：保留已完成的追蹤，依新的連結日重新排程
    c.followUps = followUps(linkedAt, doneRounds);
    c.history.push(
      history(3, linkedAt, "link", `連結資源：${resource.name}${escortNeeded ? "（需健康管理員陪同至少一次）" : ""}`)
    );
    touch(linkedAt);
  };

  if (firstContact) {
    c.consultation.firstContactAt = at(firstContact, "14:00");
    c.history.push(history(2, firstContact, "first_contact", "首次聯繫", STORY_MANAGER, "14:00"));
    touch(firstContact);
  }
  if (consulted) {
    c.consultation.whatMatters = "希望每天有地方可以去，有人可以說說話";
    c.consultation.goals = [STORY_GOAL];
    c.consultation.note += "\n晤談：喜歡唱歌，也想動一動；擔心一個人去會不好意思，希望有人介紹";
    touch(consulted);
  }

  // 第一次轉介：歌唱班（黃燈，需陪同）
  if (first) {
    c.stage = 3;
    c.history.push(history(3, first.advancedAt, "advance", "進入「連結」"));
    link(singing, first.linkedAt, "喜歡唱歌；據點有族語歌謠，首次由健康管理員陪同");
  }
  if (first?.failedAt) {
    // 歌唱班的資源點在資源端後台回報失敗（操作者為資源單位）
    Object.assign(c.linkages[0], { status: "failed", attendance: "absent", providerNote: STORY_FAILURE_NOTE });
    c.history.push(history(3, first.failedAt, "linkage_status", `連結狀態更新：失敗｜${STORY_FAILURE_NOTE}`, singing.name));
    touch(first.failedAt);
  }

  // 迴圈：退回諮詢、補充晤談、調整計畫，再進入連結
  if (loop) {
    c.stage = 2;
    c.history.push(history(2, loop.returnedAt, "return_to_consultation", "連結失敗，退回諮詢重新評估"));
    c.consultation.note += "\n重新晤談：每週三下午固定回診，和歌唱班時間衝突；改找早上時段、離家近的活動";
    c.consultation.goals = [STORY_GOAL, "選擇早上時段、不和回診衝突的活動"];
    touch(loop.returnedAt);
    c.stage = 3;
    c.history.push(history(3, loop.advancedAt, "advance", "進入「連結」"));
    touch(loop.advancedAt);
  }

  // 第二次轉介：太極班
  if (second) {
    link(taichi, second.linkedAt, "住家附近、免費，早上時段不和回診衝突；教練會帶新學員認識大家");
  }
  if (second?.reportedAt) {
    Object.assign(c.linkages.at(-1), { status: "success", attendance: "attended", providerNote: "已固定週二、四出席" });
    c.history.push(history(3, second.reportedAt, "linkage_status", "連結狀態更新：成功｜已固定週二、四出席", taichi.name));
    touch(second.reportedAt);
  }
  if (advancedToFollowUp) {
    c.stage = 4;
    c.history.push(history(4, advancedToFollowUp, "advance", "進入「追蹤」"));
    touch(advancedToFollowUp);
  }
  for (const f of c.followUps.filter((x) => x.doneAt)) {
    c.history.push(history(4, f.doneAt, "follow_up", `${f.round} 個月追蹤：改善｜${f.note}`));
    touch(f.doneAt);
  }
  return c;
}

/**
 * 產生從第 step 步開始的示範情境資料
 * @param {number} step  1～11
 * @param {string} today 載入當天（YYYY-MM-DD）
 * @returns {{ resources: object[], assessments: object[], cases: object[] }}
 */
export function buildScenario(step = 1, today = todayString()) {
  const s = Math.min(Math.max(Math.trunc(Number(step)) || 1, 1), STORY_STEP_COUNT);
  const resources = createDemoResources(today);
  if (s === 1) return { resources, assessments: [], cases: [] };
  if (s === 2) return { resources, assessments: [assessment({ filledAt: today })], cases: [] };

  // 時間軸：L1 歌唱班連結日、L2 太極班連結日（決定追蹤到期日），其餘日期由此往前推
  let L1 = null;
  let L2 = null;
  if (s === 5) L1 = addDays(today, -3);
  if (s === 6) L1 = addDays(today, -6);
  if (s === 7) L1 = addDays(today, -10);
  if (s >= 8) {
    L2 = {
      8: addDays(today, -3),
      9: addMonths(today, -1),
      10: addMonths(today, -6),
      11: addDays(addMonths(today, -6), -7),
    }[s];
    L1 = addDays(L2, -14);
  }
  const openedAt = { 3: addDays(today, -1), 4: addDays(today, -7) }[s] ?? addDays(L1, -10);

  const options = {
    openedAt,
    firstContact: s >= 4 ? addDays(openedAt, 1) : null,
    consulted: s >= 4 ? addDays(openedAt, 1) : null,
    first: L1
      ? {
          advancedAt: addDays(L1, -1),
          linkedAt: L1,
          failedAt: s === 6 ? addDays(today, -1) : s >= 7 ? addDays(L1, 3) : null,
        }
      : null,
    loop: s >= 7 ? { returnedAt: addDays(L1, 4), advancedAt: s === 7 ? addDays(today, -1) : addDays(L2, -1) } : null,
    second: L2 ? { linkedAt: L2, reportedAt: s >= 9 ? addDays(L2, 5) : null } : null,
    advancedToFollowUp: s >= 10 ? addDays(L2, 5) : null,
    doneRounds: { 10: [1], 11: [1, 3, 6] }[s] ?? [],
  };
  return {
    resources,
    assessments: [assessment({ filledAt: openedAt, reviewed: true })],
    cases: [storyCase(options, resources)],
  };
}
