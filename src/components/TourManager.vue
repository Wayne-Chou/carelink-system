<template>
  <!-- 操作導覽（原型展示用）：進入頁面時自動顯示歡迎卡片與這一頁的導覽（App.vue 使用） -->
  <WelcomeCards />
</template>

<script setup>
import "driver.js/dist/driver.css";
import { nextTick, watch } from "vue";
import { useRoute } from "vue-router";
import WelcomeCards from "./WelcomeCards.vue";
import { openWelcome, startPageTour, stopTour } from "../services/tourController.js";
import { shouldAutoRunPageTour, shouldShowWelcome } from "../services/tourState.js";
import { getCurrentUser } from "../utils/auth.js";
import { viewVersion } from "../utils/viewRefresh.js";

const route = useRoute();

// 等頁面資料畫好再開始（列表與卡片在掛載後才出現）
const RENDER_DELAY_MS = 450;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let runId = 0;
// 換頁或重新載入頁面時：先結束進行中的導覽；這個角色第一次登入先顯示歡迎卡片，再執行這一頁的導覽
watch(
  [() => route.name, viewVersion],
  async () => {
    stopTour();
    const id = (runId += 1);
    await nextTick();
    await wait(RENDER_DELAY_MS);
    if (id !== runId || !route.name) return; // 等待期間又換頁
    const user = getCurrentUser();
    const name = route.name;
    const runPageTour = () => {
      if (id === runId && shouldAutoRunPageTour(user, name)) startPageTour(name, user);
    };
    if (shouldShowWelcome(user, name)) openWelcome(user.role, runPageTour);
    else runPageTour();
  },
  { immediate: true }
);
</script>

<style>
/* 導覽說明泡泡（driver.js 的 popoverClass）：與右下角「?」按鈕同樣的冷灰藍配色 */
.driver-popover.carelink-tour {
  max-width: min(340px, calc(100vw - 32px));
  border-radius: 14px;
  border-top: 5px solid #37474f;
  color: #263238;
  font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
}

.driver-popover.carelink-tour .driver-popover-title {
  font-size: 17px;
  font-weight: 800;
}

.driver-popover.carelink-tour .driver-popover-description {
  font-size: 15px;
  line-height: 1.7;
  color: #37474f;
}

.driver-popover.carelink-tour .driver-popover-progress-text {
  font-size: 13px;
  font-weight: 700;
  color: #607d8b;
}

.driver-popover.carelink-tour .driver-popover-footer button {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 14px;
  text-shadow: none;
}

.driver-popover.carelink-tour .driver-popover-next-btn {
  background: #37474f;
  border-color: #37474f;
  color: #fff;
}

.driver-popover.carelink-tour .carelink-tour-skip {
  margin-right: auto;
  border: none;
  background: transparent;
  color: #607d8b;
}
</style>
