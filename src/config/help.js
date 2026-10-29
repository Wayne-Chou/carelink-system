// 右下角的「?」按鈕（原型展示用，components/HelpButton.vue）：選單項目、不顯示的頁面、開啟面板的網址

import { hasPageTour, welcomeCardsFor } from "./tours.js";

// 選單項目；enabled 為 false 的不顯示
//   when：只在符合條件時顯示（pageTour：這一頁有導覽；welcome：已登入且有歡迎卡片；notOnMailbox：不在模擬信箱頁）
//   path：點選後前往的頁面（模擬信箱為公開頁，未登入也可以開啟）
//   autoTour：自動導覽的開關，標籤依目前狀態顯示「開／關」
export const HELP_MENU_ITEMS = [
  { key: "rolePreview", label: "角色預覽", icon: "fa-users", enabled: true },
  { key: "mailbox", label: "模擬信箱", icon: "fa-envelope", enabled: true, when: "notOnMailbox", path: "/mailbox" },
  { key: "pageTour", label: "重看這一頁的導覽", icon: "fa-route", enabled: true, when: "pageTour" },
  { key: "welcome", label: "重看歡迎介紹", icon: "fa-hand", enabled: true, when: "welcome" },
  { key: "autoTour", label: "自動導覽", icon: "fa-wand-magic-sparkles", enabled: true },
];

const CONDITIONS = {
  pageTour: ({ routeName }) => hasPageTour(routeName),
  welcome: ({ user }) => !!user && welcomeCardsFor(user.role).length > 0,
  notOnMailbox: ({ routeName }) => routeName !== "mailbox",
};

// 目前頁面與登入者可以看到的選單項目
export const visibleHelpItems = ({ routeName = null, user = null } = {}) =>
  HELP_MENU_ITEMS.filter((item) => item.enabled && (!item.when || CONDITIONS[item.when]({ routeName, user })));

// 不顯示「?」按鈕的頁面（路由名稱）：評估填寫頁由民眾操作，避免誤按
export const HELP_HIDDEN_ROUTES = ["assessment-new"];

export const isHelpVisible = (routeName) => !HELP_HIDDEN_ROUTES.includes(routeName);

// 網址帶 help=role-preview 時自動打開角色預覽面板（/sitemap 導向使用）
export const HELP_QUERY_KEY = "help";
export const HELP_ROLE_PREVIEW = "role-preview";
export const ROLE_PREVIEW_LINK = { path: "/", query: { [HELP_QUERY_KEY]: HELP_ROLE_PREVIEW } };
