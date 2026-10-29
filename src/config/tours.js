// 操作導覽（原型展示用）：歡迎卡片與各頁聚光燈導覽的文字與步驟都集中在這裡
// 每個步驟以 target 對應頁面上的 data-tour 標記（不依賴樣式或文字定位）；tests/tours.test.js 會檢查標記都存在
//
// 步驟欄位：
//   target    data-tour 標記
//   title、text  說明泡泡的標題與內容（提到的按鈕名稱與畫面上的文字一致）
//   roles     只給這些角色看（角色代碼；未登入的民眾為 "public"）；沒有指定時所有能進入此頁的人都看得到
//   fallback  target 不在畫面上時改框起的標記（例如只有選了黃燈才出現的區塊）
// 執行時，畫面上找不到的步驟會自動跳過（例如沒有資料時不顯示的區塊）

import { FIRST_CONTACT_HOURS, FOLLOW_UP_MONTHS } from "./assessmentRules.js";
import { PASSWORD_RULE_TEXT, RESET_TOKEN_MINUTES, SETUP_TOKEN_DAYS } from "./accounts.js";
import { STRICT_VALIDATION } from "./resourceRules.js";

// 未登入的民眾在導覽紀錄中的角色代碼
export const PUBLIC_ROLE = "public";

// 不自動執行導覽的頁面（仍可手動開啟）：評估填寫頁由民眾操作
export const MANUAL_ONLY_TOURS = ["assessment-new"];

// 共用同一份導覽的路由（同一個頁面元件）
export const TOUR_ALIASES = { "resources-list": "list" };

const START_CARD = {
  title: "開始使用",
  text: "接下來帶你認識這一頁。之後隨時可以按右下角的「?」，重看這一頁的導覽或這份歡迎介紹。",
};

// ── 歡迎卡片：每個角色 4 張（你是誰、從哪裡開始、在流程中的位置、開始使用）──
export const WELCOME_CARDS = {
  admin: [
    { title: "你是系統管理員", text: "負責維護整個平台：資源、帳號，以及所有評估與個案資料都看得到。" },
    {
      title: "從這裡開始",
      text: "首頁的「待辦」會提醒資源待驗證與待審核的帳號申請；新的註冊申請在「帳號管理」審核。",
    },
    {
      title: "你在流程中的位置",
      text: "你不直接處理個案，而是讓每個環節運作：開通判讀人員、健康管理員與資源點帳號，並維護資源，讓轉介有地方可去。",
    },
    START_CARD,
  ],
  resource_manager: [
    { title: "你是資源管理員", text: "負責社區資源的資料正確：新增、編輯、定期驗證，並綁定資源點帳號。" },
    { title: "從這裡開始", text: "「待辦」列出超過驗證日期的資源；在「資源管理」新增或維護資源。" },
    {
      title: "你在流程中的位置",
      text: "健康管理員在「連結」階段從你維護的資源挑選轉介對象。只有活躍中、合作已確認、綠燈或黃燈的資源，會出現在轉介選單與民眾探索頁。",
    },
    START_CARD,
  ],
  reader: [
    { title: "你是判讀人員", text: "讓民眾填寫生活近況評估表，閱讀填答、和民眾談話，再判定燈號。" },
    { title: "從這裡開始", text: "用「填寫評估」把平板交給民眾，或從「待辦」的「尚未判讀」開始判讀。" },
    {
      title: "你在流程中的位置",
      text: "你負責第 1 階段「辨識」。判為橘燈轉介並取得同意後，系統自動開案交給健康管理員；黃燈則當場提供資源資訊。",
    },
    START_CARD,
  ],
  manager: [
    { title: "你是健康管理員", text: "陪伴橘燈個案，從晤談、轉介資源、追蹤到結案。" },
    {
      title: "從這裡開始",
      text: "「待辦」會列出逾期未聯繫、追蹤到期、資源點未回報的個案；所有個案在「個案管理」。",
    },
    {
      title: "你在流程中的位置",
      text: `判讀人員開案後，第 2～5 階段（諮詢、連結、追蹤、結案）由你負責。開案後 ${FIRST_CONTACT_HOURS} 小時內要首次聯繫。`,
    },
    START_CARD,
  ],
  provider: [
    { title: "你是資源點", text: "你的帳號綁定一個社區資源，可以看到轉介到這裡的個案。" },
    { title: "從這裡開始", text: "登入後直接進入「資源端後台」，回報轉介來的個案有沒有開始參加。" },
    {
      title: "你在流程中的位置",
      text: "在第 3 階段「連結」，你的回報讓健康管理員知道轉介是否成功，成功後才進入追蹤。你也可以用「編輯資源」更新時間、名額、費用與聯絡方式。",
    },
    START_CARD,
  ],
};

const STAFF = ["admin", "resource_manager", "reader", "manager", "provider"];
const REVIEWERS = ["admin", "reader"];
const RESOURCE_ADMINS = ["admin", "resource_manager"];

// ── 各頁導覽（key 為路由名稱）──
export const PAGE_TOURS = {
  // ── 公開頁 ──
  home: [
    { target: "home-search", title: "搜尋", text: "輸入關鍵字後按「搜尋」，或點下方熱門標籤，到探索頁找資源。" },
    { target: "home-nearby", title: "找我附近的資源", text: "依目前位置由近到遠排序；位置只在這個頁面使用，不會儲存。" },
    {
      target: "home-shortcuts",
      title: "你的工作入口",
      text: "依你的角色只顯示能用的功能；待辦有逾期時會顯示數量。",
      roles: STAFF,
    },
    { target: "home-region", title: "選擇行政區", text: "先選縣市、再選行政區，帶著條件前往探索頁。" },
    { target: "home-categories", title: "服務分類", text: "依處方類型瀏覽，例如身心健康促進、社會連結。" },
    { target: "home-featured", title: "精選資源", text: "最近更新、目前可以參加的資源。" },
    { target: "user-menu", title: "目前登入的帳號", text: "右上角顯示姓名與角色，也可以在這裡登出。", roles: STAFF },
    { target: "help-button", title: "需要幫忙時", text: "右下角的「?」可以重看導覽與歡迎介紹，或開啟角色預覽、模擬信箱。" },
  ],
  explore: [
    { target: "explore-search", title: "搜尋", text: "輸入關鍵字或地址後按「搜尋」。" },
    {
      target: "explore-filters",
      title: "篩選條件",
      text: "地區、處方類型、需求標籤、適合年齡與身分，可以同時使用。",
    },
    { target: "explore-nearby", title: "使用目前位置", text: "依距離排序，也可以限制範圍；位置不會儲存。" },
    { target: "explore-results", title: "搜尋結果", text: "點資源卡片上的「前往查看」，看服務時間、參加方式與聯絡方式。" },
  ],
  "user-resource-detail": [
    { target: "public-resource-hero", title: "資源名稱與狀態", text: "資源的名稱、類型，以及目前是否開放參加。" },
    { target: "public-resource-schedule", title: "服務時間", text: "每週或每月的活動時間。" },
    { target: "public-resource-join", title: "如何參加", text: "參與方式、費用與參加須知。" },
    { target: "public-resource-contact", title: "地點與聯絡方式", text: "活動地點、交通方式與聯絡人。" },
  ],
  login: [
    { target: "login-form", title: "登入", text: "輸入 Email 與密碼後按「登入」。" },
    { target: "login-forgot", title: "忘記密碼？", text: "輸入 Email，系統寄出重設密碼的連結。" },
    { target: "login-quick", title: "快速登入（示範用）", text: "一鍵以各角色的示範帳號登入，方便展示。" },
    {
      target: "login-register",
      title: "申請帳號",
      text: "判讀人員、健康管理員、資源點可以申請帳號；審核通過後會收到設定密碼的信。",
    },
  ],
  register: [
    { target: "register-role", title: "申請角色", text: "選好角色後，下方會出現該角色需要填寫的欄位。" },
    {
      target: "register-supervisor",
      title: "目前單位主管或聯絡人",
      text: "審核時可能會向對方確認你的身分。",
    },
    { target: "register-consent", title: "個資保護與保密同意", text: "閱讀後必須勾選才能送出。" },
    { target: "register-submit", title: "送出申請", text: "系統管理員審核後，以 Email 通知結果並附設定密碼連結。" },
  ],
  "forgot-password": [
    {
      target: "forgot-form",
      title: "寄出重設密碼信",
      text: `輸入註冊時的 Email，信中的連結 ${RESET_TOKEN_MINUTES} 分鐘內有效。`,
    },
    { target: "forgot-mailbox", title: "模擬信箱", text: "原型不會真的寄信，系統的信件都在模擬信箱。" },
  ],
  "reset-password": [
    {
      target: "reset-form",
      title: "設定新密碼",
      text: `密碼需${PASSWORD_RULE_TEXT}。審核通過或建立帳號的設定連結 ${SETUP_TOKEN_DAYS} 天內有效。`,
    },
    { target: "reset-back", title: "← 回到登入", text: "設定完成後，回到登入頁用新密碼登入。" },
  ],
  mailbox: [
    { target: "mailbox-recipients", title: "收件人", text: "信件依收件人分組，點選收件人查看他的信。" },
    { target: "mailbox-list", title: "信件列表", text: "新的信在最上面。" },
    {
      target: "mailbox-view",
      title: "信件內容",
      text: "信中的按鈕（例如「設定密碼」「前往審核」）可以直接點。",
    },
  ],

  // ── 登入後的頁面 ──
  todo: [
    { target: "todo-audience", title: "給誰", text: "切換查看各角色的待辦。", roles: ["admin"] },
    { target: "todo-types", title: "類型", text: "點類型只看這一類的待辦，再點一次取消。" },
    { target: "todo-list", title: "待辦清單", text: "逾期的排最前面，點一下前往處理。" },
  ],
  "assessment-new": [
    {
      target: "new-intro",
      title: "開頭說明",
      text: "交給民眾前可以先一起看；每一題都可以選擇不回答。",
    },
    {
      target: "new-start",
      title: "開始填寫",
      text: "一次一題的大字畫面。填完會出現「請將平板交給工作人員」，再由工作人員按「工作人員：繼續填寫」填寫填答方式後送出。",
    },
  ],
  assessments: [
    { target: "assessments-new", title: "＋ 填寫評估", text: "登入後把平板交給民眾填寫。" },
    { target: "assessments-search", title: "搜尋", text: "用姓名或評估編碼找。" },
    { target: "assessments-tabs", title: "狀態分頁", text: "未判讀、已判讀、已完成、已作廢。" },
    { target: "assessments-list", title: "評估卡片", text: "未判讀的排最前面，點一下開始判讀。" },
  ],
  "assessment-review": [
    { target: "review-person", title: "基本資料", text: "民眾姓名、填表日期與填答方式。" },
    {
      target: "review-steps",
      title: "判讀順序",
      text: "依 Q12 → Q11 → Q1–Q10 閱讀，有追問提示與對話指引；任何一步都可以按「發現緊急狀況」。",
      roles: REVIEWERS,
    },
    {
      target: "review-decision",
      title: "判定燈號",
      text: "橘燈轉介或退縮需取得民眾同意，按「完成判讀」後系統自動開案。",
      roles: REVIEWERS,
    },
    {
      target: "review-yellow",
      fallback: "review-decision",
      title: "黃燈程序",
      text: "判為黃燈時，可開啟探索頁帶入需求標籤，並記錄當場提供給民眾的資源。",
      roles: REVIEWERS,
    },
    {
      target: "review-readonly",
      title: "唯讀",
      text: "你只能查看已開案評估的判讀結果，修改判讀與作廢由判讀人員處理。",
      roles: ["manager"],
    },
    {
      target: "review-void",
      title: "作廢這筆評估",
      text: "誤建或重複填寫時作廢，須填原因；已開案的評估不能作廢。",
      roles: REVIEWERS,
    },
  ],
  cases: [
    {
      target: "cases-new",
      title: "＋新增個案",
      text: "守望員通報或民眾自我轉介時，由你直接建立個案。",
    },
    { target: "cases-tabs", title: "階段分頁", text: "進行中與各階段的個案。" },
    { target: "cases-search", title: "搜尋", text: "用姓名或個案編碼找。" },
    { target: "cases-list", title: "個案卡片", text: "首次聯繫逾期的排最前面，點一下進入個案頁。" },
  ],
  "case-detail": [
    { target: "case-summary", title: "基本資料與提醒", text: "首次聯繫期限、追蹤到期等提醒會顯示在這裡。" },
    {
      target: "case-stage-1",
      title: "五個階段",
      text: "轉介、晤談、連結、追蹤、結案；完成條件後按「下一步：進入「…」」。",
    },
    { target: "case-stage-2", title: "晤談", text: "記錄首次聯繫、「對我而言什麼最重要」與共同設定的目標。" },
    {
      target: "case-stage-3",
      title: "連結",
      text: "選擇資源後按「建立連結」；沒有帳號的資源由你代為記錄連結結果。轉介失敗時，可退回第 2 階段重新評估。",
    },
    { target: "case-stage-4", title: "追蹤", text: `建立連結後自動排定 ${FOLLOW_UP_MONTHS.join("、")} 個月追蹤。` },
    { target: "case-stage-5", title: "結案", text: "選擇結案原因，並向民眾說明再入口機制後按「結案」。" },
  ],
  list: [
    { target: "list-new", title: "＋ 新增", text: "新增一筆社區資源。" },
    { target: "list-tabs", title: "搜尋與狀態分頁", text: "用編碼、名稱、單位、行政區或需求標籤搜尋，依狀態分頁。" },
    { target: "list-card", title: "資源卡片", text: "狀態、風險燈號、合作狀態，以及是否顯示在探索頁。" },
    {
      target: "list-actions",
      title: "卡片按鈕",
      text: "「查看」「編輯」「終止」「永久刪除」；系統管理員另有「進入資源端」。",
    },
  ],
  form: [
    {
      target: "form-sections",
      title: "六個區塊",
      text: STRICT_VALIDATION ? "依資源規格六個區塊填寫，必填欄位都要填。" : "依資源規格六個區塊填寫；原型階段只有資源名稱必填。",
    },
    { target: "form-risk", title: "安全與風險評級", text: "整體風險依五項判斷條件自動計算。" },
    { target: "form-submit", title: "完成並送出", text: "送出後顯示這筆資源會不會出現在探索頁。" },
  ],
  "form-edit": [
    {
      target: "form-locked",
      title: "灰色欄位",
      text: "風險評級、合作狀態、驗證資訊等欄位只能由管理員修改。",
      roles: ["provider"],
    },
    {
      target: "form-sections",
      title: "六個區塊",
      text: STRICT_VALIDATION ? "依資源規格六個區塊填寫，必填欄位都要填。" : "依資源規格六個區塊填寫；原型階段只有資源名稱必填。",
    },
    { target: "form-risk", title: "安全與風險評級", text: "整體風險依五項判斷條件自動計算。", roles: RESOURCE_ADMINS },
    { target: "form-submit", title: "儲存變更", text: "儲存後直接生效，並留下修改紀錄。" },
  ],
  success: [
    { target: "success-status", title: "曝光狀態", text: "這筆資源會不會出現在探索頁；不會時列出原因。" },
    { target: "success-actions", title: "接下來", text: "「前往資源詳細頁」「查看資源列表」或「再新增一筆」。" },
  ],
  "resource-detail": [
    { target: "detail-edit", title: "編輯", text: "修改這筆資源。" },
    { target: "detail-visibility", title: "曝光狀態", text: "民眾探索頁與轉介選單是否顯示，以及不顯示的原因。" },
    { target: "detail-verify", title: "驗證資訊", text: "超過預計驗證日期會標示「待驗證」。" },
    {
      target: "detail-binding",
      title: "資源點帳號",
      text: "選擇帳號後按「綁定」，或按「解除綁定」；一個帳號只綁定一筆資源。",
      roles: RESOURCE_ADMINS,
    },
    { target: "detail-changelog", title: "修改紀錄", text: "誰在什麼時候改了哪些欄位，以及修改前後的內容。", roles: RESOURCE_ADMINS },
  ],
  "resource-dashboard": [
    {
      target: "dashboard-resource",
      title: "目前資源",
      text: "按「編輯資源」可以更新服務時間、名額、費用與聯絡方式。",
      roles: ["provider"],
    },
    { target: "dashboard-summary", title: "回報統計", text: "待回報與已回報的轉介筆數。" },
    {
      target: "dashboard-report",
      title: "回報連結結果",
      text: "選「成功：已開始參加」或「失敗：無法參加」，填寫出席情形與說明後按「送出回報」。",
    },
    {
      target: "dashboard-empty",
      title: "尚未綁定資源",
      text: "請聯絡系統管理員或資源管理員，在資源詳細頁綁定你的帳號。",
      roles: ["provider"],
    },
  ],
  accounts: [
    { target: "accounts-toolbar", title: "建立帳號", text: "按「建立帳號」直接建立帳號（資源管理員只能從這裡建立）；旁邊是模擬信箱。" },
    { target: "accounts-tabs", title: "狀態分頁", text: "待審核、已啟用、已退回、已停用；待審核的排最前面。" },
    {
      target: "accounts-list",
      title: "帳號卡片",
      text: "待審核的按「審核」，查看申請資料後選擇通過或退回，並記錄確認方式。",
    },
    {
      target: "accounts-suspend",
      fallback: "accounts-list",
      title: "停用帳號",
      text: "人員離職或合作終止時停用帳號，須填原因（已啟用的帳號按「查看」後可停用）。",
    },
  ],
};

// 路由名稱 → 導覽的 key
export const tourKeyOf = (routeName) => TOUR_ALIASES[routeName] ?? routeName;

export const hasPageTour = (routeName) => !!PAGE_TOURS[tourKeyOf(routeName)];

// 這個角色在此頁會看到的步驟（尚未依畫面是否存在篩選）
export function stepsFor(routeName, role = PUBLIC_ROLE) {
  return (PAGE_TOURS[tourKeyOf(routeName)] ?? []).filter((step) => !step.roles || step.roles.includes(role));
}

export const welcomeCardsFor = (role) => WELCOME_CARDS[role] ?? [];
