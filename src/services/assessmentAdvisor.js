// 燈號建議與判讀提示（doc/assessment-schema.md 第四節）
// 只提供建議與提醒，不定案：燈號一律由判讀人員決定
// 純函式，不讀寫儲存區

import {
  Q11_INTERWOVEN_COUNT,
  QUESTION_KEYS,
  YELLOW_ESCORT_SUGGESTS_ORANGE,
} from "../config/assessmentRules.js";
import {
  Q11_OPTIONS,
  Q1_Q10_SUGGESTIONS,
  needsManagerReferral,
  suggestTagsFromAnswers,
} from "../config/needMapping.js";

export const RED_REMINDER = "任何步驟發現自殺自傷、疑似家暴受虐、急性精神症狀、無家可歸或斷炊斷藥，可直接判紅燈";

// 選擇不回答的提示；頁面隱藏與對話指引重複的提示時，這則仍要保留
export const SKIP_PROMPT = "民眾選擇不回答，請確認；不計入綠燈的「全部答是」";

const PROMPTS = {
  q12: "請先閱讀 Q12 並與民眾談談；若談到需要有人協助，可考慮橘燈",
  emotion: "先追問情緒狀況，可接 BSRS-5 或 PHQ-9；確認有自殺自傷意念依紅燈處理",
  icope: "提到跌倒或功能下降時，由醫師判斷是否安排 ICOPE",
  q10: "若獨居且沒有夜間求助管道，建議優先轉介",
  skip: SKIP_PROMPT,
};

const ORANGE_TYPE_HINTS = {
  hesitant: "建議封閉提問，直接提議下一步",
  reserved: "請先回應民眾的顧慮再問一次；婉拒原因必填",
};

export function getOrangeTypeHint(type) {
  return ORANGE_TYPE_HINTS[type] ?? "";
}

const q11Label = (code) => Q11_OPTIONS.find((o) => o.code === code)?.label ?? code;
const isBlank = (v) => String(v ?? "").trim() === "";

/**
 * 依 Q11 與 Q1–Q10 產生建議標籤，合併相同標籤並列出所有來源題號
 * Q11 是民眾自己指認的需求可直接採用；只來自 Q1–Q10 的標籤須判讀人員確認
 * @param {object} answers
 * @param {{ q4NothingToDo?: boolean }} options  Q4 追問結果為「沒什麼事可做」時改用 Q2 方向（altTags）
 * @returns {{ tag: string, sources: string[], requiresConfirmation: boolean }[]}
 */
export function buildSuggestedTags(answers = {}, { q4NothingToDo = false } = {}) {
  const byTag = new Map();
  const add = (tag, source) => {
    const entry = byTag.get(tag) ?? { tag, sources: [] };
    if (!entry.sources.includes(source)) entry.sources.push(source);
    byTag.set(tag, entry);
  };
  for (const code of answers.q11 || []) {
    for (const tag of Q11_OPTIONS.find((o) => o.code === code)?.tags ?? []) add(tag, code);
  }
  for (const s of suggestTagsFromAnswers(answers)) {
    const tags = s.question === "q4" && q4NothingToDo && s.altTags.length ? s.altTags : s.tags;
    for (const tag of tags) add(tag, s.question);
  }
  return [...byTag.values()].map((entry) => ({
    ...entry,
    requiresConfirmation: !entry.sources.some((source) => source.startsWith("q11_")),
  }));
}

/**
 * 產生系統建議燈號、判讀提示與建議標籤
 * @returns {{
 *   suggestedLight: "red"|"orange"|"yellow"|"green"|null,  null 表示無法自動建議，交由判讀人員判斷
 *   suggestedOrangeType: "refer"|null,
 *   reasons: string[],                                        建議燈號的理由
 *   prompts: { q12: string[], q11: string[], questions: Record<string,string[]>, general: string[] },
 *   suggestedTags: object[],
 *   stats: { q11Count: number, yesCount: number, noCount: number, skipCount: number, unansweredCount: number }
 * }}
 */
export function adviseAssessment(assessment = {}, options = {}) {
  const answers = assessment.answers || {};
  const review = assessment.review || {};
  const q11 = (answers.q11 || []).filter((c) => c !== "q11_none");
  const values = QUESTION_KEYS.map((q) => answers[q]);
  const stats = {
    q11Count: q11.length,
    yesCount: values.filter((v) => v === "yes").length,
    noCount: values.filter((v) => v === "no" || v === false).length,
    skipCount: values.filter((v) => v === "skip").length,
    unansweredCount: values.filter((v) => isBlank(v)).length,
  };

  const prompts = { q12: [], q11: [], questions: {}, general: [RED_REMINDER] };
  const addQuestionPrompt = (q, text) => {
    prompts.questions[q] = [...(prompts.questions[q] || []), text];
  };

  // Q12
  if (!isBlank(answers.q12)) prompts.q12.push(PROMPTS.q12);

  // Q11
  const urgent = Object.entries(review.q11Notes || {})
    .filter(([, note]) => note?.urgent)
    .map(([code]) => code);
  for (const code of urgent) prompts.q11.push(`「${q11Label(code)}」標記為急迫，請考慮紅燈`);
  const hasTalk = needsManagerReferral(answers.q11 || []);
  if (hasTalk) prompts.q11.push("勾選「想找人聊聊」：不對應資源，建議判定橘燈並轉介健康管理員");
  if (q11.length >= Q11_INTERWOVEN_COUNT) {
    prompts.q11.push(`勾選 ${q11.length} 項，需求可能相互交織，請釐清是否為多面向需求`);
  }

  // Q1–Q10
  for (const q of QUESTION_KEYS) {
    const v = answers[q];
    if (v === "skip") addQuestionPrompt(q, PROMPTS.skip);
    if (v !== "no" && v !== false) continue;
    if (q === "q3" || q === "q4") addQuestionPrompt(q, PROMPTS.emotion);
    else if (q === "q8") addQuestionPrompt(q, PROMPTS.icope);
    else if (q === "q10") addQuestionPrompt(q, PROMPTS.q10);
    else if (Q1_Q10_SUGGESTIONS[q]?.note) addQuestionPrompt(q, Q1_Q10_SUGGESTIONS[q].note);
    if (q === "q4") addQuestionPrompt(q, Q1_Q10_SUGGESTIONS.q4.note);
  }
  if (stats.skipCount) prompts.general.push(`有 ${stats.skipCount} 題選擇不回答，請與民眾確認`);

  // 黃燈且民眾選擇請專人陪同
  // 待確認事項：「黃燈民眾選擇『請專人陪同』時，是否應改判橘燈並開案？」→ YELLOW_ESCORT_SUGGESTS_ORANGE
  if (YELLOW_ESCORT_SUGGESTS_ORANGE && review.light === "yellow" && review.escortOffered) {
    prompts.general.push("民眾選擇請專人陪同，視同需要協助，是否改判橘燈？");
  }

  // 建議燈號：紅（急迫）> 橘（想找人聊聊）> 綠 > 黃；其餘無法自動建議
  const reasons = [];
  let suggestedLight = null;
  let suggestedOrangeType = null;
  const allYes = stats.yesCount === QUESTION_KEYS.length;

  if (urgent.length) {
    suggestedLight = "red";
    reasons.push(`Q11 有 ${urgent.length} 項標記急迫`);
  } else if (hasTalk) {
    suggestedLight = "orange";
    suggestedOrangeType = "refer";
    reasons.push("Q11 勾選「想找人聊聊」");
  } else if (isBlank(answers.q12) && q11.length === 0 && allYes) {
    suggestedLight = "green";
    reasons.push("Q12 空白、Q11 未勾選需求、Q1–Q10 全部答是");
  } else if (
    (q11.length === 1 && stats.noCount <= 2) ||
    (q11.length === 0 && stats.noCount >= 1 && stats.noCount <= 2)
  ) {
    // 規格：「只有 1 個 Q11 項目或 1–2 題 Q1–Q10 答否時建議黃燈」
    // 解讀：Q11 一項且答否不超過 2 題，或 Q11 未勾且答否 1–2 題
    suggestedLight = "yellow";
    reasons.push(
      q11.length === 1
        ? `Q11 只有一項（${q11Label(q11[0])}），需求單一`
        : `Q1–Q10 有 ${stats.noCount} 題答否，需求單一`
    );
  } else {
    reasons.push("未符合自動建議條件，請依談話內容判定");
  }

  return {
    suggestedLight,
    suggestedOrangeType,
    reasons,
    prompts,
    suggestedTags: buildSuggestedTags(answers, options),
    stats,
  };
}
