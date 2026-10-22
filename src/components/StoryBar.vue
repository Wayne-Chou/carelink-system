<template>
  <!-- 示範情境「林示範的故事」流程說明列：有示範情境資料且已登入時顯示於所有頁面頂端（評估填寫頁除外） -->
  <aside v-if="visible" ref="bar" :class="['story-bar', { collapsed }]" aria-label="示範情境流程說明">
    <div class="bar-head">
      <span class="story-label"><i class="fa-solid fa-book-open" aria-hidden="true"></i> 林示範的故事</span>

      <template v-if="state.done">
        <strong class="step-title">故事完成：林示範已結案</strong>
        <span v-if="!collapsed" class="step-meta">可在資源列表或登入頁重新載入示範情境</span>
      </template>
      <template v-else-if="state.offTrack">
        <strong class="step-title warn">目前資料與故事不符</strong>
        <span v-if="!collapsed" class="step-meta">
          {{ state.offTrack.message }}；建議從第 {{ state.offTrack.restartStep }} 步重新載入示範情境
        </span>
      </template>
      <template v-else-if="detail.info">
        <strong class="step-title">第 {{ detail.info.step }} / {{ STORY_STEP_COUNT }} 步：{{ detail.info.title }}</strong>
        <span class="phase-chip">{{ detail.info.phase }}</span>
        <span v-if="!collapsed" class="step-meta">
          操作者：{{ detail.operator.label }}（{{ detail.operator.email }}）
        </span>
      </template>

      <div class="bar-actions">
        <button
          v-if="!collapsed"
          type="button"
          class="text-btn"
          :aria-expanded="expanded"
          @click="toggle('expanded')"
        >
          各角色現在看得到什麼 <i :class="['fa-solid', expanded ? 'fa-chevron-up' : 'fa-chevron-down']" aria-hidden="true"></i>
        </button>
        <button type="button" class="text-btn" :aria-expanded="!collapsed" @click="toggle('collapsed')">
          {{ collapsed ? "展開說明列" : "收合" }}
        </button>
      </div>
    </div>

    <template v-if="!collapsed && detail.info && !state.done && !state.offTrack">
      <p v-if="detail.info.note" class="step-note">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i> {{ detail.info.note }}
      </p>
      <p v-if="detail.isOperator" class="step-task operator">
        <i class="fa-solid fa-hand-point-right" aria-hidden="true"></i>
        {{ detail.task }}
        <router-link v-if="detail.link && detail.link.path !== $route.path" :to="detail.link.path" class="go-link">
          {{ detail.link.label }} →
        </router-link>
      </p>
      <p v-else class="step-task switch">
        <i class="fa-solid fa-user-group" aria-hidden="true"></i>
        這一步由{{ detail.operator.label }}操作，請改用{{ detail.operator.label }}帳號登入（{{ detail.operator.email
        }}<template v-if="detail.operator.password">／{{ detail.operator.password }}</template>）
      </p>
    </template>

    <div v-if="!collapsed && expanded" class="visibility">
      <section v-for="v in visibility" :key="v.role" :class="['role-card', { me: v.role === user?.role }]">
        <h3>{{ v.roleLabel }}<span v-if="v.role === user?.role">（目前登入）</span></h3>
        <ul>
          <li v-for="item in v.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { STORY_STEP_COUNT } from "../config/demoStory.js";
import { CHANGE_EVENT, readPreference, writePreference } from "../services/storage.js";
import { describeStory, describeVisibility, getStoryState } from "../services/storyService.js";
import { getCurrentUser } from "../utils/auth.js";

// 評估填寫頁是交給民眾的平板，不顯示說明列
const HIDDEN_ROUTES = ["assessment-new"];

const route = useRoute();
const bar = ref(null);
const user = ref(getCurrentUser());
const state = ref(getStoryState());
const collapsed = ref(readPreference("storyBar.collapsed", false));
const expanded = ref(readPreference("storyBar.expanded", false));

// 資料或登入狀態變更、切換頁面時重新判斷（頁面上完成一步後自動更新到下一步）
const refresh = () => {
  user.value = getCurrentUser();
  state.value = getStoryState();
};

const visible = computed(() => !!user.value && state.value.active && !HIDDEN_ROUTES.includes(route.name));
const detail = computed(() => describeStory(state.value, user.value));
const visibility = computed(() => (expanded.value ? describeVisibility(state.value) : []));

const toggle = (key) => {
  const target = key === "collapsed" ? collapsed : expanded;
  target.value = !target.value;
  writePreference(`storyBar.${key}`, target.value);
};

// 說明列的高度提供給頁面固定或黏住的 header 往下讓位（見 App.vue 的 --story-bar-height）
let observer = null;
const setHeight = (px) => document.documentElement.style.setProperty("--story-bar-height", `${px}px`);
const observe = async () => {
  observer?.disconnect();
  await nextTick();
  if (!visible.value || !bar.value) {
    setHeight(0);
    return;
  }
  setHeight(bar.value.offsetHeight);
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => bar.value && setHeight(bar.value.offsetHeight));
    observer.observe(bar.value);
  }
};

watch(() => route.fullPath, refresh);
watch(visible, observe);

onMounted(() => {
  window.addEventListener(CHANGE_EVENT, refresh);
  observe();
});
onBeforeUnmount(() => {
  window.removeEventListener(CHANGE_EVENT, refresh);
  observer?.disconnect();
  setHeight(0);
});
</script>

<style scoped>
.story-bar {
  position: sticky;
  top: 0;
  z-index: 1200;
  padding: 10px 16px;
  background: #fff4e0;
  border-bottom: 2px solid #f0b46a;
  color: #4e342e;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(93, 64, 55, 0.12);
}

.story-bar.collapsed {
  padding: 6px 16px;
}

.bar-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
}

.story-label {
  font-weight: 700;
  color: #b45309;
  white-space: nowrap;
}

.step-title {
  font-size: 15px;
}

.step-title.warn {
  color: #b71c1c;
}

.phase-chip {
  padding: 1px 10px;
  border-radius: 999px;
  background: #5d4037;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.step-meta {
  color: #6d4c41;
}

.bar-actions {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

.text-btn {
  padding: 0;
  border: none;
  background: none;
  color: #8a5a3c;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  white-space: nowrap;
}

.step-note,
.step-task {
  margin: 6px 0 0;
}

.step-note {
  font-size: 13px;
  color: #8a5a00;
}

.step-task.operator {
  font-weight: 600;
  color: #1b5e20;
}

.step-task.switch {
  color: #8a4b08;
}

.go-link {
  margin-left: 8px;
  font-weight: 700;
  color: #5d4037;
}

.visibility {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  margin-top: 10px;
  max-height: 45vh;
  overflow-y: auto;
}

.role-card {
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #f0d9bd;
}

.role-card.me {
  border-color: #c2956e;
  box-shadow: 0 0 0 2px rgba(194, 149, 110, 0.25);
}

.role-card h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
}

.role-card h3 span {
  font-weight: 400;
  color: #8d6e63;
}

.role-card ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
}

@media (max-width: 576px) {
  .bar-actions {
    margin-left: 0;
  }
}
</style>
