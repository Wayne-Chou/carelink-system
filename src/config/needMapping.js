// 生活近況評估表與需求標籤對應（doc/resource-schema.md 第八節）
// Q11 為民眾自行指認的需求，可直接採用；Q1–Q10 只產生建議，須由判讀人員確認。

// action：
//   match_tags     依 tags 找資源
//   refer_manager  不對應資源，直接判定橘燈並轉介健康管理員
//   none           無需求
export const Q11_OPTIONS = [
  { code: "q11_financial", label: "經濟與生活負擔", tags: ["financial_aid", "food"], action: "match_tags" },
  { code: "q11_employment", label: "工作與就業", tags: ["employment"], action: "match_tags" },
  { code: "q11_welfare", label: "福利資源申辦", tags: ["welfare_application"], action: "match_tags" },
  { code: "q11_housing", label: "居住環境改善", tags: ["housing"], action: "match_tags" },
  { code: "q11_home", label: "居家生活支援", tags: ["home_support"], action: "match_tags" },
  { code: "q11_transport", label: "就醫與外出交通", tags: ["transport"], action: "match_tags" },
  { code: "q11_caregiver", label: "照顧家人的支持", tags: ["caregiver_support"], action: "match_tags" },
  { code: "q11_parenting", label: "親職與教養支持", tags: ["parenting"], action: "match_tags" },
  { code: "q11_legal", label: "法律權益諮詢", tags: ["legal"], action: "match_tags" },
  {
    code: "q11_activity",
    label: "社區活動引導",
    tags: ["companionship", "arts_culture", "nature", "spiritual", "education", "community"],
    action: "match_tags",
  },
  { code: "q11_talk", label: "想找人聊聊", tags: [], action: "refer_manager" },
  { code: "q11_none", label: "目前沒有其他需要", tags: [], action: "none" },
];

// Q1–Q10 答「否」時的建議標籤
// altTags：Q4 依判讀結果二選一（提不起勁用 tags，沒事可做用 altTags 比照 Q2）
const Q2_TAGS = ["companionship", "arts_culture", "nature", "community"];

export const Q1_Q10_SUGGESTIONS = {
  q1: { meaning: "缺乏可傾訴的對象", tags: ["companionship", "mental"], note: "" },
  q2: { meaning: "較少與人交流或參與活動", tags: Q2_TAGS, note: "" },
  q3: {
    meaning: "情緒困擾",
    tags: ["mental"],
    note: "先追問情緒狀況，可接 BSRS-5 或 PHQ-9；有自殺自傷意念依紅燈處理",
  },
  q4: {
    meaning: "缺乏興趣或可參與的活動",
    tags: ["mental"],
    altTags: Q2_TAGS,
    note: "提不起勁偏向 mental；沒事可做比照 Q2",
  },
  q5: {
    meaning: "缺乏意義感",
    tags: ["education", "volunteer", "arts_culture", "spiritual"],
    note: "記錄以前喜歡做的事",
  },
  q6: { meaning: "較少感到被需要", tags: ["volunteer", "community"], note: "" },
  q7: {
    meaning: "日常生活處理有困難",
    tags: ["home_support", "caregiver_support"],
    note: "家人代做仍屬受限，留意照顧者負荷",
  },
  q8: {
    meaning: "身體限制影響生活",
    tags: ["exercise"],
    note: "提到跌倒或功能下降，由醫師判斷是否安排 ICOPE",
  },
  q9: { meaning: "難以自我管理健康", tags: ["self_management", "nutrition"], note: "" },
  q10: {
    meaning: "不清楚求助管道",
    tags: [],
    note: "目前沒有對應標籤；獨居且無夜間求助管道者優先轉介（待確認事項）",
  },
};

const Q11_BY_CODE = Object.fromEntries(Q11_OPTIONS.map((o) => [o.code, o]));

// Q11 勾選代碼 → 去重複的需求標籤
export function tagsFromQ11(codes = []) {
  const tags = (Array.isArray(codes) ? codes : []).flatMap((c) => Q11_BY_CODE[c]?.tags ?? []);
  return [...new Set(tags)];
}

// Q11 是否勾選「想找人聊聊」（直接轉介健康管理員）
export function needsManagerReferral(codes = []) {
  return (Array.isArray(codes) ? codes : []).some(
    (c) => Q11_BY_CODE[c]?.action === "refer_manager"
  );
}

// 假設：評估表答「否」以 false 或 "no" 表示，評估表實作時再確認
const isNo = (value) => value === false || value === "no";

// answers：{ q1: true/false/"yes"/"no", ... }
// 回傳每題的建議，皆標記 requiresConfirmation，須判讀人員確認後才採用
export function suggestTagsFromAnswers(answers = {}) {
  return Object.entries(Q1_Q10_SUGGESTIONS)
    .filter(([q]) => isNo(answers?.[q]))
    .map(([question, s]) => ({
      question,
      meaning: s.meaning,
      tags: s.tags,
      altTags: s.altTags ?? [],
      note: s.note,
      requiresConfirmation: true,
    }));
}
