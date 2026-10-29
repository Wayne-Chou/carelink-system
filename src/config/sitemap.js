// 各角色能進入的頁面（原型展示用）：右下角「?」按鈕的角色預覽面板（components/RolePreview.vue）各分頁的「能進入的頁面」
// 新增頁面時在這裡加一行；tests/sitemap.test.js 會檢查每個路由都有列出（或列在 SITEMAP_EXCLUDED），
// 且每個角色列出的頁面都能通過該角色的權限檢查
//
// 每個頁面：
//   route        路由名稱（router/index.js 的 name）
//   path         網址；含 :id 的需要指定資料，依 needs 帶入示範資料
//   needs        "resource" | "assessment" | "case"：帶入哪一筆示範資料（services/demoData.js）
//   fallback     沒有示範資料時改開的頁面（對應的列表頁）
//   selectResource  系統管理員進入資源端後台前，先選好示範資源
//   label、description  頁面名稱與一行說明

const page = (route, path, label, description, extra = {}) => ({ route, path, label, description, ...extra });

// role 為 null 的是民眾（不需登入）；其他組以該角色的示範帳號登入後開啟
export const SITEMAP_GROUPS = [
  {
    key: "public",
    role: null,
    label: "民眾（不需登入）",
    pages: [
      page("home", "/", "首頁", "依需求快速找社區資源，也可以使用目前位置找附近的資源"),
      page("explore", "/explore", "資源探索", "依地區、處方類型、需求標籤、適用對象與距離篩選社區資源"),
      page("user-resource-detail", "/user/resources/:id", "民眾資源頁", "一筆資源的公開資訊，不顯示風險評級與後台資料", {
        needs: "resource",
        fallback: "/explore",
      }),
      page("login", "/login", "登入", "工作人員登入；含快速登入（示範用）與忘記密碼入口"),
      page("register", "/register", "申請帳號", "判讀人員、健康管理員、資源點申請帳號，由系統管理員審核"),
      page("forgot-password", "/forgot-password", "忘記密碼", "輸入 Email 取得重設密碼連結"),
      page("mailbox", "/mailbox", "模擬信箱", "原型展示用：系統寄出的所有通知信"),
    ],
  },
  {
    key: "admin",
    role: "admin",
    pages: [
      page("todo", "/todo", "待辦", "依今天日期計算的提醒，可切換查看全部角色的項目"),
      page("assessment-new", "/assessment/new", "填寫評估", "生活近況評估表，一次一題的大字畫面"),
      page("assessments", "/assessments", "評估列表", "所有評估紀錄，未判讀的排最前面"),
      page("assessment-review", "/assessments/:id", "判讀頁", "閱讀填答、判定燈號、取得同意後開案", {
        needs: "assessment",
        fallback: "/assessments",
      }),
      page("cases", "/cases", "個案列表", "所有個案與目前階段"),
      page("case-detail", "/case/:id", "個案頁", "個案五階段：辨識、諮詢、連結、追蹤、結案", {
        needs: "case",
        fallback: "/cases",
      }),
      page("list", "/list", "資源管理", "資源列表，可新增、編輯、終止、刪除"),
      page("form", "/form", "新增資源", "依資源規格六個區塊填寫"),
      page("resource-detail", "/resources/:id", "資源詳細頁", "全部欄位、曝光狀態、資源點帳號綁定與修改紀錄", {
        needs: "resource",
        fallback: "/list",
      }),
      page("form-edit", "/form/:id", "編輯資源", "修改資源的全部欄位，留下修改紀錄", { needs: "resource", fallback: "/list" }),
      page("resource-dashboard", "/resource-dashboard", "資源端後台", "以資源點的角度查看轉介個案並回報結果（先選好示範資源）", {
        selectResource: true,
      }),
      page("accounts", "/accounts", "帳號管理", "審核註冊申請、停用與重新啟用、建立帳號"),
    ],
  },
  {
    key: "resource_manager",
    role: "resource_manager",
    pages: [
      page("todo", "/todo", "待辦", "只顯示資源待驗證"),
      page("list", "/list", "資源管理", "資源列表，可新增、編輯、終止、刪除"),
      page("form", "/form", "新增資源", "依資源規格六個區塊填寫"),
      page("resource-detail", "/resources/:id", "資源詳細頁", "綁定資源點帳號、查看修改紀錄", {
        needs: "resource",
        fallback: "/list",
      }),
      page("form-edit", "/form/:id", "編輯資源", "修改資源的全部欄位，留下修改紀錄", { needs: "resource", fallback: "/list" }),
    ],
  },
  {
    key: "reader",
    role: "reader",
    pages: [
      page("todo", "/todo", "待辦", "尚未判讀、黃燈三個月確認、綠燈年度重評等提醒"),
      page("assessment-new", "/assessment/new", "填寫評估", "登入後把平板交給民眾填寫"),
      page("assessments", "/assessments", "評估列表", "所有評估紀錄，未判讀的排最前面"),
      page("assessment-review", "/assessments/:id", "判讀頁", "閱讀填答、判定燈號、取得同意後開案", {
        needs: "assessment",
        fallback: "/assessments",
      }),
      page("resource-detail", "/resources/:id", "資源詳細頁（唯讀）", "確認民眾是否適合參加", {
        needs: "resource",
        fallback: "/explore",
      }),
    ],
  },
  {
    key: "manager",
    role: "manager",
    pages: [
      page("todo", "/todo", "待辦", "逾期未聯繫、追蹤到期、資源點未回報等提醒"),
      page("cases", "/cases", "個案列表", "所有個案與目前階段"),
      page("case-detail", "/case/:id", "個案頁", "晤談、轉介資源、記錄連結結果、追蹤、結案", {
        needs: "case",
        fallback: "/cases",
      }),
      page("assessment-review", "/assessments/:id", "判讀頁（唯讀）", "只能查看已開案的評估", {
        needs: "assessment",
        fallback: "/cases",
      }),
      page("resource-detail", "/resources/:id", "資源詳細頁（唯讀）", "轉介前確認資源內容", {
        needs: "resource",
        fallback: "/explore",
      }),
    ],
  },
  {
    key: "provider",
    role: "provider",
    pages: [
      page("resource-dashboard", "/resource-dashboard", "資源端後台", "查看轉介到自己資源的個案並回報是否開始參加"),
      page("resource-detail", "/resources/:id", "我的資源", "自己綁定資源的詳細頁", {
        needs: "resource",
        fallback: "/resource-dashboard",
      }),
      page("form-edit", "/form/:id", "編輯我的資源", "修改資源內容、時間、人數、費用等部分欄位", {
        needs: "resource",
        fallback: "/resource-dashboard",
      }),
    ],
  },
];

// 沒有列在「能進入的頁面」的路由與原因
export const SITEMAP_EXCLUDED = {
  "resources-list": "與資源管理（/list）是同一頁",
  success: "新增資源後自動顯示的成功頁",
  "reset-password": "需從 Email 中的設定密碼或重設密碼連結開啟",
  sitemap: "導向首頁並打開角色預覽面板",
};
