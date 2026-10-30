<template>
  <!-- 後台首頁：各角色的工作首頁（快捷入口、待辦摘要；儀表板之後再做） -->
  <div class="admin-home">
    <header class="page-head">
      <h1>後台首頁</h1>
      <p v-if="user">{{ user.name }}｜{{ roleLabel }}，今天是 {{ today }}</p>
    </header>

    <section class="card" data-tour="admin-home-shortcuts" aria-labelledby="shortcuts-title">
      <h2 id="shortcuts-title">快捷入口</h2>
      <div class="shortcut-grid">
        <template v-for="s in shortcuts" :key="s.key">
          <button v-if="canOpen(s.path)" type="button" class="shortcut" @click="$router.push(s.path)">
            <i :class="['fa-solid', s.icon]" aria-hidden="true"></i>
            <span>{{ s.label }}</span>
            <span v-if="s.key === 'todo' && overdueCount" class="badge">逾期 {{ overdueCount }}</span>
          </button>
        </template>
      </div>
    </section>

    <section v-if="todos" class="card" data-tour="admin-home-todos" aria-labelledby="todos-title">
      <header class="card-head">
        <h2 id="todos-title">
          待辦摘要
          <small>共 {{ todos.length }} 筆<template v-if="overdueCount">，逾期 {{ overdueCount }} 筆</template></small>
        </h2>
        <router-link v-if="canOpen(todoPath)" :to="todoPath" class="more-link">查看全部待辦 →</router-link>
      </header>
      <p v-if="!todos.length" class="muted">目前沒有待辦</p>
      <ul v-else class="todo-list">
        <li v-for="(t, i) in todos.slice(0, TODO_SUMMARY_LIMIT)" :key="`${t.type}-${t.code}-${i}`">
          <button type="button" class="todo-row" @click="canOpen(t.link) && $router.push(t.link)">
            <span class="type-badge">{{ t.typeLabel }}</span>
            <span class="todo-name">{{ t.name }}<small v-if="t.code">{{ t.code }}</small></span>
            <span :class="['todo-date', { overdue: (t.overdueDays ?? 0) > 0 }]">
              {{ t.dateText || (t.overdueDays > 0 ? `逾期 ${t.overdueDays} 天` : `到期日 ${t.dueDate || "下次來院時"}`) }}
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- 儀表板：之後再做，先預留位置 -->
    <section class="card placeholder" data-tour="admin-home-dashboard" aria-labelledby="dashboard-title">
      <h2 id="dashboard-title">儀表板</h2>
      <p class="muted">儀表板規劃中，內容與時程待討論。</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useCanOpen } from "../composables/useCanOpen.js";
import { getRoleLabel } from "../config/roles.js";
import { can, filterTodosFor, shortcutsFor } from "../services/accessControl.js";
import { computeTodos, countOverdue } from "../services/todoService.js";
import { pathOf } from "../router/routes.js";
import { getCurrentUser } from "../utils/auth.js";
import { todayString } from "../utils/date.js";

// 待辦摘要最多列幾筆
const TODO_SUMMARY_LIMIT = 5;

// 導向沒有權限的頁面的連結與按鈕一律不顯示
const canOpen = useCanOpen();
const user = getCurrentUser();
const today = todayString();
const roleLabel = computed(() => getRoleLabel(user?.role));
const shortcuts = shortcutsFor(user);
const todoPath = pathOf("todo");

// 沿用待辦頁的計算與範圍（依角色只顯示自己的項目）
const todos = can(user, "todo.view") ? filterTodosFor(user, computeTodos({ today })) : null;
const overdueCount = todos ? countOverdue(todos) : 0;
</script>

<style scoped>
.admin-home {
  max-width: 960px;
  padding: 20px 16px 48px;
  display: grid;
  gap: 16px;
}

.page-head h1 {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 800;
  color: #3e2723;
}

.page-head p {
  margin: 0;
  color: #6d4c41;
  font-size: 14px;
}

.card {
  padding: 16px 18px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eadfd8;
}

.card h2 {
  margin: 0 0 12px;
  font-size: 17px;
  font-weight: 800;
  color: #3e2723;
}

.card h2 small {
  margin-left: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #8d6e63;
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.more-link {
  font-size: 14px;
  font-weight: 600;
  color: #b98158;
  text-decoration: none;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
  gap: 10px;
}

.shortcut {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 10px;
  border: 1px solid #eadfd8;
  border-radius: 12px;
  background: #faf6f2;
  color: #5d4037;
  font-size: 15px;
  font-weight: 700;
}

.shortcut i {
  font-size: 22px;
  color: #b98158;
}

.shortcut:hover {
  background: #fff8f2;
  border-color: #c2956e;
}

.badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #c62828;
  color: #fff;
  font-size: 11px;
}

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.todo-row {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 10px 12px;
  border: 1px solid #f1e8e1;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  color: #3e2723;
}

.todo-row:hover {
  background: #faf6f2;
}

.type-badge {
  padding: 1px 8px;
  border-radius: 999px;
  background: #f5ece5;
  color: #5d4037;
  font-size: 12px;
  font-weight: 700;
}

.todo-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

.todo-name small {
  margin-left: 6px;
  color: #8d6e63;
}

.todo-date {
  font-size: 13px;
  color: #8d6e63;
}

.todo-date.overdue {
  color: #c62828;
  font-weight: 700;
}

.placeholder {
  border-style: dashed;
  background: #fcfaf8;
}

.muted {
  margin: 0;
  color: #8d6e63;
  font-size: 14px;
}

.shortcut:focus-visible,
.todo-row:focus-visible,
.more-link:focus-visible {
  outline: 3px solid #c8a27c;
  outline-offset: 2px;
}
</style>
