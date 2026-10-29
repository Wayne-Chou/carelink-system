// 操作導覽的畫面控制：以 driver.js 執行聚光燈導覽，並控制歡迎卡片的顯示
// 由 components/TourManager.vue（自動執行）、HelpButton.vue（重看）與評估填寫頁（手動開啟）呼叫
// 文字與步驟在 config/tours.js；已看過的紀錄在 services/tourState.js

import { reactive } from "vue";
import { stepsFor, welcomeCardsFor } from "../config/tours.js";
import { getCurrentUser } from "../utils/auth.js";
import { markPageTourSeen, markWelcomeSeen, roleKeyOf } from "./tourState.js";

let activeDriver = null;

// 歡迎卡片的狀態（components/WelcomeCards.vue 顯示）
export const welcomeState = reactive({ role: null, cards: [], onClosed: null });

export const isTourActive = () => !!activeDriver?.isActive() || !!welcomeState.role;

// 畫面上找得到、而且看得見的標記
function findVisible(target) {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  return el && el.getClientRects().length > 0 ? el : null;
}

export function stopTour() {
  if (activeDriver?.isActive()) activeDriver.destroy();
  activeDriver = null;
}

// driver.js 在第一次執行導覽時才載入，不放進首頁的主程式
let driverModule = null;
const loadDriver = async () => (driverModule ??= await import("driver.js")).driver;

/**
 * 執行聚光燈導覽：畫面上找不到的步驟自動跳過（有 fallback 時改框起 fallback）
 * @returns {Promise<boolean>} 是否有步驟可以執行
 */
export async function runSteps(steps, { onFinished } = {}) {
  stopTour();
  const driver = await loadDriver();
  const resolved = steps
    .map((step) => ({ step, element: findVisible(step.target) ?? findVisible(step.fallback) }))
    .filter((item) => item.element);
  if (!resolved.length) {
    onFinished?.();
    return false;
  }

  activeDriver = driver({
    steps: resolved.map(({ step, element }) => ({
      element,
      popover: { title: step.title, description: step.text },
    })),
    showProgress: true,
    progressText: "{{current}}／{{total}}",
    nextBtnText: "下一步",
    prevBtnText: "上一步",
    doneBtnText: "完成",
    showButtons: ["next", "previous"],
    allowClose: true,
    overlayOpacity: 0.6,
    stagePadding: 6,
    stageRadius: 10,
    smoothScroll: true,
    popoverClass: "carelink-tour",
    // 「略過」：結束整個導覽（driver.js 沒有內建，加在按鈕列最前面）
    onPopoverRender: (popover, { driver: d }) => {
      if (!d.hasNextStep()) return;
      const skip = document.createElement("button");
      skip.type = "button";
      skip.className = "carelink-tour-skip";
      skip.textContent = "略過";
      skip.addEventListener("click", () => d.destroy());
      popover.footerButtons.prepend(skip);
    },
    onDestroyed: () => {
      activeDriver = null;
      onFinished?.();
    },
  });
  activeDriver.drive();
  return true;
}

// 這一頁的導覽（依目前登入者的角色挑選步驟）；開始時就記為已看過
export function startPageTour(routeName, user = getCurrentUser()) {
  const role = roleKeyOf(user);
  markPageTourSeen(role, routeName);
  return runSteps(stepsFor(routeName, role));
}

/**
 * 顯示歡迎卡片；看完或按「略過」都記為已看過，接著呼叫 onClosed（開始這一頁的導覽）
 */
export function openWelcome(role, onClosed = null) {
  const cards = welcomeCardsFor(role);
  if (!cards.length) {
    onClosed?.();
    return;
  }
  stopTour();
  Object.assign(welcomeState, { role, cards, onClosed });
}

export function closeWelcome() {
  const { role, onClosed } = welcomeState;
  if (!role) return;
  markWelcomeSeen(role);
  Object.assign(welcomeState, { role: null, cards: [], onClosed: null });
  onClosed?.();
}
