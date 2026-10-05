<template>
  <div class="list-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>社區資源管理清單</h2>
      </div>
      <div class="header-right">
        <button class="add-btn" @click="$router.push('/cases')">👤 個人端</button>
        <button class="add-btn" @click="$router.push('/form')">＋ 新增</button>
      </div>
    </div>

    <div class="filter-container">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="搜尋資源編碼、名稱、單位、行政區或需求標籤..."
          aria-label="搜尋資源"
        />
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
      <div class="filter-footer">
        <p v-if="overdueCount" class="overdue-summary">
          <i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>
          共 {{ overdueCount }} 筆資源已超過預計驗證日期
        </p>
        <div class="demo-tools">
          <button type="button" class="demo-btn" @click="openDemoDialog">
            <i class="fa-solid fa-flask" aria-hidden="true"></i> 載入示範資料
          </button>
          <button v-if="hasDemoData" type="button" class="demo-btn subtle" @click="removeDemo">
            移除示範資料（資源 {{ counts.demoResources }}、個案 {{ counts.demoCases }}）
          </button>
        </div>
      </div>
    </div>

    <dialog ref="demoDialog" class="demo-dialog" aria-labelledby="demo-dialog-title" @close="onDemoDialogClose">
      <form method="dialog">
        <h3 id="demo-dialog-title">載入示範資料</h3>
        <p>
          示範資料包含 {{ DEMO_TOTALS.resources }} 筆虛構資源與 {{ DEMO_TOTALS.cases }} 筆虛構個案，
          涵蓋資源的各種狀態與個案流程的各個階段，並標記為「示範」，之後可一鍵移除。
        </p>
        <div class="dialog-options">
          <button value="add" class="dialog-option">
            <strong>加入示範資料</strong>
            <span>保留現有資源與個案，加入尚未載入的示範資料</span>
          </button>
          <button value="replace" class="dialog-option danger">
            <strong>清空後只放示範資料</strong>
            <span>
              刪除目前全部 {{ counts.resources }} 筆資源與 {{ counts.cases }} 筆個案（含自建資料），無法復原
            </span>
          </button>
        </div>
        <div class="dialog-footer">
          <button value="cancel" class="dialog-cancel">取消</button>
        </div>
      </form>
    </dialog>

    <div class="container main-list">
      <div v-if="actionNotice" class="saved-banner" role="status">
        <span>
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
          {{ actionNotice }}
        </span>
        <button type="button" class="banner-close" aria-label="關閉提示" @click="actionNotice = ''">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div v-if="savedNotice" class="saved-banner" role="status">
        <span>
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
          已儲存「{{ savedNotice.name || "未命名資源" }}」的變更
          <template v-if="savedNotice.missing > 0">
            ，有 {{ savedNotice.missing }} 個建議欄位未填，建議之後補齊
          </template>
        </span>
        <button type="button" class="banner-close" aria-label="關閉提示" @click="savedNotice = null">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div v-if="filteredResources.length > 0">
        <article
          v-for="item in filteredResources"
          :id="`resource-${item.id}`"
          :key="item.id"
          :class="['resource-card', { highlighted: savedNotice && String(savedNotice.id) === String(item.id) }]"
        >
          <div class="card-status" :class="item.status"></div>
          <div class="card-content">
            <div class="card-header">
              <div class="header-left">
                <span v-if="item.code" class="resource-code">{{ item.code }}</span>
                <span class="org-name">
                  <FieldValue :value="item.organization" empty-text="所屬單位未填" />
                </span>
                <span class="district">
                  <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                  <FieldValue :value="item.address.district" empty-text="行政區未填" />
                </span>
              </div>
              <div class="header-right">
                <span v-if="item.isDemo" class="demo-badge">示範</span>
                <span :class="['status-text', item.status]">
                  {{ optionLabel(STATUS_OPTIONS, item.status) || "未設定" }}
                </span>
                <span v-if="item.overdue" class="overdue-badge">待驗證</span>
              </div>
            </div>

            <h4 class="resource-name">{{ item.name || "未命名資源" }}</h4>

            <div class="meta-row">
              <span :class="['meta-badge', 'risk', item.riskLevel || 'none']">
                {{ item.riskLevel ? `${RISK_ICON[item.riskLevel]} ${optionLabel(RISK_LEVEL_OPTIONS, item.riskLevel)}` : "⚪ 未評估" }}
              </span>
              <span :class="['meta-badge', 'partnership', item.partnership]">
                {{ optionLabel(PARTNERSHIP_OPTIONS, item.partnership) || "合作狀態未填" }}
              </span>
              <span
                :class="['meta-badge', 'explore', item.exploreVisible ? 'on' : 'off']"
                :title="item.exploreReasons"
              >
                <i
                  :class="item.exploreVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
                  aria-hidden="true"
                ></i>
                {{ item.exploreVisible ? "探索頁顯示中" : `探索頁未顯示：${item.exploreReasons}` }}
              </span>
            </div>

            <div v-if="item.needTags.length" class="tag-row">
              <span v-for="tag in item.needTags" :key="tag" class="info-tag">
                #{{ getNeedTagLabel(tag) }}
              </span>
            </div>

            <div class="card-footer">
              <div class="footer-left">
                <button type="button" class="text-btn danger" @click="removeResource(item)">
                  永久刪除
                </button>
              </div>
              <div class="footer-right">
                <button type="button" class="detail-btn" @click="loginResource(item.id)">
                  進入資源端
                </button>
                <button type="button" class="detail-btn" @click="$router.push(`/resources/${item.id}`)">
                  查看
                </button>
                <button type="button" class="detail-btn" @click="$router.push(`/form/${item.id}`)">
                  編輯
                </button>
                <button
                  v-if="item.status !== 'terminated'"
                  type="button"
                  class="terminate-btn"
                  @click="terminate(item)"
                >
                  終止
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📂</div>
        <p v-if="resources.length === 0">尚未建立任何資源，請點右上角新增</p>
        <p v-else>目前沒有符合條件的資源資料</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { goBack } from "../utils/navigation.js";
import FieldValue from "../components/FieldValue.vue";
import { getNeedTagLabel } from "../config/needTags.js";
import {
  PARTNERSHIP_OPTIONS,
  RISK_LEVEL_OPTIONS,
  STATUS_OPTIONS,
  VISIBILITY_REASON_LABELS,
  optionLabel,
} from "../config/resourceOptions.js";
import { getVisibility } from "../config/resourceRules.js";
import {
  deleteResource,
  getAllResources,
  isVerifyOverdue,
  terminateResource,
} from "../services/resourceService.js";
import { DEMO_TOTALS, countData, loadDemoData, removeDemoData } from "../services/demoService.js";
import { consumeFlash } from "../utils/flash.js";

const router = useRouter();
const back = () => goBack(router, "/");
const searchQuery = ref("");
const currentTab = ref("all");
const resources = ref(getAllResources());

// 從編輯頁儲存後回來：顯示提示、標示該筆並捲動到它的位置
const savedNotice = ref(consumeFlash("resource-saved"));
onMounted(async () => {
  if (!savedNotice.value) return;
  await nextTick();
  document
    .getElementById(`resource-${savedNotice.value.id}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
});

const RISK_ICON = { green: "🟢", yellow: "🟡", red: "🔴" };

const reload = () => {
  resources.value = getAllResources();
};

// 列表需要的衍生資料一次算好
const rows = computed(() =>
  resources.value.map((item) => {
    const { explore } = getVisibility(item);
    return {
      ...item,
      overdue: isVerifyOverdue(item),
      exploreVisible: explore.visible,
      exploreReasons: explore.reasons.map((code) => VISIBILITY_REASON_LABELS[code] ?? code).join("、"),
    };
  })
);

const tabs = computed(() => [
  { label: "全部", value: "all", count: rows.value.length },
  ...STATUS_OPTIONS.map((o) => ({
    label: o.label,
    value: o.code,
    count: rows.value.filter((r) => r.status === o.code).length,
  })),
]);

const overdueCount = computed(() => rows.value.filter((r) => r.overdue).length);

const filteredResources = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  return rows.value.filter((item) => {
    const matchesTab = currentTab.value === "all" || item.status === currentTab.value;
    if (!matchesTab) return false;
    if (!keyword) return true;
    const haystack = [
      item.code,
      item.name,
      item.organization,
      item.address.city,
      item.address.district,
      ...item.needTags.map(getNeedTagLabel),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
});

const terminate = (item) => {
  const ok = confirm(
    `確定要終止「${item.name || "未命名資源"}」？\n\n終止後不會出現在探索頁與轉介選單，資料會保留供歷史個案查詢。`
  );
  if (!ok) return;
  terminateResource(item.id);
  reload();
};

// 永久刪除需二次確認：先確認風險，再輸入資源名稱
const removeResource = (item) => {
  const ok = confirm(
    "永久刪除後無法復原，連結過此資源的歷史個案將查不到資源資料。\n\n一般情況請改用「終止」。確定要繼續刪除嗎？"
  );
  if (!ok) return;
  const expected = item.name || "刪除";
  const input = prompt(`請輸入「${expected}」以確認永久刪除`);
  if (input === null) return;
  if (input.trim() !== expected) {
    alert("輸入內容不符，已取消刪除");
    return;
  }
  deleteResource(item.id);
  reload();
};

// ── 示範資料（資源與個案一起處理）──
const demoDialog = ref(null);
const actionNotice = ref("");
const counts = ref(countData());
const hasDemoData = computed(() => counts.value.demoResources + counts.value.demoCases > 0);

const reloadAll = () => {
  reload();
  counts.value = countData();
};

const openDemoDialog = () => {
  counts.value = countData();
  demoDialog.value?.showModal();
};

const summary = ({ resources: r, cases: c }) => `資源 ${r} 筆、個案 ${c} 筆`;

// <dialog> 以按下的按鈕 value 作為 returnValue
const onDemoDialogClose = () => {
  const choice = demoDialog.value?.returnValue;
  demoDialog.value.returnValue = "";
  if (choice === "add") {
    const added = loadDemoData();
    actionNotice.value =
      added.resources + added.cases
        ? `已加入示範資料：${summary(added)}`
        : "示範資料都已載入，沒有新增";
  } else if (choice === "replace") {
    const ok = confirm(
      `確定要刪除目前全部 ${counts.value.resources} 筆資源與 ${counts.value.cases} 筆個案，只保留示範資料？\n\n此動作無法復原。`
    );
    if (!ok) return;
    const added = loadDemoData({ replace: true });
    actionNotice.value = `已清空資源與個案，並載入示範資料：${summary(added)}`;
  } else {
    return;
  }
  savedNotice.value = null;
  currentTab.value = "all";
  reloadAll();
};

const removeDemo = () => {
  const ok = confirm(
    `確定要移除示範資料（資源 ${counts.value.demoResources} 筆、個案 ${counts.value.demoCases} 筆）？\n\n只會移除標記為「示範」的資料，自建的資源與個案不受影響。`
  );
  if (!ok) return;
  const removed = removeDemoData();
  actionNotice.value = `已移除示範資料：${summary(removed)}`;
  reloadAll();
};

// 資源端後台目前以 localStorage 記錄登入的資源（不屬於資源資料，維持原做法）
const loginResource = (id) => {
  localStorage.setItem("currentResourceId", id);
  router.push("/resource-dashboard");
};
</script>

<style scoped>
.list-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 40px;
}

/* Top Bar */
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
.top-bar .header-left,
.top-bar .header-right {
  flex: 1;
}
.top-bar .header-right {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.header-center {
  flex: 3;
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

/* Filter & Search */
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
.filter-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 8px;
}
.overdue-summary {
  margin: 0;
  font-size: 13px;
  color: #bf360c;
  font-weight: 600;
}
.demo-tools {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.demo-btn {
  background: #fff;
  border: 1px dashed #a1887f;
  color: #5d4037;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.demo-btn.subtle {
  border-style: solid;
  border-color: #d6ccc2;
  color: #8d6e63;
  font-weight: 400;
}
.demo-badge {
  font-size: 11px;
  font-weight: 700;
  color: #6d4c41;
  background: #fff;
  border: 1px dashed #a1887f;
  border-radius: 999px;
  padding: 1px 8px;
}

/* 示範資料對話框 */
.demo-dialog {
  border: none;
  border-radius: 16px;
  padding: 24px;
  width: min(440px, calc(100vw - 32px));
  box-shadow: 0 20px 40px rgba(62, 39, 35, 0.25);
  color: #3e2723;
}
.demo-dialog::backdrop {
  background: rgba(62, 39, 35, 0.45);
}
.demo-dialog h3 {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 8px;
}
.demo-dialog p {
  font-size: 14px;
  color: #6d4c41;
  line-height: 1.6;
  margin: 0 0 16px;
}
.dialog-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dialog-option {
  text-align: left;
  background: #fdf8f5;
  border: 1px solid #e0d5cb;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #3e2723;
}
.dialog-option:hover {
  border-color: #c2956e;
  background: #f8efe7;
}
.dialog-option span {
  font-size: 12px;
  color: #8d6e63;
}
.dialog-option.danger strong {
  color: #b71c1c;
}
.dialog-option.danger:hover {
  border-color: #ef9a9a;
  background: #fff5f5;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
.dialog-cancel {
  background: none;
  border: 1px solid #d6ccc2;
  border-radius: 8px;
  padding: 6px 16px;
  color: #6d4c41;
  cursor: pointer;
}

/* Resource Card */
.main-list {
  margin-top: 20px;
  padding: 0 15px;
}
.resource-card {
  background: white;
  border-radius: 15px;
  margin-bottom: 15px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.05);
  border: 1px solid #f0e6e0;
}
.resource-card.highlighted {
  border-color: #2e7d32;
  box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.18);
  animation: highlight-fade 2.4s ease-out;
}
@keyframes highlight-fade {
  0% {
    background: #e8f5e9;
  }
  100% {
    background: #fff;
  }
}
@media (prefers-reduced-motion: reduce) {
  .resource-card.highlighted {
    animation: none;
  }
}

.saved-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #edf7ee;
  border: 1px solid #b7dfb9;
  color: #1b5e20;
  font-weight: 600;
  font-size: 14px;
}
.banner-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px 8px;
}

.card-status {
  width: 6px;
  flex-shrink: 0;
  background: #bcaaa4;
}
.card-status.active {
  background: #2e7d32;
}
.card-status.paused {
  background: #fbc02d;
}
.card-status.terminated {
  background: #d32f2f;
}
.card-status.seasonal {
  background: #2196f3;
}

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: 15px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 6px;
}
.card-header .header-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  min-width: 0;
}
.card-header .header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.resource-code {
  font-family: "Courier New", monospace;
  font-size: 12px;
  font-weight: 700;
  color: #5d4037;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 6px;
}
.org-name {
  font-size: 12px;
  color: #a1887f;
  font-weight: 600;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.district {
  font-size: 12px;
  color: #8d6e63;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.status-text {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: #f5f0ed;
  color: #6d4c41;
}
.status-text.active {
  background: #ecfdf5;
  color: #166534;
}
.status-text.paused {
  background: #fffbeb;
  color: #92400e;
}
.status-text.terminated {
  background: #fef2f2;
  color: #991b1b;
}
.status-text.seasonal {
  background: #eff6ff;
  color: #1e40af;
}
.overdue-badge {
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: #d84315;
  border-radius: 999px;
  padding: 2px 10px;
}
.resource-name {
  font-size: 17px;
  color: #3e2723;
  font-weight: 700;
  margin-bottom: 10px;
  overflow-wrap: anywhere;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.meta-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid #efe7dc;
  background: #fdf8f5;
  color: #5d4037;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.meta-badge.risk.none {
  color: #8d6e63;
}
.meta-badge.partnership.unconfirmed {
  border-color: #ffe082;
  background: #fff8e1;
  color: #8a5a00;
}
.meta-badge.explore.on {
  border-color: #b7dfb9;
  background: #edf7ee;
  color: #1b5e20;
}
.meta-badge.explore.off {
  border-color: #f5c2c0;
  background: #fdecea;
  color: #b71c1c;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-bottom: 12px;
}
.info-tag {
  color: #c2956e;
  font-size: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px dashed #efe7dc;
  margin-top: auto;
}
.footer-right {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}
.detail-btn,
.terminate-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.detail-btn {
  background: #fdf8f5;
  border: 1px solid #d6ccc2;
  color: #5d4037;
}
.terminate-btn {
  background: #fff5f5;
  border: 1px solid #ef9a9a;
  color: #b71c1c;
}
.text-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 12px;
  color: #bcaaa4;
  cursor: pointer;
  text-decoration: underline;
}
.text-btn.danger:hover {
  color: #b71c1c;
}

/* Empty State */
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
  .top-bar .header-left {
    flex: 0;
  }
  .header-center h2 {
    font-size: 16px;
  }
  .card-header {
    flex-direction: column;
  }
  .card-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .footer-right {
    justify-content: flex-start;
  }
}
</style>
