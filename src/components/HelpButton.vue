<template>
  <!-- 右下角的「?」按鈕（原型展示用）：小選單（載入示範資料、模擬信箱、重看導覽、自動導覽開關） -->
  <div class="help-root">
    <div v-if="menuOpen" ref="menuEl" class="help-menu" role="menu" aria-label="說明與原型工具">
      <p class="menu-head">原型展示用</p>
      <template v-for="item in items" :key="item.key">
        <!-- 自動導覽的開關：關閉後這次不再自動執行導覽與歡迎卡片，仍可手動重看 -->
        <button
          v-if="item.key === 'autoTour'"
          type="button"
          role="menuitemcheckbox"
          :aria-checked="autoTourEnabled"
          class="menu-item"
          @click="choose(item.key)"
        >
          <i :class="['fa-solid', item.icon]" aria-hidden="true"></i>
          {{ item.label }}：{{ autoTourEnabled ? "開" : "關" }}
        </button>
        <button v-else type="button" role="menuitem" class="menu-item" @click="choose(item.key)">
          <i :class="['fa-solid', item.icon]" aria-hidden="true"></i>
          {{ item.label }}
        </button>
      </template>
    </div>

    <button
      ref="buttonEl"
      type="button"
      class="help-btn"
      data-tour="help-button"
      :aria-expanded="menuOpen"
      aria-haspopup="menu"
      aria-label="說明與原型工具（原型展示用）"
      title="說明與原型工具（原型展示用）"
      @click.stop="menuOpen = !menuOpen"
    >
      ?
    </button>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { visibleHelpItems } from "../config/help.js";
import { countData, loadDemoData } from "../services/demoData.js";
import { alertDialog, confirmDialog } from "../services/dialogService.js";
import { refreshView } from "../utils/viewRefresh.js";
import { getCurrentUser } from "../utils/auth.js";
import { openWelcome, startPageTour } from "../services/tourController.js";
import { autoTourEnabled, setAutoTourEnabled } from "../services/tourState.js";

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
// 依目前頁面與登入者顯示選單項目（打開選單時重新計算）
const items = computed(() => {
  menuOpen.value;
  return visibleHelpItems({ routeName: route.name, user: getCurrentUser() });
});
const menuEl = ref(null);
const buttonEl = ref(null);

// 載入示範資料：確認會清空現有的資源、評估、個案後載入，並重新載入目前頁面
const loadDemo = async () => {
  const counts = countData();
  const ok = await confirmDialog({
    id: "demo-load",
    title: "確定要載入示範資料？",
    message: `會清空目前全部 ${counts.resources} 筆資源、${counts.assessments} 筆評估、${counts.cases} 筆個案、${counts.referrals} 筆守望員轉介（含自建資料），只保留示範資料。此動作無法復原。

帳號不受影響；資源點示範帳號會改綁到示範資源。`,
    confirmText: "載入示範資料",
    tone: "danger",
  });
  if (!ok) return;
  try {
    const demo = loadDemoData();
    refreshView();
    await alertDialog({
      id: "demo-loaded",
      title: "已載入示範資料",
      message: `資源 ${demo.resource.code}、評估 ${demo.assessment.code}、個案 ${demo.case.code}、守望員轉介 ${demo.referral.code}。

一位虛構民眾的一串資料：1 筆綠燈資源（綁定 provider@demo.carelink）、1 筆已判讀為橘燈轉介的評估、1 筆已晤談並轉介、等待資源點回報的個案。另有 1 筆由 watcher@demo.carelink 送出、等待健康管理員處理的守望員轉介。`,
    });
  } catch (e) {
    await alertDialog({ id: "demo-load-failed", title: "載入失敗", message: e.message });
  }
};

const choose = (key) => {
  menuOpen.value = false;
  if (key === "loadDemo") loadDemo();
  else if (key === "mailbox") router.push("/mailbox");
  else if (key === "pageTour") startPageTour(route.name);
  else if (key === "welcome") {
    const user = getCurrentUser();
    if (user) openWelcome(user.role, () => startPageTour(route.name, user));
  } else if (key === "autoTour") setAutoTourEnabled(!autoTourEnabled.value);
};

// Esc 關閉選單；點選單外的地方關閉選單
const onKeydown = (event) => {
  if (event.key !== "Escape" || !menuOpen.value) return;
  menuOpen.value = false;
  buttonEl.value?.focus();
};
const onDocumentClick = (event) => {
  if (menuOpen.value && !menuEl.value?.contains(event.target)) menuOpen.value = false;
};

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("click", onDocumentClick);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("click", onDocumentClick);
});
</script>

<style scoped>
.help-root {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

/* 冷灰藍配色，與頁面的民眾內容區隔 */
.help-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px dashed #b0bec5;
  background: #37474f;
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 6px 18px rgba(38, 50, 56, 0.3);
  cursor: pointer;
}

.help-btn:hover,
.help-btn[aria-expanded="true"] {
  background: #263238;
}

.help-btn:focus-visible,
.menu-item:focus-visible {
  outline: 3px solid #90caf9;
  outline-offset: 2px;
}

.help-menu {
  min-width: 200px;
  padding: 6px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #cfd8dc;
  box-shadow: 0 8px 24px rgba(38, 50, 56, 0.2);
}

.menu-head {
  margin: 4px 8px 6px;
  font-size: 11px;
  font-weight: 700;
  color: #607d8b;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #263238;
  font-size: 14px;
  text-align: left;
}

.menu-item:hover {
  background: #eceff1;
}

/* 手機：按鈕靠近角落 */
@media (max-width: 576px) {
  .help-root {
    right: 14px;
    bottom: 14px;
  }
}

</style>
