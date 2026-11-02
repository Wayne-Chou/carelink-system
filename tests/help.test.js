// 右下角「?」按鈕（原型展示用）：選單項目、不顯示的頁面、載入示範資料；角色預覽已移除
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const { HELP_MENU_ITEMS, HELP_HIDDEN_ROUTES, isHelpVisible, visibleHelpItems } = await import("../src/config/help.js");

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const { ROUTE_NAMES, navigateTo } = await import("./helpers/routing.js");

test("選單：載入示範資料、模擬信箱、重看這一頁的導覽、重看歡迎介紹、自動導覽開關", () => {
  assert.deepEqual(
    HELP_MENU_ITEMS.map((i) => [i.label, i.enabled]),
    [
      ["載入示範資料", true],
      ["模擬信箱", true],
      ["重看這一頁的導覽", true],
      ["重看歡迎介紹", true],
      ["自動導覽", true],
    ]
  );
  assert.deepEqual(visibleHelpItems({ routeName: "home", user: { role: "admin" } }).map((i) => i.key), [
    "loadDemo",
    "mailbox",
    "pageTour",
    "welcome",
    "autoTour",
  ]);
});

test("評估填寫頁不顯示「?」按鈕，其他頁面都顯示", () => {
  assert.deepEqual(HELP_HIDDEN_ROUTES, ["assessment-new"]);
  for (const name of ROUTE_NAMES) assert.equal(isHelpVisible(name), name !== "assessment-new", name);
});

test("所有頁面共用：按鈕放在 App.vue，依路由決定是否顯示", () => {
  const app = read("App.vue");
  assert.match(app, /<HelpButton v-if="showHelp" \/>/);
  assert.match(app, /isHelpVisible\(route\.name\)/);
});

test("模擬信箱：「?」選單的所有頁面都能開啟，未登入也可以；在模擬信箱頁本身不重複顯示", () => {
  const mailbox = HELP_MENU_ITEMS.find((i) => i.key === "mailbox");
  assert.equal(mailbox.path, "/mailbox");
  for (const name of ROUTE_NAMES.filter(isHelpVisible)) {
    const keys = visibleHelpItems({ routeName: name, user: null }).map((i) => i.key);
    assert.equal(keys.includes("mailbox"), name !== "mailbox", name);
  }
  assert.match(read("components/HelpButton.vue"), /key === "mailbox"\) router\.push\("\/mailbox"\)/);
});

test("模擬信箱入口：登入頁移除；註冊送出後、忘記密碼頁、帳號管理頁保留", () => {
  const login = read("pages/Login.vue");
  assert.doesNotMatch(login, /to="\/mailbox"|模擬信箱|角色預覽/);
  for (const page of ["Register.vue", "ForgotPassword.vue", "AccountManagement.vue"]) {
    assert.match(read(`pages/${page}`), /<router-link to="\/mailbox"/, page);
  }
});

test("/sitemap：導向首頁（不帶任何參數）", async () => {
  const arrived = await navigateTo("/sitemap");
  assert.equal(arrived.name, "home");
  assert.equal(arrived.fullPath, "/");
});

test("載入示範資料：以畫面內對話框確認會清空資源、評估、個案，確認後才載入並重新載入目前頁面", () => {
  const button = read("components/HelpButton.vue");
  assert.match(button, /key === "loadDemo"\) loadDemo\(\)/);
  const body = button.slice(button.indexOf("const loadDemo"), button.indexOf("const choose"));
  assert.match(body, /await confirmDialog\(\{\s*id: "demo-load"/);
  assert.match(body, /筆資源.*筆評估.*筆個案/, "說明會清空的資料");
  assert.match(body, /if \(!ok\) return;\s*try \{\s*const demo = loadDemoData\(\);\s*refreshView\(\);/);
});

test("角色預覽已移除：元件、服務、頁面清單與「?」選單項目都不存在", () => {
  for (const file of ["components/RolePreview.vue", "services/rolePreview.js", "services/sitemapService.js", "config/sitemap.js"]) {
    assert.equal(existsSync(new URL(`../src/${file}`, import.meta.url)), false, file);
  }
  assert.equal(HELP_MENU_ITEMS.some((i) => i.key === "rolePreview"), false);
  for (const file of ["components/HelpButton.vue", "pages/Home.vue", "config/tours.js", "router/routes.js"]) {
    assert.doesNotMatch(read(file), /RolePreview|角色預覽|role-preview/, file);
  }
});
