<template>
  <div class="list-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>評估列表</h2>
      </div>
      <div class="header-right">
        <button class="add-btn" @click="$router.push('/assessment/new')">＋ 填寫評估</button>
        <UserMenu />
      </div>
    </div>

    <div class="filter-container">
      <div class="search-box">
        <input v-model="searchQuery" type="search" placeholder="搜尋姓名或評估編碼..." aria-label="搜尋評估" />
      </div>
      <div class="filter-tabs" role="tablist">
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
      <p v-if="pendingCount" class="pending-summary">
        <i class="fa-solid fa-hourglass-half" aria-hidden="true"></i>
        {{ pendingCount }} 筆橘燈轉介或退縮尚未開案
      </p>
    </div>

    <div class="container main-list">
      <div v-if="filtered.length">
        <article
          v-for="item in filtered"
          :key="item.id"
          :class="['assessment-card', item.status]"
          role="link"
          tabindex="0"
          @click="open(item)"
          @keydown.enter="open(item)"
        >
          <div class="card-main">
            <div class="card-head">
              <span class="code">{{ item.code }}</span>
              <span :class="['status-badge', item.status]">{{ STATUS_LABELS[item.status] }}</span>
              <span v-if="item.light" :class="['light-badge', item.review.light]">
                {{ formatLight(item.review.light, item.review.orangeType) }}
              </span>
              <span v-if="item.pendingCase" class="case-badge pending">待開案</span>
              <span v-if="item.caseCode" class="case-badge opened">已開案 {{ item.caseCode }}</span>
            </div>
            <h4 class="person-name">{{ item.person.name || "未填姓名" }}</h4>
            <p class="meta">
              <span>填表日期 {{ item.filledAt || "—" }}</span>
              <span v-if="item.person.nationalId">身分證 {{ maskNationalId(item.person.nationalId) }}</span>
              <span v-if="item.status === 'voided'" class="void-reason">作廢原因：{{ item.voidReason }}</span>
              <span v-if="item.review.readerName">判讀 {{ item.review.readerName }}</span>
              <span v-if="item.providedNames.length" class="provided">提供資源：{{ item.providedNames.join("、") }}</span>
              <span v-if="item.nextCheckAt">下次確認 {{ item.nextCheckAt }}</span>
            </p>
          </div>
          <div class="card-action" aria-hidden="true">
            {{ item.status === "filled" ? "開始判讀" : "查看" }}
            <i class="fa-solid fa-chevron-right"></i>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📋</div>
        <p v-if="!assessments.length">目前沒有評估紀錄，請點右上角「填寫評估」</p>
        <p v-else>沒有符合條件的評估</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import UserMenu from "../components/UserMenu.vue";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { STATUS_LABELS, formatLight } from "../config/assessmentLabels.js";
import {
  getAllAssessments,
  isPendingCaseOpening,
  isVoided,
  maskNationalId,
  sortForList,
} from "../services/assessmentService.js";
import { getAllCases } from "../services/caseService.js";
import { getAllResources } from "../services/resourceService.js";
import { goBack } from "../utils/navigation.js";

const router = useRouter();
const back = () => goBack(router, "/");

const assessments = ref(sortForList(getAllAssessments()));
const searchQuery = ref("");
const currentTab = ref("all");

// 已開案的評估顯示個案編碼
const caseCodes = new Map(getAllCases().map((c) => [String(c.id), c.code]));
// 黃燈當場提供的資源顯示名稱
const resourceNames = new Map(getAllResources().map((r) => [String(r.id), r.name]));

const rows = computed(() =>
  assessments.value.map((a) => ({
    ...a,
    light: !!a.review.light,
    pendingCase: isPendingCaseOpening(a),
    caseCode: a.caseId ? caseCodes.get(String(a.caseId)) ?? "" : "",
    providedNames: (a.review.providedResources || []).map((id) => resourceNames.get(String(id)) ?? "（資源已不存在）"),
  }))
);

// 「全部」不含已作廢；已作廢只在「已作廢」分頁查看
const tabs = computed(() => [
  { label: "全部", value: "all", count: rows.value.filter((r) => !isVoided(r)).length },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
    label,
    value,
    count: rows.value.filter((r) => r.status === value).length,
  })),
]);

const pendingCount = computed(() => rows.value.filter((r) => r.pendingCase).length);

const filtered = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  return rows.value.filter((r) => {
    if (currentTab.value === "all" ? isVoided(r) : r.status !== currentTab.value) return false;
    if (!keyword) return true;
    return `${r.code} ${r.person.name}`.toLowerCase().includes(keyword);
  });
});

const open = (item) => router.push(`/assessments/${item.id}`);
</script>

<style scoped>
.list-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* Top Bar（與資源列表一致） */
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
.header-right {
  display: flex;
  justify-content: flex-end;
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
.pending-summary {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #8a4b08;
}

/* 卡片 */
.main-list {
  margin-top: 20px;
  padding: 0 15px;
}
.assessment-card {
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
.assessment-card:hover {
  box-shadow: 0 8px 18px rgba(93, 64, 55, 0.12);
  transform: translateY(-1px);
}
.assessment-card:focus-visible {
  outline: 3px solid #c2956e;
  outline-offset: 2px;
}
/* 未判讀：左側橘色條，提醒優先處理 */
.assessment-card.filled {
  border-left-color: #ef6c00;
  background: #fffaf5;
}
.assessment-card.reviewed {
  border-left-color: #8d6e63;
}
.assessment-card.closed {
  border-left-color: #2e7d32;
}
/* 已作廢：灰色淡化 */
.assessment-card.voided {
  border-left-color: #9e9e9e;
  background: #f7f7f7;
  opacity: 0.85;
}
.assessment-card.voided .person-name {
  color: #757575;
  text-decoration: line-through;
}
.status-badge.voided {
  background: #eeeeee;
  color: #616161;
}
.provided {
  color: #8a5a00;
}
.void-reason {
  color: #616161;
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
.code {
  font-family: "Courier New", monospace;
  font-size: 12px;
  font-weight: 700;
  color: #5d4037;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 6px;
}
.status-badge,
.light-badge,
.case-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
}
.status-badge.filled {
  background: #fff3e0;
  color: #e65100;
}
.status-badge.reviewed {
  background: #f5f0ed;
  color: #6d4c41;
}
.status-badge.closed {
  background: #ecfdf5;
  color: #166534;
}
.light-badge {
  background: #f5f0ed;
  color: #3e2723;
}
.light-badge.red {
  background: #fdecea;
  color: #b71c1c;
}
.light-badge.orange {
  background: #fff3e0;
  color: #bf360c;
}
.light-badge.yellow {
  background: #fff8e1;
  color: #8a5a00;
}
.light-badge.green {
  background: #edf7ee;
  color: #1b5e20;
}
.case-badge.opened {
  background: #edf7ee;
  color: #1b5e20;
}
.case-badge.pending {
  background: #fff;
  color: #8a4b08;
  border: 1px dashed #ffb74d;
}

.person-name {
  font-size: 17px;
  font-weight: 700;
  color: #3e2723;
  margin: 0 0 4px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin: 0;
  font-size: 12px;
  color: #8d6e63;
}
.card-action {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: #b98158;
  display: flex;
  align-items: center;
  gap: 6px;
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
  .card-action {
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
