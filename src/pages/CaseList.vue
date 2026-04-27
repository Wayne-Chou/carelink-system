<template>
  <div class="case-list-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/list')">← 返回</button>
      </div>
      <div class="header-center">
        <h2>個案管理</h2>
      </div>
      <div class="header-right">
        <button class="add-btn" @click="createCase">＋新增個案</button>
      </div>
    </div>

    <div class="container main-list">
      <div v-if="cases.length === 0" class="empty-state">目前沒有個案</div>

      <div v-else>
        <div
          v-for="item in cases"
          :key="item.id"
          class="case-card"
          @click="goDetail(item.id)"
        >
          <div class="case-content">
            <h4>{{ item.basic?.name || item.name || "未命名個案" }}</h4>
            <div class="case-meta">
              <span
                class="stage-badge"
                :class="`stage-${item.stage >= 5 ? 5 : item.stage || 1}`"
              >
                {{ stageLabel(item.stage || 1) }}
              </span>
              <span v-if="item.stage === 6" class="closed-tag">已完成</span>
              <span class="created-at">建立時間：{{ item.createdAt || "未提供" }}</span>
            </div>
          </div>
          <div class="case-actions">
            <button class="delete-btn" @click.stop="deleteCase(item.id)">🗑</button>
            <div class="case-arrow">〉</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const cases = ref([]);

const getToday = () => new Date().toISOString().slice(0, 10);

const loadCases = () => {
  const stored = JSON.parse(localStorage.getItem("cases") || "[]");
  cases.value = Array.isArray(stored) ? stored : [];
};

const createCase = () => {
  const name = prompt("請輸入個案名稱");
  if (!name || !name.trim()) return;

  const newCase = {
    id: `case_${Date.now()}`,
    basic: {
      name: name.trim(),
      age: "",
      gender: "",
      identity: [],
      source: "",
      problem: "",
    },
    consultation: {
      needLevel: "",
      motivation: "",
      goal: "",
      note: "",
    },
    linkage: {
      resourceId: null,
      reason: "",
      status: "",
    },
    tracking: [],
    closure: {
      reason: "",
      outcome: "",
    },
    stage: 1,
    history: [
      {
        stage: 1,
        date: getToday(),
        note: "初始建立",
      },
    ],
    createdAt: getToday(),
  };

  const nextCases = [...cases.value, newCase];
  localStorage.setItem("cases", JSON.stringify(nextCases));
  cases.value = nextCases;
};

const goDetail = (id) => {
  if (!id) return;
  router.push(`/case/${id}`);
};

const deleteCase = (id) => {
  const ok = confirm("確定要刪除這個個案？");
  if (!ok) return;

  const next = cases.value.filter((c) => c.id !== id);
  cases.value = next;
  localStorage.setItem("cases", JSON.stringify(next));
};

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

onMounted(() => {
  loadCases();
});
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
}

.add-btn {
  background: #c2956e;
  border: none;
  font-weight: 700;
}

.resource-btn {
  margin-left: 8px;
  background: #6f8c72;
  color: white;
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}


.main-list {
  margin-top: 20px;
  padding: 0 15px;
}

.case-card {
  background: white;
  border-radius: 14px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #f0e6e0;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.08);
  padding: 16px;
  cursor: pointer;
}

.case-content h4 {
  margin: 0 0 10px;
  color: #3e2723;
  font-size: 17px;
  font-weight: 700;
}

.case-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.stage-badge {
  display: inline-block;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  color: white;
  font-weight: 600;
}

.stage-1 {
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

.created-at {
  font-size: 12px;
  color: #8d6e63;
}

.closed-tag {
  font-size: 11px;
  background: #eeeeee;
  color: #616161;
  padding: 2px 6px;
  border-radius: 6px;
}

.case-arrow {
  color: #d6ccc2;
  font-weight: 700;
}

.case-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #bcaaa4;
}
</style>
