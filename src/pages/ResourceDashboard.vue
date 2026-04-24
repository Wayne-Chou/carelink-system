<template>
  <div class="resource-dashboard-page">
    <div class="top-bar">
      <h2>資源端管理面板</h2>
      <p>目前登入資源：{{ currentResourceName }}</p>
    </div>

    <div class="container main-content">
      <div v-if="!currentResourceId" class="empty-state">
        請先到「資源管理」選擇登入資源
      </div>

      <div v-else>
        <div v-if="linkedCases.length === 0" class="empty-state">目前沒有待處理個案</div>

        <div v-else>
          <div v-for="item in linkedCases" :key="item.id" class="case-card">
            <h4>{{ item.basic?.name || item.name || "未命名個案" }}</h4>
            <p>目前階段：{{ stageLabel(item.stage || 1) }}</p>
            <p>連結狀態：{{ item.linkage?.status || "等待回報" }}</p>

            <div class="actions">
              <button class="success" @click="updateStatus(item.id, '成功')">成功</button>
              <button class="fail" @click="updateStatus(item.id, '失敗')">失敗</button>
              <button class="stop" @click="updateStatus(item.id, '中斷')">中斷</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

const currentResourceId = ref("");
const cases = ref([]);
const resources = ref([]);

const loadData = () => {
  const storedCases = JSON.parse(localStorage.getItem("cases") || "[]");
  const storedResources = JSON.parse(localStorage.getItem("resources") || "[]");
  cases.value = Array.isArray(storedCases) ? storedCases : [];
  resources.value = Array.isArray(storedResources) ? storedResources : [];
};

const linkedCases = computed(() =>
  cases.value.filter((item) => {
    const linkageId = item.linkage?.resourceId ?? item.resourceId ?? "";
    return String(linkageId) === String(currentResourceId.value);
  })
);

const currentResourceName = computed(() => {
  const matched = resources.value.find(
    (item) => String(item.id) === String(currentResourceId.value)
  );
  return matched?.name || "尚未選擇資源";
});

const stageLabel = (stage) => {
  const map = {
    1: "1 辨識",
    2: "2 諮詢",
    3: "3 連結",
    4: "4 追蹤",
    5: "5 結案",
    6: "已結案",
  };
  return map[stage] || "1 辨識";
};

const updateStatus = (caseId, status) => {
  const target = cases.value.find((item) => String(item.id) === String(caseId));
  if (!target) return;

  target.linkage = {
    ...(target.linkage || {}),
    status,
  };

  if (status === "失敗") {
    target.stage = 2;
  }

  localStorage.setItem("cases", JSON.stringify(cases.value));
};

onMounted(() => {
  loadData();
  const savedId = localStorage.getItem("currentResourceId");
  if (savedId) {
    currentResourceId.value = savedId;
  }
});
</script>

<style scoped>
.resource-dashboard-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 30px;
}

.top-bar {
  background: #5d4037;
  color: white;
  padding: 16px;
}

.top-bar h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.top-bar p {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.main-content {
  margin-top: 16px;
  padding: 0 15px;
}

.empty-state {
  color: #bcaaa4;
  font-size: 14px;
}

.case-card {
  background: white;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 10px;
}

.case-card h4 {
  margin: 0 0 8px;
  color: #3e2723;
}

.case-card p {
  margin: 0 0 6px;
  color: #6d4c41;
  font-size: 13px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

button {
  border: none;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
}

button.success {
  background: #4caf50;
  color: white;
}

button.fail {
  background: #f44336;
  color: white;
}

button.stop {
  background: #ff9800;
  color: white;
}
</style>
