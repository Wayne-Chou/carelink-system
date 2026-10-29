<template>
  <!-- 右下角的「?」按鈕（原型展示用）：小選單 → 角色預覽面板（從右側滑出） -->
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

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="panelOpen" class="panel-backdrop" @click="closePanel"></div>
      </Transition>
      <Transition name="slide">
        <aside
          v-if="panelOpen"
          class="side-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-preview-title"
        >
          <header class="panel-head">
            <h2 id="role-preview-title">角色預覽 <span class="prototype-badge">原型展示用</span></h2>
            <button ref="closeEl" type="button" class="close-btn" aria-label="關閉角色預覽" @click="closePanel">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>
          <div class="panel-body">
            <RolePreview @loaded="refreshView" @session-changed="onSessionChanged" />
          </div>
        </aside>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { HELP_QUERY_KEY, HELP_ROLE_PREVIEW, visibleHelpItems } from "../config/help.js";
import { refreshView } from "../utils/viewRefresh.js";
import { getCurrentUser } from "../utils/auth.js";
import { openWelcome, startPageTour } from "../services/tourController.js";
import { autoTourEnabled, setAutoTourEnabled } from "../services/tourState.js";

// 角色預覽在打開面板時才載入
const RolePreview = defineAsyncComponent(() => import("./RolePreview.vue"));

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
// 依目前頁面與登入者顯示選單項目（打開選單時重新計算）
const items = computed(() => {
  menuOpen.value;
  return visibleHelpItems({ routeName: route.name, user: getCurrentUser() });
});
const panelOpen = ref(false);
const menuEl = ref(null);
const buttonEl = ref(null);
const closeEl = ref(null);

const openPanel = async () => {
  menuOpen.value = false;
  panelOpen.value = true;
  document.body.style.overflow = "hidden";
  await nextTick();
  closeEl.value?.focus();
};

const closePanel = () => {
  if (!panelOpen.value) return;
  panelOpen.value = false;
  document.body.style.overflow = "";
  buttonEl.value?.focus();
};

const choose = (key) => {
  if (key === "rolePreview") return openPanel();
  menuOpen.value = false;
  if (key === "mailbox") router.push("/mailbox");
  else if (key === "pageTour") startPageTour(route.name);
  else if (key === "welcome") {
    const user = getCurrentUser();
    if (user) openWelcome(user.role, () => startPageTour(route.name, user));
  } else if (key === "autoTour") setAutoTourEnabled(!autoTourEnabled.value);
};

// 以某角色進入後關閉面板，並重新載入目前頁面（停在同一頁時也會更新登入者）
const onSessionChanged = () => {
  closePanel();
  refreshView();
};

// /sitemap 導向帶 help=role-preview：自動打開角色預覽，並把參數移除
watch(
  () => route.query[HELP_QUERY_KEY],
  (value) => {
    if (value !== HELP_ROLE_PREVIEW) return;
    openPanel();
    const { [HELP_QUERY_KEY]: _removed, ...query } = route.query;
    router.replace({ query });
  },
  { immediate: true }
);

// Esc：先關面板，再關選單；點選單外的地方關閉選單
const onKeydown = (event) => {
  if (event.key !== "Escape") return;
  if (panelOpen.value) closePanel();
  else if (menuOpen.value) {
    menuOpen.value = false;
    buttonEl.value?.focus();
  }
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
  document.body.style.overflow = "";
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
.menu-item:focus-visible,
.close-btn:focus-visible {
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

.panel-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1600;
  background: rgba(38, 50, 56, 0.45);
}

.side-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1700;
  width: min(760px, 92vw);
  display: flex;
  flex-direction: column;
  background: #eceff1;
  box-shadow: -8px 0 24px rgba(38, 50, 56, 0.25);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px;
  background: #37474f;
  color: #fff;
}

.panel-head h2 {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 800;
}

.prototype-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: #fff;
  color: #37474f;
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 18px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 手機：面板佔滿畫面寬度 */
@media (max-width: 576px) {
  .side-panel {
    width: 100vw;
  }

  .help-root {
    right: 14px;
    bottom: 14px;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .slide-enter-active,
  .slide-leave-active,
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
