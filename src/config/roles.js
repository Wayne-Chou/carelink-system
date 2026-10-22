// 使用者角色、各角色可用的功能與示範帳號（doc/assessment-schema.md 第一節）
// ⚠ 原型階段使用：權限只在前端檢查，帳號與密碼存在瀏覽器；正式版權限需由後端處理
// 角色之後可能增減，請只改這個檔案（路由、首頁入口、待辦範圍都依此判斷）

export const ROLES = [
  { code: "admin", label: "系統管理員", description: "全部頁面與功能，維護資源" },
  { code: "reader", label: "判讀人員", description: "評估填寫、評估列表、判讀、待辦；資源詳細頁唯讀" },
  { code: "manager", label: "健康管理員", description: "個案列表、個案頁、待辦；資源詳細頁與已開案的評估唯讀" },
  { code: "provider", label: "資源點", description: "只能進入自己綁定資源的資源端後台與該資源詳細頁（唯讀）" },
];

export const ROLE_CODES = ROLES.map((r) => r.code);

// 註冊頁可選的角色：不開放自行註冊為系統管理員
export const REGISTERABLE_ROLES = ["reader", "manager", "provider"];

export const isValidRole = (role) => ROLE_CODES.includes(role);

export function getRoleLabel(code) {
  return ROLES.find((r) => r.code === code)?.label ?? "";
}

// ── 功能 ──────────────────────────────────────────────────
//   resource.manage        資源列表、新增、編輯、終止、刪除、示範資料
//   resource.view          資源詳細頁（唯讀；資源點只限自己綁定的資源）
//   resource.dashboard     資源端後台（資源點只限自己綁定的資源）
//   resource.dashboardAny  資源端後台可檢視任何資源
//   assessment.fill        評估填寫
//   assessment.list        評估列表
//   assessment.review      判讀、修改判讀、作廢
//   assessment.viewLinked  已開案評估的判讀頁（唯讀）
//   case.manage            個案列表、個案頁
//   todo.view              待辦（只看自己角色的項目）
//   todo.viewAll           待辦可切換查看全部
export const PERMISSIONS = {
  admin: [
    "resource.manage",
    "resource.view",
    "resource.dashboard",
    "resource.dashboardAny",
    "assessment.fill",
    "assessment.list",
    "assessment.review",
    "assessment.viewLinked",
    "case.manage",
    "todo.view",
    "todo.viewAll",
  ],
  reader: ["resource.view", "assessment.fill", "assessment.list", "assessment.review", "todo.view"],
  // 待確認事項：「健康管理員只看分派給自己的個案，還是看全部？」原型階段看全部
  manager: ["resource.view", "assessment.viewLinked", "case.manage", "todo.view"],
  provider: ["resource.view", "resource.dashboard"],
};

// 待辦頁「給誰」與角色的對應（todoService 的 audience）
export const TODO_AUDIENCE_BY_ROLE = { admin: "admin", reader: "reader", manager: "manager" };

// ── 示範帳號 ──────────────────────────────────────────────
// 寫在程式中、不存入瀏覽器，每次打開網站都可以使用，也不會被刪除或覆蓋；僅供展示
// 資源點帳號以 resourceId 綁定資源（見 services/demoResources.js 的 DEMO_RESOURCE_IDS）；
// 三個可推薦的示範資源各有一個資源點帳號，暫停中的 Res004 沒有帳號
// resourceLabel：登入頁與流程說明列顯示用
export const DEMO_PASSWORD = "demo1234";
export const DEMO_ACCOUNTS = [
  { id: "demo-admin", name: "系統管理員（示範）", email: "admin@demo.carelink", role: "admin" },
  { id: "demo-reader", name: "郭範例", email: "reader@demo.carelink", role: "reader", readerType: "doctor" },
  { id: "demo-manager", name: "高示範", email: "manager@demo.carelink", role: "manager" },
  {
    id: "demo-provider",
    name: "陳範例",
    email: "provider@demo.carelink",
    role: "provider",
    resourceId: "5f0c1a2b-7d3e-4c5a-9b1f-0a1b2c3d0001",
    resourceLabel: "Res001 示範社區太極班",
  },
  {
    id: "demo-provider2",
    name: "黃示例",
    email: "provider2@demo.carelink",
    role: "provider",
    resourceId: "5f0c1a2b-7d3e-4c5a-9b1f-0a1b2c3d0002",
    resourceLabel: "Res002 範例長青共餐食堂",
  },
  {
    id: "demo-provider3",
    name: "張範本",
    email: "provider3@demo.carelink",
    role: "provider",
    resourceId: "5f0c1a2b-7d3e-4c5a-9b1f-0a1b2c3d0003",
    resourceLabel: "Res003 示範關懷據點歌唱班",
  },
].map((account) => ({ ...account, password: DEMO_PASSWORD, isDemo: true }));
