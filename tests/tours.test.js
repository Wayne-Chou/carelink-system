// 操作導覽：腳本內容、每個步驟的標記都存在於對應頁面、已看過的紀錄與自動執行規則
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const tours = await import("../src/config/tours.js");
const state = await import("../src/services/tourState.js");
const { SITEMAP_GROUPS } = await import("../src/config/sitemap.js");
const { ROLE_CODES, DEMO_ACCOUNTS } = await import("../src/config/roles.js");
const { HELP_HIDDEN_ROUTES, visibleHelpItems } = await import("../src/config/help.js");

const { PAGE_TOURS, WELCOME_CARDS, PUBLIC_ROLE, stepsFor, tourKeyOf } = tours;
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const { ROUTES, isAdminArea } = await import("../src/router/routes.js");

// 路由名稱 → 頁面元件檔（router/routes.js 的 page）
const PAGE_FILE = Object.fromEntries(ROUTES.filter((r) => r.page).map((r) => [r.name, `pages/${r.page}.vue`]));
const ADMIN_LAYOUT = "components/AdminLayout.vue";

// 頁面原始碼中的 data-tour 標記：data-tour="x"，或 :data-tour 運算式中的 'x'
function tourMarks(source) {
  const marks = new Set([...source.matchAll(/\sdata-tour="([a-z0-9-]+)"/g)].map((m) => m[1]));
  for (const [, exp] of source.matchAll(/:data-tour="([^"]+)"/g)) {
    for (const [, mark] of exp.matchAll(/'([a-z0-9-]+)'/g)) marks.add(mark);
  }
  return marks;
}
// 共用元件的標記：頁面有用到 UserMenu 時可用 user-menu；「?」按鈕在 App.vue，不顯示的頁面除外；
// 後台頁面另有後台版面（左側選單、上方列）的標記
const SHARED = { "user-menu": "components/UserMenu.vue", "help-button": "components/HelpButton.vue" };
const marksForRoute = (routeName) => {
  const source = read(PAGE_FILE[routeName]);
  const marks = tourMarks(source);
  if (isAdminArea(routeName)) tourMarks(read(ADMIN_LAYOUT)).forEach((m) => marks.add(m));
  if (/<UserMenu\b/.test(source)) tourMarks(read(SHARED["user-menu"])).forEach((m) => marks.add(m));
  if (!HELP_HIDDEN_ROUTES.includes(routeName)) tourMarks(read(SHARED["help-button"])).forEach((m) => marks.add(m));
  return marks;
};

// 需要導覽的頁面：每個角色能進入的頁面，以及公開頁
const PUBLIC_PAGES = ["login", "register", "forgot-password", "reset-password", "mailbox", "home", "explore", "user-resource-detail"];
const ROLE_PAGES = Object.fromEntries(
  SITEMAP_GROUPS.filter((g) => g.role).map((g) => [g.role, g.pages.map((p) => p.route)])
);
// 網站地圖沒有列出、但角色能進入的頁面
ROLE_PAGES.admin.push("success");
ROLE_PAGES.resource_manager.push("success");
const ALL_TOUR_ROUTES = [...new Set([...PUBLIC_PAGES, ...Object.values(ROLE_PAGES).flat()])];

describe("導覽腳本", () => {
  test("每個角色能進入的頁面與公開頁都有導覽", () => {
    for (const route of ALL_TOUR_ROUTES) assert.ok(PAGE_TOURS[tourKeyOf(route)]?.length, `${route} 沒有導覽`);
  });

  test("每個導覽步驟指定的標記都存在於對應頁面", () => {
    for (const [key, steps] of Object.entries(PAGE_TOURS)) {
      const marks = marksForRoute(key);
      for (const step of steps) {
        assert.ok(marks.has(step.target), `${key}：頁面（${PAGE_FILE[key]}）沒有 data-tour="${step.target}"`);
        if (step.fallback) assert.ok(marks.has(step.fallback), `${key}：沒有 fallback ${step.fallback}`);
      }
    }
  });

  test("步驟標註的角色都能進入該頁", () => {
    for (const [key, steps] of Object.entries(PAGE_TOURS)) {
      for (const step of steps.filter((s) => s.roles)) {
        for (const role of step.roles) {
          assert.ok(ROLE_CODES.includes(role) || role === PUBLIC_ROLE, `${key} ${step.target}：未知角色 ${role}`);
          const canEnter = PUBLIC_PAGES.includes(key) || ROLE_PAGES[role]?.includes(key);
          assert.ok(canEnter, `${key} ${step.target}：${role} 不能進入此頁`);
        }
      }
    }
  });

  test("每一步都有標題與說明，說明在 60 字以內；標記不重複", () => {
    for (const [key, steps] of Object.entries(PAGE_TOURS)) {
      for (const step of steps) {
        assert.ok(step.title && step.text, `${key} ${step.target}`);
        assert.ok([...step.text].length <= 60, `${key} ${step.target} 超過 60 字`);
      }
      const targets = steps.map((s) => s.target);
      assert.equal(new Set(targets).size, targets.length, `${key} 有重複的標記`);
    }
  });

  test("說明中以「」標示的按鈕與欄位名稱，與畫面上的文字一致", () => {
    // 畫面文字來自資料的頁面：模擬信箱的信件按鈕寫在 accountService
    // 後台頁面的文字也可能在後台版面（例：「回到民眾首頁」）
    const EXTRA_SOURCES = { mailbox: ["services/accountService.js"] };
    for (const [key, steps] of Object.entries(PAGE_TOURS)) {
      const files = [PAGE_FILE[key], ...(EXTRA_SOURCES[key] ?? []), ...(isAdminArea(key) ? [ADMIN_LAYOUT] : [])];
      const source = files.map(read).join("\n");
      for (const step of steps) {
        for (const [, label] of step.text.matchAll(/「([^「」…]+)」/g)) {
          assert.ok(source.includes(label), `${key} ${step.target}：畫面上沒有「${label}」`);
        }
      }
    }
  });

  test("依角色挑選步驟：判讀頁的判定燈號只給判讀人員與系統管理員，唯讀說明只給健康管理員", () => {
    const targets = (role) => stepsFor("assessment-review", role).map((s) => s.target);
    assert.ok(targets("reader").includes("review-yellow"));
    assert.equal(targets("manager").includes("review-decision"), false);
    assert.ok(targets("manager").includes("review-readonly"));
    assert.equal(stepsFor("home", PUBLIC_ROLE).some((s) => s.target === "home-shortcuts"), false, "民眾沒有工作入口");
  });

  test("補充的步驟：黃燈程序、新增個案、退回第 2 階段、停用帳號", () => {
    const find = (key, target) => PAGE_TOURS[key].find((s) => s.target === target);
    assert.equal(find("assessment-review", "review-yellow").fallback, "review-decision");
    assert.match(find("assessment-review", "review-yellow").text, /開啟探索頁.*需求標籤.*提供給民眾的資源/);
    assert.match(find("cases", "cases-new").text, /守望員通報或民眾自我轉介/);
    assert.match(find("case-detail", "case-stage-3").text, /退回第 2 階段重新評估/);
    assert.match(find("accounts", "accounts-suspend").text, /離職或合作終止.*須填原因/);
  });

  test("歡迎卡片：每個角色 3～4 張，最後一張說明開始使用", () => {
    assert.deepEqual(Object.keys(WELCOME_CARDS).sort(), [...ROLE_CODES].sort());
    for (const [role, cards] of Object.entries(WELCOME_CARDS)) {
      assert.ok(cards.length >= 3 && cards.length <= 4, role);
      for (const c of cards) assert.ok(c.title && c.text, role);
      assert.equal(cards.at(-1).title, "開始使用", role);
    }
  });
});

describe("紀錄與自動執行", () => {
  beforeEach(() => {
    session.data = {};
    state.setAutoTourEnabled(true);
  });

  const user = (role) => DEMO_ACCOUNTS.find((a) => a.role === role);

  test("每個角色第一次登入時顯示歡迎卡片；看過後不再自動顯示；未登入沒有歡迎卡片", () => {
    assert.equal(state.shouldShowWelcome(user("reader"), "home"), true);
    state.markWelcomeSeen("reader");
    assert.equal(state.shouldShowWelcome(user("reader"), "home"), false);
    assert.equal(state.shouldShowWelcome(user("manager"), "home"), true, "不同角色分開記錄");
    assert.equal(state.shouldShowWelcome(null, "home"), false);
  });

  test("每頁第一次進入時自動執行；同一頁不同角色分開記錄；民眾的公開頁也自動執行", () => {
    assert.equal(state.shouldAutoRunPageTour(user("admin"), "home"), true);
    state.markPageTourSeen("admin", "home");
    assert.equal(state.shouldAutoRunPageTour(user("admin"), "home"), false);
    assert.equal(state.shouldAutoRunPageTour(user("reader"), "home"), true);
    assert.equal(state.shouldAutoRunPageTour(null, "explore"), true);
  });

  test("評估填寫頁不自動執行導覽與歡迎卡片（可手動開啟）", () => {
    assert.equal(state.shouldAutoRunPageTour(user("reader"), "assessment-new"), false);
    assert.equal(state.shouldShowWelcome(user("reader"), "assessment-new"), false);
    assert.ok(stepsFor("assessment-new", "reader").length, "仍有導覽步驟可手動開啟");
    assert.match(read("pages/AssessmentNew.vue"), /startPageTour\('assessment-new'\)">工作人員：查看操作導覽</);
  });

  test("自動導覽關閉後不再自動執行任何導覽與歡迎卡片；狀態記在 sessionStorage", () => {
    state.setAutoTourEnabled(false);
    assert.equal(state.autoTourEnabled.value, false);
    assert.equal(state.shouldShowWelcome(user("reader"), "home"), false);
    assert.equal(state.shouldAutoRunPageTour(user("reader"), "home"), false);
    assert.equal(session.data["ui:tour:auto"], "false");
    state.setAutoTourEnabled(true);
    assert.equal(state.isAutoTourEnabled(), true);
  });

  test("紀錄存在 sessionStorage（ui: 前綴），關閉瀏覽器後重置", () => {
    state.markWelcomeSeen("admin");
    state.markPageTourSeen("admin", "todo");
    assert.equal(session.data["ui:tour:welcome:admin"], "true");
    assert.equal(session.data["ui:tour:page:admin:todo"], "true");
    session.data = {};
    assert.equal(state.hasSeenWelcome("admin"), false);
    assert.equal(state.hasSeenPageTour("admin", "todo"), false);
  });

  test("角落選單：重看這一頁的導覽（有導覽的頁面）、重看歡迎介紹（登入後）、自動導覽開關", () => {
    const keys = (ctx) => visibleHelpItems(ctx).map((i) => i.key);
    assert.deepEqual(keys({ routeName: "home", user: user("admin") }), ["rolePreview", "mailbox", "pageTour", "welcome", "autoTour"]);
    assert.deepEqual(keys({ routeName: "home", user: null }), ["rolePreview", "mailbox", "pageTour", "autoTour"], "未登入沒有歡迎介紹");
    assert.deepEqual(keys({ routeName: "sitemap", user: null }), ["rolePreview", "mailbox", "autoTour"], "沒有導覽的頁面不顯示重看");
  });
});
