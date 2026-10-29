<template>
  <div class="case-list-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>個案管理</h2>
      </div>
      <div class="header-right">
        <button class="add-btn" data-tour="cases-new" @click="addCase">＋新增個案</button>
        <UserMenu />
      </div>
    </div>

    <div class="filter-container">
      <div class="search-box" data-tour="cases-search">
        <input v-model="searchQuery" type="search" placeholder="搜尋姓名或個案編碼..." aria-label="搜尋個案" />
      </div>
      <div class="filter-tabs" data-tour="cases-tabs" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="currentTab === tab.value"
          :class="['filter-tab', { active: currentTab === tab.value }]"
          @click="currentTab = tab.value"
        >
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>
      <p v-if="overdueCount" class="overdue-summary">
        <i class="fa-solid fa-phone-slash" aria-hidden="true"></i>
        {{ overdueCount }} 位個案開案超過 {{ FIRST_CONTACT_HOURS }} 小時尚未首次聯繫
      </p>
    </div>

    <div class="container main-list" data-tour="cases-list">
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>

      <div v-if="!filtered.length" class="empty-state">
        {{ cases.length ? "沒有符合條件的個案" : "目前沒有個案" }}
      </div>

      <article
        v-for="item in filtered"
        :key="item.id"
        :class="['case-card', { overdue: item.overdue, closed: item.stage === 'closed' }]"
        role="link"
        tabindex="0"
        @click="canOpen(caseLink(item.id)) && goDetail(item.id)"
        @keydown.enter="canOpen(caseLink(item.id)) && goDetail(item.id)"
      >
        <div class="case-content">
          <div class="case-head">
            <span class="case-code">{{ item.code }}</span>
            <span :class="['stage-badge', `stage-${item.stage}`]">{{ item.stageText }}</span>
            <span v-if="item.overdue" class="overdue-badge">
              <i class="fa-solid fa-clock" aria-hidden="true"></i> 首次聯繫逾期（開案 {{ item.daysOpen }} 天）
            </span>
            <span v-if="item.followUpDue" class="due-badge">追蹤到期</span>
          </div>
          <h4>{{ item.person.name || "未命名個案" }}</h4>
          <p class="case-meta">
            <span v-if="item.referral.assessmentCode">評估 {{ item.referral.assessmentCode }}</span>
            <span v-if="item.latestLinkage">連結：{{ item.linkageText }}</span>
            <span v-if="item.nextFollowUp">下次追蹤 {{ item.nextFollowUp.plannedAt }}（{{ item.nextFollowUp.round }} 個月）</span>
            <span v-if="item.managerName">健康管理員 {{ item.managerName }}</span>
            <span>開案 {{ toDateString(item.createdAt) || "未提供" }}</span>
          </p>
        </div>
        <div class="case-actions">
          <button
            type="button"
            :class="['delete-btn', { disabled: !item.deletable }]"
            :title="item.deletable ? '刪除' : '已進入處置流程，請改用結案'"
            :aria-label="`刪除 ${item.code}`"
            @click.stop="removeCase(item)"
          >
            <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          </button>
          <div class="case-arrow" aria-hidden="true">〉</div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { useCanOpen } from "../composables/useCanOpen.js";
import UserMenu from "../components/UserMenu.vue";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { FIRST_CONTACT_HOURS } from "../config/assessmentRules.js";
import { STAGE_OPTIONS } from "../config/caseLabels.js";
import { createCase, deleteCase, getAllCases } from "../services/caseService.js";
import { caseRows } from "../services/listViews.js";
import { getCurrentUser } from "../utils/auth.js";
import { toDateString } from "../utils/date.js";
import { goBack } from "../utils/navigation.js";

const router = useRouter();
// 導向沒有權限的頁面的連結與按鈕一律不顯示
const canOpen = useCanOpen();
const back = () => goBack(router, "/");

const cases = ref(getAllCases());
const searchQuery = ref("");
const currentTab = ref("open");
const notice = ref("");

const reload = () => {
  cases.value = getAllCases();
};

// 列表需要的衍生資料一次算好；卡片顯示資料與角色預覽面板共用（services/listViews.js）
const rows = computed(() => caseRows(cases.value));

const tabs = computed(() => [
  { label: "進行中", value: "open", count: rows.value.filter((r) => r.stage !== "closed").length },
  ...STAGE_OPTIONS.map((o) => ({
    label: o.label,
    value: o.code,
    count: rows.value.filter((r) => r.stage === o.code).length,
  })),
]);

const overdueCount = computed(() => rows.value.filter((r) => r.overdue).length);

// 逾期未聯繫的排最前面，其餘依最後更新時間由新到舊
const filtered = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  return rows.value
    .filter((r) => (currentTab.value === "open" ? r.stage !== "closed" : r.stage === currentTab.value))
    .filter((r) => !keyword || `${r.code} ${r.person.name}`.toLowerCase().includes(keyword))
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });
});

// 不經評估表的轉介（守望員或民眾自我轉介），先建立基本資料，轉介資訊在個案頁補齊
const addCase = () => {
  const name = prompt("請輸入個案姓名");
  if (!name?.trim()) return;
  const created = createCase({ person: { name: name.trim() } }, { actor: getCurrentUser()?.name ?? "" });
  notice.value = `已建立個案 ${created.code}`;
  currentTab.value = "open";
  reload();
};

const caseLink = (id) => `/case/${id}`;
const goDetail = (id) => router.push(caseLink(id));

// 只有第 1 階段、沒有連結與追蹤紀錄的個案可以刪除（例如誤建），其他提示改用結案
const removeCase = (item) => {
  const check = canDeleteCase(item);
  if (!check.ok) {
    alert(check.reason);
    return;
  }
  const ok = confirm(`確定要刪除 ${item.code}（${item.person.name || "未命名個案"}）？\n\n刪除後無法復原。`);
  if (!ok) return;
  const result = deleteCase(item.id);
  if (!result.ok) {
    alert(result.reason);
    return;
  }
  notice.value = `已刪除個案 ${item.code}`;
  reload();
};
</script>

<style scoped>
.case-list-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 40px;
}

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
  flex: 3;
  text-align: center;
}
.header-right {
  text-align: right;
}
.header-center h2 {
  font-size: 18px;
  margin: 0;
  font-weight: 700;
}
.back-btn,
.add-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}
.add-btn {
  background: #c2956e;
  border: none;
  font-weight: 700;
}

/* 篩選 */
.filter-container {
  background: #efe7dc;
  padding: 15px 20px;
}
.search-box input {
  width: 100%;
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid #d6ccc2;
  font-size: 14px;
  margin-bottom: 12px;
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
.tab-count {
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.75;
}
.overdue-summary {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #bf360c;
}

/* 卡片 */
.main-list {
  margin-top: 20px;
  padding: 0 15px;
}
.notice {
  background: #edf7ee;
  border: 1px solid #b7dfb9;
  color: #1b5e20;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
}
.case-card {
  background: white;
  border-radius: 14px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #f0e6e0;
  border-left: 6px solid #bcaaa4;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.08);
  padding: 14px 16px;
  cursor: pointer;
}
.case-card:focus-visible {
  outline: 3px solid #c2956e;
  outline-offset: 2px;
}
.case-card.overdue {
  border-left-color: #d84315;
  background: #fffaf5;
}
.case-card.closed {
  opacity: 0.8;
}
.case-content {
  flex: 1;
  min-width: 0;
}
.case-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.case-code {
  font-family: "Courier New", monospace;
  font-size: 12px;
  font-weight: 700;
  color: #5d4037;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 6px;
}
.case-content h4 {
  margin: 0 0 4px;
  color: #3e2723;
  font-size: 17px;
  font-weight: 700;
}
.case-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin: 0;
  font-size: 12px;
  color: #8d6e63;
}

.stage-badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  color: white;
  font-weight: 600;
  background: #9e9e9e;
}
.stage-2 {
  background: #78909c;
}
.stage-3 {
  background: #c2956e;
}
.stage-4 {
  background: #6f8c72;
}
.stage-5 {
  background: #5d4037;
}
.stage-closed {
  background: #bdbdbd;
}
.overdue-badge,
.due-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
}
.overdue-badge {
  background: #d84315;
  color: #fff;
}
.due-badge {
  background: #fff3e0;
  color: #bf360c;
  border: 1px solid #ffcc80;
}
.case-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.case-arrow {
  color: #d6ccc2;
  font-weight: 700;
}
.delete-btn {
  background: #fff5f5;
  border: 1px solid #f1c7c7;
  color: #d32f2f;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
}
.delete-btn.disabled {
  background: #f5f5f5;
  border-color: #e0e0e0;
  color: #bdbdbd;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #bcaaa4;
}

/* 登入者與登出（UserMenu）靠右 */
.top-bar .header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
</style>
