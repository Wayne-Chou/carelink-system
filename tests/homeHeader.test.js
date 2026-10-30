// 民眾首頁 header：登入後為「進入後台」＋使用者圖示；寬度不足時錨點收進漢堡選單
// 版面的實際寬度無法在 Node 測試中量測，這裡檢查結構與樣式規則（避免再出現固定寬度、絕對定位造成的重疊）
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const home = read("pages/Home.vue");
const style = home.slice(home.indexOf("<style"));
const template = home.slice(0, home.indexOf("<script"));

// 樣式表中某個選擇器的所有規則內容（含 @media 內的）
const rulesFor = (selector) =>
  [...style.matchAll(new RegExp(`(^|\\n)\\s*${selector.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[2]);

test("登入後：「進入後台」按鈕＋使用者圖示；首頁不再直接列出姓名與登出", () => {
  assert.doesNotMatch(template, /<UserMenu\b/, "首頁不使用後台的 UserMenu");
  assert.match(template, /<HomeUserMenu data-tour="home-user-menu"/);
  assert.match(template, /class="btn-admin btn-admin-link"\s+data-tour="home-admin-link"/);
  const menu = read("components/HomeUserMenu.vue");
  assert.match(menu, /fa-circle-user/, "使用者圖示");
  assert.match(menu, /aria-expanded="open"/);
  assert.match(menu, /\{\{ user\.name \}\}/, "展開後顯示姓名");
  assert.match(menu, /\{\{ roleLabel \}\}/, "展開後顯示角色");
  assert.match(menu, /登出/);
});

test("後台的上方列維持原本的姓名、角色與登出", () => {
  assert.match(read("components/AdminLayout.vue"), /<UserMenu variant="dark" \/>/);
});

test("錨點連結在 nav 中，寬度不足（991px 以下）時收進漢堡選單", () => {
  const nav = template.slice(template.indexOf('<nav id="home-anchor-nav"'), template.indexOf("</nav>"));
  for (const label of ["附近服務", "行政區", "實用資訊", "服務分類"]) assert.ok(nav.includes(label), label);
  assert.doesNotMatch(nav, /btn-admin|HomeUserMenu|登入/, "動作按鈕不在錨點選單中");
  assert.match(template, /class="nav-toggle"[\s\S]*?aria-controls="home-anchor-nav"/);
  const narrow = style.slice(style.indexOf("@media (max-width: 991px)"));
  assert.match(narrow, /\.nav-toggle \{\s*display: inline-flex;/);
  assert.match(narrow, /\.header-nav \{\s*display: none;/);
  assert.match(narrow, /\.header-nav\.open \{\s*display: flex;/);
});

test(".btn-admin-link 與「註冊」按鈕同樣式，不使用絕對定位或固定寬度", () => {
  for (const rule of rulesFor(".btn-admin-link")) {
    assert.doesNotMatch(rule, /position\s*:|(^|[^-])width\s*:/, rule);
  }
  assert.ok(rulesFor(".btn-admin").length, "共用 .btn-admin 樣式");
});

test("header 高度依實際量測設定，不假設固定高度；右側動作不會被擠壓", () => {
  assert.match(home, /new ResizeObserver/);
  assert.match(home, /setProperty\("--header-height"/);
  assert.doesNotMatch(style, /--header-height: 108px/, "移除手機寬度假設的固定高度");
  assert.ok(rulesFor(".header-actions").some((r) => /flex-shrink: 0/.test(r)));
  assert.ok(rulesFor(".brand").some((r) => /min-width: 0/.test(r)), "品牌文字可以縮小換行");
});
