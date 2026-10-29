// 右下角「?」按鈕（原型展示用）：選單項目、不顯示的頁面、角色預覽面板的入口
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const {
  HELP_MENU_ITEMS,
  HELP_HIDDEN_ROUTES,
  HELP_QUERY_KEY,
  HELP_ROLE_PREVIEW,
  ROLE_PREVIEW_LINK,
  isHelpVisible,
  visibleHelpItems,
} = await import("../src/config/help.js");

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const ROUTER_SOURCE = read("router/index.js");
const ROUTE_NAMES = [...ROUTER_SOURCE.matchAll(/name: "([a-z-]+)"|meta\("([a-z-]+)"\)/g)].map((m) => m[1] ?? m[2]);

test("選單：角色預覽、模擬信箱、重看這一頁的導覽、重看歡迎介紹、自動導覽開關", () => {
  assert.deepEqual(
    HELP_MENU_ITEMS.map((i) => [i.label, i.enabled]),
    [
      ["角色預覽", true],
      ["模擬信箱", true],
      ["重看這一頁的導覽", true],
      ["重看歡迎介紹", true],
      ["自動導覽", true],
    ]
  );
  assert.deepEqual(visibleHelpItems({ routeName: "home", user: { role: "admin" } }).map((i) => i.key), [
    "rolePreview",
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
  assert.doesNotMatch(login, /to="\/mailbox"|ROLE_PREVIEW_LINK|模擬信箱|角色預覽/);
  for (const page of ["Register.vue", "ForgotPassword.vue", "AccountManagement.vue"]) {
    assert.match(read(`pages/${page}`), /<router-link to="\/mailbox"/, page);
  }
});

test("/sitemap：導向首頁並自動打開角色預覽面板", () => {
  assert.deepEqual(ROLE_PREVIEW_LINK, { path: "/", query: { [HELP_QUERY_KEY]: HELP_ROLE_PREVIEW } });
  assert.ok(ROUTER_SOURCE.includes(`{ path: "/sitemap", name: "sitemap", redirect: ROLE_PREVIEW_LINK }`));
  const button = read("components/HelpButton.vue");
  assert.match(button, /route\.query\[HELP_QUERY_KEY\]/, "依網址參數自動打開");
});

test("面板：沿用角色預覽元件；可用關閉按鈕、點面板外、Esc 關閉；手機佔滿寬度", () => {
  const button = read("components/HelpButton.vue");
  assert.match(button, /<RolePreview /);
  assert.match(button, /class="panel-backdrop" @click="closePanel"/, "點面板外關閉");
  assert.match(button, /event\.key !== "Escape"/, "Esc 關閉");
  assert.match(button, /aria-label="關閉角色預覽" @click="closePanel"/, "關閉按鈕");
  assert.match(button, /@media \(max-width: 576px\)\s*\{\s*\.side-panel\s*\{\s*width: 100vw;/, "手機佔滿寬度");
});

test("首頁不再有角色預覽區塊", () => {
  const home = read("pages/Home.vue");
  assert.doesNotMatch(home, /RolePreview|角色預覽|sitemap-section/);
});
