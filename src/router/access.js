// 各路由需要的權限（原型階段，正式版需由後端處理）；router/index.js 與測試共用（網址見 router/routes.js）
//   沒有列出的路由為公開頁（首頁、探索頁、民眾資源頁、登入、註冊、忘記密碼、重設密碼、模擬信箱、網站地圖）
//   permission：需要的功能（定義見 config/roles.js）
//   scope："resource" 另外檢查資源範圍（資源點只限綁定的資源）；"resourceEdit" 檢查能否編輯該資源
//          （可管理資源的角色全部可編輯，資源點只限綁定的資源）；"assessment" 另外檢查評估範圍（健康管理員只限已開案）

const auth = (permission, scope) => ({ requiresAuth: true, permission, ...(scope ? { scope } : {}) });

export const ROUTE_ACCESS = {
  "admin-home": auth("workspace.home"),
  "assessment-new": auth("assessment.fill"),
  assessments: auth("assessment.list"),
  "assessment-review": auth(null, "assessment"),
  todo: auth("todo.view"),
  list: auth("resource.manage"),
  form: auth("resource.manage"),
  "form-edit": auth(null, "resourceEdit"),
  success: auth("resource.manage"),
  "resource-detail": auth("resource.view", "resource"),
  "resource-dashboard": auth("resource.dashboard"),
  cases: auth("case.manage"),
  "case-detail": auth("case.manage"),
  accounts: auth("account.manage"),
};

// 模擬信箱為原型展示用：不需登入即可查看所有通知信（正式版改由後端寄送 Email，沒有這一頁）
export const PUBLIC_ROUTES = [
  "home",
  "explore",
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "mailbox",
  "sitemap",
  "user-resource-detail",
];

export const routeMeta = (name) => ROUTE_ACCESS[name] ?? {};
