// 操作導覽的紀錄與判斷（不操作畫面，可在測試中執行）
// 已看過的歡迎卡片、各頁導覽與「自動導覽」開關都記在 sessionStorage（storage.js 的 readUiState／writeUiState），
// 關閉瀏覽器後重置；同一頁不同角色分開記錄（未登入的民眾記為 public）

import { ref } from "vue";
import { readUiState, writeUiState } from "./storage.js";
import { MANUAL_ONLY_TOURS, PUBLIC_ROLE, hasPageTour, tourKeyOf, welcomeCardsFor } from "../config/tours.js";

const AUTO_KEY = "tour:auto";
export const welcomeKey = (role) => `tour:welcome:${role}`;
export const pageTourKey = (role, routeName) => `tour:page:${role}:${tourKeyOf(routeName)}`;

export const roleKeyOf = (user) => user?.role || PUBLIC_ROLE;

// ── 自動導覽開關（右下角「?」選單）：關閉後這次不再自動執行導覽與歡迎卡片，仍可手動重看 ──
export const isAutoTourEnabled = () => readUiState(AUTO_KEY, true) !== false;
// 畫面上顯示的開關狀態
export const autoTourEnabled = ref(isAutoTourEnabled());
export function setAutoTourEnabled(enabled) {
  writeUiState(AUTO_KEY, !!enabled);
  autoTourEnabled.value = !!enabled;
}

// ── 已看過 ──
export const hasSeenWelcome = (role) => readUiState(welcomeKey(role), false) === true;
export const markWelcomeSeen = (role) => writeUiState(welcomeKey(role), true);
export const hasSeenPageTour = (role, routeName) => readUiState(pageTourKey(role, routeName), false) === true;
export const markPageTourSeen = (role, routeName) => writeUiState(pageTourKey(role, routeName), true);

const isManualOnly = (routeName) => MANUAL_ONLY_TOURS.includes(tourKeyOf(routeName));

// 進入頁面時是否自動顯示歡迎卡片：已登入、這個角色第一次、不是只能手動開啟導覽的頁面
export function shouldShowWelcome(user, routeName) {
  if (!user || !isAutoTourEnabled() || isManualOnly(routeName)) return false;
  return welcomeCardsFor(user.role).length > 0 && !hasSeenWelcome(user.role);
}

// 進入頁面時是否自動執行此頁的導覽：這個角色第一次進入，且不是只能手動開啟的頁面
export function shouldAutoRunPageTour(user, routeName) {
  if (!isAutoTourEnabled() || isManualOnly(routeName) || !hasPageTour(routeName)) return false;
  return !hasSeenPageTour(roleKeyOf(user), routeName);
}
