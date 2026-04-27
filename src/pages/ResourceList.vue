<template>
  <div class="list-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/')">← 返回</button>
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
          type="text"
          placeholder="搜尋資源名稱、單位或標籤..."
          v-model="searchQuery"
        />
      </div>
      <div class="filter-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.value"
          :class="['filter-tab', { active: currentTab === tab.value }]"
          @click="currentTab = tab.value"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>

    <div class="container main-list">
      <div v-if="filteredResources.length > 0">
        <div
          v-for="item in filteredResources"
          :key="item.id"
          class="resource-card"
        >
          <div class="card-status" :class="item.statusClass"></div>
          <div class="card-content">
            <div class="card-header">
              <div class="header-left">
                <span class="org-name">{{ item.organization }}</span>
                <span class="status-text">
                  {{ statusLabelMap[item.status] || "未設定" }}
                </span>
              </div>
              <div class="header-right">
                <span class="verify-date">
                  驗證日: {{ item.lastVerifyDate || "--" }}
                </span>
              </div>
            </div>
            <h4 class="resource-name">{{ item.name }}</h4>
            <div class="tag-row">
              <span class="type-badge">{{ item.types?.[0] || "未分類" }}</span>
              <span v-for="tag in item.tags" :key="tag" class="info-tag"
                >#{{ tag }}</span
              >
            </div>
            <div class="card-footer">
              <div class="footer-left">
                <div class="location">📍 {{ item.locationName }}</div>
              </div>
              <div class="footer-right">
                <button class="detail-btn" @click="loginResource(item.id)">
                  進入資源端
                </button>
                <button class="detail-btn" @click="viewDetail(item)">
                  管理詳情
                </button>
                <button class="delete-btn" @click="deleteResource(item.id)">
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
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
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

const searchQuery = ref("");
const currentTab = ref("all");
const resources = ref([]);
const router = useRouter();
const tabs = [
  { label: "全部", value: "all" },
  { label: "活躍", value: "active" },
  { label: "暫停", value: "pause" },
  { label: "終止", value: "end" },
  { label: "季節性", value: "season" },
];
const statusLabelMap = {
  active: "🟢 活躍",
  pause: "🟡 暫停",
  end: "🔴 終止",
  season: "🔵 季節性",
};

const getStatusClass = (status) => {
  switch (status) {
    case "active":
      return "status-green";
    case "pause":
      return "status-yellow";
    case "end":
      return "status-red";
    case "season":
      return "status-blue";
    default:
      return "status-yellow";
  }
};

const resourcesWithStatus = computed(() =>
  resources.value.map((item) => ({
    ...item,
    statusClass: getStatusClass(item.status),
  }))
);

onMounted(() => {
  try {
    const storedResources = localStorage.getItem("resources");
    resources.value = storedResources ? JSON.parse(storedResources) : [];
    if (!Array.isArray(resources.value)) {
      resources.value = [];
    }
  } catch (error) {
    resources.value = [];
  }
});

// 篩選邏輯
const filteredResources = computed(() => {
  const keyword = searchQuery.value.trim();
  return resourcesWithStatus.value.filter((item) => {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const matchesSearch =
      item.name?.includes(keyword) ||
      item.organization?.includes(keyword) ||
      tags.some((tag) => tag.includes(keyword));
    const matchesTab =
      currentTab.value === "all" || item.status === currentTab.value;
    return matchesSearch && matchesTab;
  });
});

const deleteResource = (id) => {
  if (!confirm("確定刪除？")) return;
  resources.value = resources.value.filter((item) => item.id !== id);
  localStorage.setItem("resources", JSON.stringify(resources.value));
};

const loginResource = (id) => {
  localStorage.setItem("currentResourceId", id);
  router.push("/resource-dashboard");
};

const viewDetail = (item) => {
  router.push(`/resources/${item.id}`);
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
.header-left,
.header-right {
  flex: 1;
}
.header-right {
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
  padding: 6px 16px;
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
.card-status {
  width: 6px;
}
.status-yellow {
  background: #fbc02d;
}
.status-green {
  background: #2e7d32;
}
.status-red {
  background: #d32f2f;
}
.status-blue {
  background: #2196f3;
}

.card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 15px;
  height: 100%;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 5px;
}
.card-header .header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-header .header-right {
  text-align: right;
  flex-shrink: 0;
}
.org-name {
  font-size: 12px;
  color: #a1887f;
  font-weight: 600;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.verify-date {
  font-size: 11px;
  color: #bcaaa4;
}
.status-text {
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
}
.resource-name {
  font-size: 17px;
  color: #3e2723;
  font-weight: 700;
  margin-bottom: 10px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 15px;
}
.type-badge {
  background: #fdf8f5;
  color: #5d4037;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid #efe7dc;
}
.info-tag {
  color: #c2956e;
  font-size: 11px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px dashed #efe7dc;
  margin-top: auto;
}
.footer-left {
  flex: 1;
  min-width: 0;
}
.footer-right {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.location {
  font-size: 12px;
  color: #8d6e63;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-btn {
  background: #fdf8f5;
  border: 1px solid #d6ccc2;
  color: #5d4037;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.delete-btn {
  background: #fff5f5;
  border: 1px solid #ef9a9a;
  color: #b71c1c;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
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
</style>