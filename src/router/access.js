// 各路由需要的權限（原型階段，正式版需由後端處理）；router/index.js 與測試共用
//   沒有列出的路由為公開頁（首頁、探索頁、民眾資源頁、登入、註冊）
//   permission：需要的功能（定義見 config/roles.js）
//   scope："resource" 另外檢查資源範圍（資源點只限綁定的資源）；"assessment" 另外檢查評估範圍（健康管理員只限已開案）

const auth = (permission, scope) => ({ requiresAuth: true, permission, ...(scope ? { scope } : {}) });

export const ROUTE_ACCESS = {
  "assessment-new": auth("assessment.fill"),
  assessments: auth("assessment.list"),
  "assessment-review": auth(null, "assessment"),
  todo: auth("todo.view"),
  list: auth("resource.manage"),
  "resources-list": auth("resource.manage"),
  form: auth("resource.manage"),
  "form-edit": auth("resource.manage"),
  success: auth("resource.manage"),
  "resource-detail": auth("resource.view", "resource"),
  "resource-dashboard": auth("resource.dashboard"),
  cases: auth("case.manage"),
  "case-detail": auth("case.manage"),
};

export const PUBLIC_ROUTES = ["home", "explore", "login", "register", "user-resource-detail"];

export const routeMeta = (name) => ROUTE_ACCESS[name] ?? {};
