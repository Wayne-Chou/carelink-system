// 示範個案：7 筆虛構個案，沿用目前 CaseList／CaseDetail 的資料格式（localStorage「cases」）
// 姓名皆含「示範／範例／示例／範本」；個案格式沒有電話欄位
// 每筆帶 isDemo: true，可與示範資源一起一鍵移除
//
// 階段分布：辨識 1、諮詢 1、連結 2、追蹤 2、已結案 1
//   連結階段：一筆連到黃燈資源 Res001（提示需陪同），一筆連到暫停中的 Res004（提示需重新選擇）
// 資源端後台：Res001、Res002 各有 2 筆轉介個案，各含「待回報」與「成功」
//
// 歷程紀錄的寫法與 CaseDetail.vue 一致：建立為「初始建立」，其餘以「[健康管理員] 」開頭

const ROLE = "[健康管理員] ";
const h = (stage, date, note, withRole = true) => ({ stage, date, note: withRole ? ROLE + note : note });

const EMPTY_CONSULTATION = { needLevel: "", motivation: "", goal: "", note: "" };
const EMPTY_LINKAGE = { resourceId: null, resourceName: "", reason: "", status: "" };
const EMPTY_CLOSURE = { reason: "", outcome: "" };

// 示範資源 id（見 demoResources.js）
const WALKING = { id: "7c1e2a40-5b3d-4f1a-9e2c-1a2b3c4d5e6f", name: "湳興河濱長者健走班" }; // Res001 黃燈
const MEAL = { id: "d3a1f0b2-1c4e-4a6b-8d2f-0a1b2c3d4e02", name: "範例里社區共餐食堂" }; // Res002
const REPAIR = { id: "d3a1f0b2-1c4e-4a6b-8d2f-0a1b2c3d4e06", name: "示範居家安全修繕服務" }; // Res004 暫停

export const DEMO_CASES = [
  // 1. 辨識階段：剛建立，基本資料已填
  {
    id: "case_demo_01",
    isDemo: true,
    basic: {
      name: "李示範",
      age: "78",
      gender: "女",
      identity: ["獨居長者"],
      source: "醫療",
      problem: "獨居，近半年很少出門，家醫科醫師建議多參加社區活動",
    },
    consultation: EMPTY_CONSULTATION,
    linkage: EMPTY_LINKAGE,
    tracking: [],
    closure: EMPTY_CLOSURE,
    stage: 1,
    history: [h(1, "2026-10-03", "初始建立", false)],
    createdAt: "2026-10-03",
  },

  // 2. 諮詢階段：已初訪，需求評估尚未填完
  {
    id: "case_demo_02",
    isDemo: true,
    basic: {
      name: "周範例",
      age: "70",
      gender: "男",
      identity: ["慢性病患"],
      source: "社區",
      problem: "糖尿病控制不穩定，退休後生活缺少重心",
    },
    consultation: {
      needLevel: "中",
      motivation: "",
      goal: "",
      note: "初訪：對運動有興趣，但擔心運動時血糖過低，下次訪談再確認參與意願",
    },
    linkage: EMPTY_LINKAGE,
    tracking: [],
    closure: EMPTY_CLOSURE,
    stage: 2,
    history: [h(1, "2026-09-26", "初始建立", false), h(2, "2026-09-28", "流程推進")],
    createdAt: "2026-09-26",
  },

  // 3. 連結階段：已連結黃燈資源 Res001，等待資源端回報
  {
    id: "case_demo_03",
    isDemo: true,
    basic: {
      name: "呂示例",
      age: "82",
      gender: "女",
      identity: ["獨居長者"],
      source: "醫療",
      problem: "今年跌倒後較少出門，想恢復體力並認識新朋友",
    },
    consultation: {
      needLevel: "中",
      motivation: "高",
      goal: "每週參加一次團體運動，三個月內能自行步行 30 分鐘",
      note: "本人主動表示想運動，但擔心再次跌倒，希望第一次有人陪同",
    },
    linkage: {
      resourceId: WALKING.id,
      resourceName: WALKING.name,
      reason: "住家附近、免費，且帶班老師具體適能證照；首次參加由健康管理員陪同",
      status: "",
    },
    tracking: [],
    closure: EMPTY_CLOSURE,
    stage: 3,
    history: [
      h(1, "2026-09-15", "初始建立", false),
      h(2, "2026-09-17", "流程推進"),
      h(2, "2026-09-22", "本人主動表示想運動，但擔心再次跌倒，希望第一次有人陪同"),
      h(3, "2026-09-22", "流程推進"),
      h(3, "2026-09-24", `連結資源：${WALKING.name}（需健康管理員陪同至少一次）`),
    ],
    createdAt: "2026-09-15",
  },

  // 4. 連結階段：連結的 Res004 之後暫停服務，個案頁會提示需重新選擇資源
  {
    id: "case_demo_04",
    isDemo: true,
    basic: {
      name: "曾範本",
      age: "75",
      gender: "男",
      identity: ["身心障礙"],
      source: "社區",
      problem: "浴室濕滑曾滑倒，家中缺少扶手，行動需使用助行器",
    },
    consultation: {
      needLevel: "高",
      motivation: "中",
      goal: "一個月內完成浴室與走道扶手加裝",
      note: "家屬同意居家評估，希望盡快改善浴室安全",
    },
    linkage: {
      resourceId: REPAIR.id,
      resourceName: REPAIR.name,
      reason: "提供到府評估與扶手加裝，身障者可申請材料費補助",
      status: "",
    },
    tracking: [],
    closure: EMPTY_CLOSURE,
    stage: 3,
    history: [
      h(1, "2026-09-01", "初始建立", false),
      h(2, "2026-09-03", "流程推進"),
      h(2, "2026-09-08", "家屬同意居家評估，希望盡快改善浴室安全"),
      h(3, "2026-09-08", "流程推進"),
      h(3, "2026-09-10", `連結資源：${REPAIR.name}`),
    ],
    createdAt: "2026-09-01",
  },

  // 5. 追蹤階段：連結 Res002，資源端已回報成功，已有兩次追蹤
  {
    id: "case_demo_05",
    isDemo: true,
    basic: {
      name: "謝示範",
      age: "73",
      gender: "女",
      identity: ["獨居長者"],
      source: "自主",
      problem: "子女在外地工作，平時一個人吃飯，三餐常隨便解決",
    },
    consultation: {
      needLevel: "中",
      motivation: "高",
      goal: "每週至少參加兩次共餐，改善飲食並增加與人互動",
      note: "喜歡和人聊天，對共餐很有興趣；經濟狀況符合餐費補助",
    },
    linkage: {
      resourceId: MEAL.id,
      resourceName: MEAL.name,
      reason: "步行可到，經評估可申請餐費全額補助",
      status: "成功",
    },
    tracking: [
      { status: "出席", effect: "改善", note: "第一次參加就和同桌長輩聊開，主動詢問下次時間", date: "2026-09-12", step: 1 },
      { status: "出席", effect: "無變化", note: "固定週一、三出席，飲食規律但體重尚無明顯變化", date: "2026-09-26", step: 2 },
    ],
    closure: EMPTY_CLOSURE,
    stage: 4,
    history: [
      h(1, "2026-08-20", "初始建立", false),
      h(2, "2026-08-22", "流程推進"),
      h(2, "2026-08-27", "喜歡和人聊天，對共餐很有興趣；經濟狀況符合餐費補助"),
      h(3, "2026-08-27", "流程推進"),
      h(3, "2026-08-29", `連結資源：${MEAL.name}`),
      h(3, "2026-09-02", "已完成資源連結"),
      h(4, "2026-09-02", "流程推進"),
      h(4, "2026-09-12", "第1次追蹤｜出席｜改善｜第一次參加就和同桌長輩聊開，主動詢問下次時間"),
      h(4, "2026-09-26", "第2次追蹤｜出席｜無變化｜固定週一、三出席，飲食規律但體重尚無明顯變化"),
    ],
    createdAt: "2026-08-20",
  },

  // 6. 追蹤階段：連結 Res002，資源端尚未回報
  {
    id: "case_demo_06",
    isDemo: true,
    basic: {
      name: "潘範例",
      age: "69",
      gender: "男",
      identity: ["慢性病患"],
      source: "醫療",
      problem: "高血壓，飲食偏鹹，營養師建議調整飲食",
    },
    consultation: {
      needLevel: "低",
      motivation: "中",
      goal: "了解少鹽飲食，每週參加一次共餐",
      note: "願意嘗試，但擔心餐點口味太淡",
    },
    linkage: {
      resourceId: MEAL.id,
      resourceName: MEAL.name,
      reason: "共餐由營養師規劃菜單，可體驗少鹽飲食",
      status: "",
    },
    tracking: [
      { status: "出席", effect: "無變化", note: "已參加一次，表示口味可以接受，會再去", date: "2026-10-01", step: 1 },
    ],
    closure: EMPTY_CLOSURE,
    stage: 4,
    history: [
      h(1, "2026-09-10", "初始建立", false),
      h(2, "2026-09-11", "流程推進"),
      h(2, "2026-09-16", "願意嘗試，但擔心餐點口味太淡"),
      h(3, "2026-09-16", "流程推進"),
      h(3, "2026-09-18", `連結資源：${MEAL.name}`),
      h(3, "2026-09-23", "已完成資源連結"),
      h(4, "2026-09-23", "流程推進"),
      h(4, "2026-10-01", "第1次追蹤｜出席｜無變化｜已參加一次，表示口味可以接受，會再去"),
    ],
    createdAt: "2026-09-10",
  },

  // 7. 已結案：連結 Res001，資源端已回報成功，三次追蹤後目標達成
  {
    id: "case_demo_07",
    isDemo: true,
    basic: {
      name: "葉示例",
      age: "80",
      gender: "女",
      identity: ["慢性病患"],
      source: "醫療",
      problem: "膝關節退化，活動量少，醫師建議規律散步",
    },
    consultation: {
      needLevel: "中",
      motivation: "中",
      goal: "三個月內養成每週固定散步的習慣",
      note: "一個人散步提不起勁，希望有同伴一起",
    },
    linkage: {
      resourceId: WALKING.id,
      resourceName: WALKING.name,
      reason: "團體步行有同伴，步調和緩適合膝關節退化者",
      status: "成功",
    },
    tracking: [
      { status: "出席", effect: "改善", note: "健康管理員陪同首次參加，全程完成", date: "2026-06-16", step: 1 },
      { status: "出席", effect: "改善", note: "已能自行前往，結交兩位固定同伴", date: "2026-07-14", step: 2 },
      { status: "出席", effect: "改善", note: "連續一個月每週出席，膝蓋疼痛減輕", date: "2026-08-18", step: 3 },
    ],
    closure: {
      reason: "目標達成",
      outcome: "已能自行參加健走班，每週固定出席並結交同伴，膝蓋疼痛減輕",
    },
    stage: 6,
    history: [
      h(1, "2026-05-20", "初始建立", false),
      h(2, "2026-05-22", "流程推進"),
      h(2, "2026-05-29", "一個人散步提不起勁，希望有同伴一起"),
      h(3, "2026-05-29", "流程推進"),
      h(3, "2026-06-02", `連結資源：${WALKING.name}（需健康管理員陪同至少一次）`),
      h(3, "2026-06-09", "已完成資源連結"),
      h(4, "2026-06-09", "流程推進"),
      h(4, "2026-06-16", "第1次追蹤｜出席｜改善｜健康管理員陪同首次參加，全程完成"),
      h(4, "2026-07-14", "第2次追蹤｜出席｜改善｜已能自行前往，結交兩位固定同伴"),
      h(4, "2026-08-18", "第3次追蹤｜出席｜改善｜連續一個月每週出席，膝蓋疼痛減輕"),
      h(5, "2026-08-25", "流程推進"),
      h(5, "2026-09-01", "目標達成｜已能自行參加健走班，每週固定出席並結交同伴，膝蓋疼痛減輕"),
    ],
    createdAt: "2026-05-20",
  },
];
