// 生活近況評估表 v3（20260923）原文（評估填寫頁、判讀頁共用）
// Q1–Q10 答「是」代表沒有該項需求，答「否」對應 needMapping.js 的建議標籤
// Q11 選項代碼沿用 needMapping.js 的 Q11_OPTIONS，這裡只放原文分組與說明文字

export const FORM_TITLE = "生活近況評估表";

export const INTRO_PARAGRAPHS = [
  "健康不只是身體的事。有沒有人說說話、日子過得順不順心，其實都會影響身心的健康狀況。以下幾個問題想多了解您最近的生活情形。填好之後，我們的醫師或工作人員會和您談談，看看有沒有需要多注意的地方。",
];

export const INTRO_EMPHASIS = "※每一題都可以選擇不回答，這不會影響您接受的任何醫療服務。";

export const SECTION_ONE_TITLE = "一、生活狀況";
export const SECTION_ONE_INSTRUCTION = "請依照您目前的實際狀況，在「是」或「否」勾選。";

export const QUESTIONS = [
  { key: "q1", text: "心裡有事的時候，我有可以傾訴的對象。" },
  { key: "q2", text: "平常我會外出與人來往或參加活動。" },
  { key: "q3", text: "最近兩週，我的心情大致上是平靜或愉快的。" },
  { key: "q4", text: "最近兩週，我對生活中的一些事情會感到有興趣。" },
  { key: "q5", text: "我有自己想持續做或值得做的事情（例如興趣、工作、信仰、學習）。" },
  { key: "q6", text: "我覺得自己對家人、朋友或社區是有幫助的。" },
  { key: "q7", text: "我能夠自己處理大部分日常生活中的事情（如外出、購物、準備餐食）。" },
  { key: "q8", text: "我的身體狀況讓我可以做自己想做的事情。" },
  { key: "q9", text: "平常照顧自己的健康（例如吃藥、飲食等），我大多可以自己處理。" },
  { key: "q10", text: "若健康出現問題，我知道可以找誰或去哪裡求助。" },
];

export const Q11_TITLE = "生活支持需求";
export const Q11_TEXT =
  "生活中若有想諮詢或找人討論的事項，請從下列項目中勾選，我們可以協助您了解相關資源（可複選）：";

// exclusive：「若以上項目皆無需要」組的選項與其他組互斥，組內也只能擇一
export const Q11_GROUPS = [
  {
    title: "基本生活支持",
    items: [
      { code: "q11_financial", label: "經濟與生活負擔", description: "生活開銷、醫療或帳單有壓力，想了解可以申請的補助或其他協助" },
      { code: "q11_employment", label: "工作與就業", description: "工作壓力大、工作不穩定或正在找工作，想了解相關資源" },
      { code: "q11_welfare", label: "福利資源申辦", description: "想申請長照、身心障礙等福利或補助，但不清楚怎麼辦理" },
      { code: "q11_housing", label: "居住環境改善", description: "住的地方有些問題，例如需要修繕、想加裝扶手、擔心住不安穩" },
      { code: "q11_home", label: "居家生活支援", description: "家中的基本需要與日常照護難以維持，想了解可以協助的資源" },
      { code: "q11_transport", label: "就醫與外出交通", description: "看病或外出時交通有困難，想了解接送服務" },
    ],
  },
  {
    title: "家庭照顧",
    items: [
      { code: "q11_caregiver", label: "照顧家人的支持", description: "照顧家人覺得吃力，想知道有沒有人能暫時幫忙或教我怎麼照顧" },
      { code: "q11_parenting", label: "親職與教養支持", description: "帶小孩或孫子感到吃力，想了解課後陪伴、學習支援或相關的協助" },
    ],
  },
  {
    title: "其他",
    items: [
      { code: "q11_legal", label: "法律權益諮詢", description: "遇到跟法律或權益有關的事（如糾紛、契約），不確定該怎麼處理" },
      { code: "q11_activity", label: "社區活動引導", description: "想知道附近有哪些活動、課程或社團可以參加" },
    ],
  },
  {
    title: "若以上項目皆無需要",
    exclusive: true,
    items: [
      { code: "q11_talk", label: "但最近總覺得生活少了些什麼，想找人聊聊", description: "" },
      { code: "q11_none", label: "目前沒有其他需要，謝謝", description: "" },
    ],
  },
];

export const EXCLUSIVE_Q11_CODES = Q11_GROUPS.filter((g) => g.exclusive).flatMap((g) =>
  g.items.map((i) => i.code)
);

export const Q12_TEXT = "生活上有沒有什麼事情讓您覺得不太順心？如果有，可以簡單寫在這裡（可不填）";

export const STAFF_SECTION_TITLE = "以下由工作人員填寫";

export const ANSWER_OPTIONS = [
  { code: "yes", label: "是" },
  { code: "no", label: "否" },
  { code: "skip", label: "不回答" },
];

export const FILL_MODE_OPTIONS = [
  { code: "self", label: "民眾自行填答" },
  { code: "oral", label: "施測者口語協助完成" },
  { code: "proxy", label: "家屬（或陪同者）協助回答" },
];

export function getQuestionText(key) {
  if (key === "q11") return Q11_TEXT;
  if (key === "q12") return Q12_TEXT;
  return QUESTIONS.find((q) => q.key === key)?.text ?? "";
}

// Q11 代碼 → 原文標題（判讀頁顯示用）
export function getQ11Label(code) {
  for (const group of Q11_GROUPS) {
    const item = group.items.find((i) => i.code === code);
    if (item) return item.label;
  }
  return code;
}
