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
        <button v-if="canOpen('/cases')" class="add-btn" @click="$router.push('/cases')">👤 個人端</button>
        <button v-if="canOpen('/form')" class="add-btn" data-tour="list-new" @click="$router.push('/form')">＋ 新增</button>
        <UserMenu />
      </div>
    </div>

    <div class="filter-container" data-tour="list-tabs">
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
      </div>
    </div>


    <div class="container main-list">
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
          v-for="(item, index) in filteredResources"
          :data-tour="index === 0 ? 'list-card' : undefined"
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
                <span :class="['status-text', item.status]">{{ item.statusText }}</span>
                <span v-if="item.overdue" class="overdue-badge">待驗證</span>
              </div>
            </div>

            <h4 class="resource-name">{{ item.name || "未命名資源" }}</h4>

            <div class="meta-row">
              <span :class="['meta-badge', 'risk', item.riskLevel || 'none']">{{ item.riskText }}</span>
              <span :class="['meta-badge', 'partnership', item.partnership]">{{ item.partnershipText }}</span>
              <span
                :class="['meta-badge', 'explore', item.exploreVisible ? 'on' : 'off']"
                :title="item.exploreReasons"
              >
                <i
                  :class="item.exploreVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
                  aria-hidden="true"
                ></i>
                {{ item.exploreText }}
              </span>
            </div>

            <div v-if="item.needTags.length" class="tag-row">
              <span v-for="tag in item.tagTexts" :key="tag" class="info-tag">{{ tag }}</span>
            </div>

            <div class="card-footer" :data-tour="index === 0 ? 'list-actions' : undefined">
              <div class="footer-left">
                <button type="button" class="text-btn danger" @click="removeResource(item)">
                  永久刪除
                </button>
              </div>
              <div class="footer-right">
                <button v-if="canOpen('/resource-dashboard')" type="button" class="detail-btn" @click="loginResource(item.id)">
                  進入資源端
                </button>
                <button v-if="canOpen(`/resources/${item.id}`)" type="button" class="detail-btn" @click="$router.push(`/resources/${item.id}`)">
                  查看
                </button>
                <button v-if="canOpen(`/form/${item.id}`)" type="button" class="detail-btn" @click="$router.push(`/form/${item.id}`)">
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
import { useCanOpen } from "../composables/useCanOpen.js";
import UserMenu from "../components/UserMenu.vue";
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { goBack } from "../utils/navigation.js";
import FieldValue from "../components/FieldValue.vue";
import { getNeedTagLabel } from "../config/needTags.js";
import { STATUS_OPTIONS } from "../config/resourceOptions.js";
import { deleteResource, getAllResources, terminateResource } from "../services/resourceService.js";
import { resourceRows } from "../services/listViews.js";
import { currentActor, setCurrentResourceId } from "../utils/auth.js";
import { consumeFlash } from "../utils/flash.js";

const router = useRouter();
// 導向沒有權限的頁面的連結與按鈕一律不顯示
const canOpen = useCanOpen();
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


const reload = () => {
  resources.value = getAllResources();
};

// 列表需要的衍生資料一次算好
// 卡片顯示資料（狀態、風險、合作狀態、探索頁是否顯示）與角色預覽面板共用（services/listViews.js）
const rows = computed(() => resourceRows(resources.value));

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
  terminateResource(item.id, { actor: currentActor() });
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

// 資源端登入的資源屬於登入狀態，由 auth.js 存放（測試階段為 sessionStorage）
const loginResource = (id) => {
  setCurrentResourceId(id);
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

/* 登入者與登出（UserMenu）靠右 */
.top-bar .header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
</style>
