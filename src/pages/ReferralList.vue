<template>
  <div class="referral-page">
    <div class="top-bar">
      <div class="header-left">
        <router-link v-if="canOpen(casesPath)" :to="casesPath" class="back-link">← 個案管理</router-link>
      </div>
      <div class="header-center">
        <h2>守望員轉介</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="main-content">
      <div class="filter-tabs mb-3" data-tour="referrals-tabs" role="tablist" aria-label="依狀態篩選">
        <button
          v-for="tab in tabs"
          :key="tab.code"
          type="button"
          role="tab"
          :aria-selected="currentTab === tab.code"
          :class="['filter-tab', { active: currentTab === tab.code }]"
          @click="currentTab = tab.code"
        >
          {{ tab.label }} <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <div v-if="!visible.length" class="empty-state">
        {{ referrals.length ? "此分類目前沒有轉介單" : "目前沒有守望員轉介" }}
      </div>
      <div v-else data-tour="referrals-list">
        <article
          v-for="r in visible"
          :key="r.id"
          :class="['row-card', 'clickable', r.status]"
          role="link"
          tabindex="0"
          @click="canOpen(detailPath(r.id)) && open(r.id)"
          @keydown.enter="canOpen(detailPath(r.id)) && open(r.id)"
        >
          <div>
            <div class="row-head">
              <span class="code">{{ r.code }}</span>
              <span :class="['status-badge', r.status]">{{ statusText(r.status) }}</span>
              <span v-if="r.caseCode" class="code">個案 {{ r.caseCode }}</span>
            </div>
            <h4>{{ r.person.name || "未填姓名" }}</h4>
            <p class="meta">
              <span>送出 {{ toDateString(r.createdAt) || "—" }}</span>
              <span>守望員 {{ r.watcher.name || "—" }}<template v-if="r.watcher.unit">（{{ r.watcher.unit }}）</template></span>
              <span v-if="r.situations.length">{{ situationText(r.situations) }}</span>
            </p>
          </div>
          <div class="arrow" aria-hidden="true">〉</div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useCanOpen } from "../composables/useCanOpen.js";
import { PENDING_STATUSES, REFERRAL_STATUSES, SITUATIONS, referralLabel } from "../config/referralLabels.js";
import { getAllReferrals } from "../services/referralService.js";
import { pathOf } from "../router/routes.js";
import { toDateString } from "../utils/date.js";

const router = useRouter();
const canOpen = useCanOpen();
const casesPath = pathOf("cases");
const detailPath = (id) => pathOf("referral-detail", { id });
const open = (id) => router.push(detailPath(id));

// 待處理（已送出、處理中）的先送出在前；其他新的在前
const referrals = getAllReferrals().sort((a, b) => {
  const ap = PENDING_STATUSES.includes(a.status);
  const bp = PENDING_STATUSES.includes(b.status);
  if (ap !== bp) return ap ? -1 : 1;
  const order = String(a.createdAt).localeCompare(String(b.createdAt));
  return ap ? order : -order;
});

const currentTab = ref("pending");
const tabs = computed(() => [
  { code: "pending", label: "待處理", count: referrals.filter((r) => PENDING_STATUSES.includes(r.status)).length },
  ...REFERRAL_STATUSES.map((s) => ({ code: s.code, label: s.label, count: referrals.filter((r) => r.status === s.code).length })),
  { code: "all", label: "全部", count: referrals.length },
]);
const visible = computed(() => {
  if (currentTab.value === "all") return referrals;
  if (currentTab.value === "pending") return referrals.filter((r) => PENDING_STATUSES.includes(r.status));
  return referrals.filter((r) => r.status === currentTab.value);
});

const statusText = (code) => referralLabel(REFERRAL_STATUSES, code);
const situationText = (codes) => codes.map((c) => referralLabel(SITUATIONS, c)).filter(Boolean).join("、");
</script>

<style scoped src="../styles/referralPage.css"></style>
<style scoped>
.filter-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 5px;
}
.filter-tab {
  padding: 6px 14px;
  background: #fff;
  border-radius: 50px;
  font-size: 13px;
  color: #8d6e63;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid #d6ccc2;
}
.filter-tab.active {
  background: #5d4037;
  color: #fff;
  border-color: #5d4037;
}
.tab-count {
  margin-left: 4px;
  font-size: 11px;
  opacity: 0.75;
}
</style>
