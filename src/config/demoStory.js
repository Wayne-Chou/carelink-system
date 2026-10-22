// 示範情境「林示範的故事」：單一主角從填評估到結案共 11 步，含一次「連結失敗、回到諮詢」的迴圈（doc/demo-guide.md）
// 主角、資源、人名皆為虛構；判斷進行到第幾步見 services/storyService.js，各步的資料見 services/demoScenario.js

// 主角：花蓮縣花蓮市獨居長者，少出門、缺乏社交
// 以姓名「林示範」認出主角（第 1 步在平板上填寫時請使用這個姓名）
export const PROTAGONIST = {
  name: "林示範",
  phone: "0900-000-001",
  livingAlone: true,
  // Q1、Q2 答否，其餘答是；Q11 勾「想找人聊聊」
  // 原評估表 v3 中「想找人聊聊」屬「若以上項目皆無需要」組，與其他選項互斥，無法同時勾「社區活動引導」；
  // 想參加社區活動的意願改寫在 Q12 與判讀的談話紀錄中
  answers: {
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
    q11: ["q11_talk"],
    q12: "老伴走了以後，一個人在家，很少跟人講話。想知道附近有沒有可以去走走、認識朋友的活動",
  },
  fillMode: "oral",
  fillNote: "示範情境：由判讀人員協助唸題",
};

export const STORY_MANAGER = "高示範";
export const STORY_READER = { name: "郭範例", type: "doctor" };
// 故事最後轉介成功的資源：示範社區太極班（Res001，資源點示範帳號綁定這筆）
export const STORY_RESOURCE_CODE = "Res001";
export const STORY_GOAL = "每週出門參加活動兩次";

// 連結失敗的迴圈：故事範例先轉介 Res003 示範關懷據點歌唱班，由歌唱班的資源點回報失敗，回到諮詢後再改轉介 Res001 太極班
// 實際操作時可轉介到任一可推薦資源，流程說明列會帶入實際選擇的資源（判斷見 services/storyService.js）
export const STORY_FIRST_RESOURCE_CODE = "Res003";
export const STORY_FAILURE_NOTE = "活動時間與看診時間衝突，無法參加";

export const LOOP_NOTE = "簡報第 3 階段「若資源不合適，回到諮詢重新評估」的迴圈";
export const UNBOUND_NOTE = "此資源沒有系統帳號，由健康管理員確認後代為記錄";
export const SKIPPED_FAILURE_NOTE = "已略過連結失敗的示範";

// 11 個步驟：預設的操作角色、對應簡報階段（個案五階段）、要去的頁面
//   第 5、8 步的操作者依所選資源是否綁定資源點帳號決定（有綁定：該資源的資源點；沒有：健康管理員代為記錄）
//   title 中的 {resource} 由實際選擇的資源名稱帶入；還不知道時（例如載入選單）用 example（故事範例）
//   page：assessment-new / assessment-review / case-detail / resource-dashboard
export const STORY_STEPS = [
  { step: 1, title: "在平板請林示範填評估表", phase: "辨識", role: "reader", page: "assessment-new" },
  { step: 2, title: "判讀為橘燈轉介，取得同意，系統自動開案", phase: "辨識", role: "reader", page: "assessment-review" },
  { step: 3, title: "首次聯繫、晤談、訂目標", phase: "諮詢", role: "manager", page: "case-detail" },
  { step: 4, title: "轉介到社區資源", phase: "連結", role: "manager", page: "case-detail" },
  {
    step: 5,
    title: "回報「{resource}」的連結結果",
    example: "示範關懷據點歌唱班",
    phase: "連結",
    role: "provider",
    page: "resource-dashboard",
    note: LOOP_NOTE,
  },
  {
    step: 6,
    title: "退回第 2 階段，補充晤談紀錄並調整計畫",
    phase: "諮詢",
    role: "manager",
    page: "case-detail",
    note: `${LOOP_NOTE}：退回諮詢，補充晤談紀錄、調整計畫後再進入連結`,
  },
  { step: 7, title: "改轉介到其他社區資源", phase: "連結", role: "manager", page: "case-detail" },
  {
    step: 8,
    title: "記錄林示範已開始參加「{resource}」",
    example: "示範社區太極班",
    phase: "連結",
    role: "provider",
    page: "resource-dashboard",
  },
  { step: 9, title: "1 個月追蹤", phase: "追蹤", role: "manager", page: "case-detail" },
  {
    step: 10,
    title: "3、6 個月追蹤",
    phase: "追蹤",
    role: "manager",
    page: "case-detail",
    note: "為方便展示，3、6 個月追蹤安排在同一天",
  },
  { step: 11, title: "結案", phase: "結案", role: "manager", page: "case-detail" },
];

export const STORY_STEP_COUNT = STORY_STEPS.length;
export const getStoryStep = (step) => STORY_STEPS.find((s) => s.step === step) ?? null;

// 以故事範例的資源帶入標題（載入示範情境的選單使用）
export const exampleTitle = (s) => s.title.replace("{resource}", s.example ?? "所選資源");
