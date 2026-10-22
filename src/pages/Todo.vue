<template>
  <div class="list-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>待辦</h2>
      </div>
      <div class="header-right"><UserMenu /></div>
    </div>

    <div class="filter-container">
      <!-- 系統管理員可切換「給誰」；其他角色只看自己的項目 -->
      <p v-if="!scope.canViewAll" class="scope-note">
        顯示給「{{ AUDIENCE_LABELS[scope.own] }}」的待辦
      </p>
      <div v-else class="filter-tabs" role="tablist" aria-label="依給誰篩選">
        <button
          v-for="tab in audienceTabs"
          :key="tab.code"
          type="button"
          role="tab"
          :aria-selected="audience === tab.code"
          :class="['filter-tab', { active: audience === tab.code }]"
          @click="selectAudience(tab.code)"
        >
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>
      <div v-if="typeCounts.length" class="type-chips" aria-label="各類型筆數">
        <button
          v-for="t in typeCounts"
          :key="t.code"
          type="button"
          :class="['type-chip', { active: typeFilter === t.code }]"
          :aria-pressed="typeFilter === t.code"
          @click="typeFilter = typeFilter === t.code ? '' : t.code"
        >
          {{ t.label }} <strong>{{ t.count }}</strong>
        </button>
      </div>
      <p class="today-note">依今天（{{ today }}）即時計算，逾期的排在最前面</p>
    </div>

    <div class="container main-list">
      <div v-if="filtered.length">
        <article
          v-for="item in filtered"
          :key="`${item.type}-${item.code}`"
          :class="['todo-card', urgency(item)]"
          role="link"
          tabindex="0"
          @click="open(item)"
          @keydown.enter="open(item)"
        >
          <div class="card-main">
            <div class="card-head">
              <span class="type-badge">{{ item.typeLabel }}</span>
              <span class="audience">{{ AUDIENCE_LABELS[item.audience] }}</span>
            </div>
            <h4 class="person-name">
              {{ item.name }}
              <span v-if="item.code" class="code">{{ item.code }}</span>
            </h4>
            <p class="meta">
              <span>到期日 {{ item.dueDate || "下次來院時" }}</span>
              <span v-if="item.detail">{{ item.detail }}</span>
            </p>
          </div>
          <div :class="['overdue', urgency(item)]">{{ overdueText(item) }}</div>
          <i class="fa-solid fa-chevron-right card-arrow" aria-hidden="true"></i>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">✅</div>
        <p>目前沒有待辦</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import UserMenu from "../components/UserMenu.vue";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { AUDIENCES, TODO_TYPES, computeTodos } from "../services/todoService.js";
import { todayString } from "../utils/date.js";
import { goBack } from "../utils/navigation.js";
import { getCurrentUser } from "../utils/auth.js";
import { filterTodosFor, todoScopeFor } from "../services/accessControl.js";

const router = useRouter();
const back = () => goBack(router, "/");

const AUDIENCE_LABELS = Object.fromEntries(AUDIENCES.map((a) => [a.code, a.label]));

const today = todayString();
// 角色權限（原型階段）：依登入角色只顯示自己的項目，系統管理員預設看「管理員」項目並可切換全部
const currentUser = getCurrentUser();
const scope = todoScopeFor(currentUser);
const allTodos = computeTodos({ today });
const todos = filterTodosFor(currentUser, allTodos, "all");
const audience = ref(scope.own ?? "all");
const typeFilter = ref("");

const audienceTabs = computed(() => [
  { code: "all", label: "全部", count: todos.length },
  ...AUDIENCES.map((a) => ({ ...a, count: todos.filter((t) => t.audience === a.code).length })),
]);

const byAudience = computed(() => filterTodosFor(currentUser, allTodos, audience.value));

// 目前篩選下各類型筆數（只列有待辦的類型）
const typeCounts = computed(() =>
  TODO_TYPES.map((t) => ({ ...t, count: byAudience.value.filter((x) => x.type === t.code).length })).filter(
    (t) => t.count > 0
  )
);

const filtered = computed(() =>
  typeFilter.value ? byAudience.value.filter((t) => t.type === typeFilter.value) : byAudience.value
);

const selectAudience = (code) => {
  audience.value = code;
  typeFilter.value = "";
};

const urgency = (item) => {
  if (item.overdueDays === null) return "undated";
  if (item.overdueDays > 0) return "overdue";
  return "due-today";
};

const overdueText = (item) => {
  if (item.overdueDays === null) return "未定日期";
  if (item.overdueDays > 0) return `逾期 ${item.overdueDays} 天`;
  if (item.overdueDays === 0) return "今天到期";
  return `${-item.overdueDays} 天後到期`;
};

const open = (item) => router.push(item.link);
</script>

<style scoped>
.list-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* Top Bar（與評估列表一致） */
.top-bar {
  background: #5d4037;
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left,
.header-right {
  flex: 1;
}
.header-center {
  flex: 2;
  text-align: center;
}
.header-center h2 {
  font-size: 18px;
  margin: 0;
  font-weight: 700;
}
.back-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

/* 篩選 */
.filter-container {
  background: #efe7dc;
  padding: 15px 20px;
}
.filter-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 5px;
}
.filter-tab {
  padding: 6px 14px;
  background: white;
  border-radius: 50px;
  font-size: 13px;
  color: #8d6e63;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid #d6ccc2;
}
.filter-tab.active {
  background: #5d4037;
  color: white;
  border-color: #5d4037;
}
.scope-note {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #5d4037;
}
.tab-count {
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.75;
}
.type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.type-chip {
  font-size: 12px;
  color: #5d4037;
  background: #fff8f2;
  border: 1px dashed #c2956e;
  border-radius: 999px;
  padding: 3px 10px;
  cursor: pointer;
}
.type-chip.active {
  background: #c2956e;
  color: white;
  border-style: solid;
}
.today-note {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8d6e63;
}

/* 卡片 */
.main-list {
  margin-top: 20px;
  padding: 0 15px;
}
.todo-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border-radius: 15px;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid #f0e6e0;
  border-left: 6px solid #bcaaa4;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.05);
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.todo-card:hover {
  box-shadow: 0 8px 18px rgba(93, 64, 55, 0.12);
  transform: translateY(-1px);
}
.todo-card:focus-visible {
  outline: 3px solid #c2956e;
  outline-offset: 2px;
}
.todo-card.overdue {
  border-left-color: #c62828;
  background: #fffafa;
}
.todo-card.due-today {
  border-left-color: #ef6c00;
}

.card-main {
  flex: 1;
  min-width: 0;
}
.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.type-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: #f5f0ed;
  color: #5d4037;
}
.audience {
  font-size: 12px;
  color: #8d6e63;
}
.person-name {
  font-size: 17px;
  font-weight: 700;
  color: #3e2723;
  margin: 0 0 4px;
}
.code {
  font-family: "Courier New", monospace;
  font-size: 12px;
  font-weight: 700;
  color: #5d4037;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: 6px;
  vertical-align: middle;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin: 0;
  font-size: 12px;
  color: #8d6e63;
}
.overdue {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  background: #f5f0ed;
  color: #6d4c41;
  white-space: nowrap;
}
.overdue.overdue {
  background: #fdecea;
  color: #b71c1c;
}
.overdue.due-today {
  background: #fff3e0;
  color: #e65100;
}
.card-arrow {
  color: #b98158;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #bcaaa4;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

@media (max-width: 576px) {
  .todo-card {
    flex-wrap: wrap;
  }
  .card-arrow {
    display: none;
  }
}

/* 登入者與登出（UserMenu）靠右 */
.top-bar .header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
</style>
