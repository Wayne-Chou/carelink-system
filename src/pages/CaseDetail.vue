<template>
  <div class="case-detail-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="router.push('/cases')">← 返回</button>
      </div>
      <div class="header-center">
        <h2>個案詳情</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="container main-content">
      <div v-if="!currentCase" class="empty-state">
        找不到個案資料
      </div>

      <div v-else>
        <div class="info-card">
            <h3>{{ currentCase.basic?.name || currentCase.name || "未命名個案" }}</h3>
          <p>目前階段：{{ stageText(currentCase.stage || 1) }}</p>
        </div>

        <div class="flow-card">
          <div class="flow-steps">
            <template v-for="(step, index) in stageLabels" :key="step.stage">
              <div
                class="flow-step"
                :class="{
                  completed: (currentCase.stage || 1) > step.stage,
                  active: (currentCase.stage || 1) === step.stage,
                }"
              >
                {{ step.label }}
              </div>
              <span v-if="index < stageLabels.length - 1" class="flow-arrow">→</span>
            </template>
          </div>
        </div>

        <div class="action-row">
          <button class="prev-btn" @click="goToStage((currentCase.stage || 1) - 1)" :disabled="(currentCase.stage || 1) <= 1 || (currentCase.stage || 1) >= 6">
            返回上一步
          </button>
          <button
            class="next-btn"
            @click="nextStage"
            :disabled="(currentCase.stage || 1) >= 6"
          >
            下一步
          </button>
        </div>

        <div v-if="currentCase.stage === 1" class="section-card">
          <h4>基本辨識</h4>
          <input v-model="basicName" placeholder="姓名" />
          <input v-model="basicAge" type="number" placeholder="年齡" />
          <select v-model="basicSource">
            <option value="">轉介來源</option>
            <option value="醫療">醫療</option>
            <option value="社區">社區</option>
            <option value="自主">自主</option>
          </select>
          <select v-model="basicIdentity">
            <option value="">請選擇身分別</option>
            <option value="獨居長者">獨居長者</option>
            <option value="慢性病患">慢性病患</option>
            <option value="照顧者">照顧者</option>
            <option value="身心障礙">身心障礙</option>
            <option value="其他">其他</option>
          </select>
          <textarea v-model="basicProblem" placeholder="輸入主要問題"></textarea>
        </div>

        <div v-if="currentCase.stage === 2" class="section-card">
          <h4>需求評估</h4>
          <div class="section-title">需求與動機</div>
          <select v-model="consultNeedLevel">
            <option value="">請選擇需求程度</option>
            <option value="低">低</option>
            <option value="中">中</option>
            <option value="高">高</option>
          </select>
          <select v-model="consultMotivation">
            <option value="">請選擇參與動機</option>
            <option value="低">低</option>
            <option value="中">中</option>
            <option value="高">高</option>
          </select>
          <input v-model="consultGoal" placeholder="輸入服務目標" />
          <textarea v-model="consultNote" placeholder="輸入需求或訪談內容"></textarea>
        </div>

        <div v-if="currentCase.stage === 3" class="section-card">
          <h4>資源連結</h4>
          <p v-if="selectedResourceName" class="linked-resource">
            已連結：{{ selectedResourceName }}
          </p>
          <p v-else class="linked-resource">尚未綁定資源</p>
          <div class="status-box">
            狀態：
            <span :class="`status-${currentCase.linkage?.status || 'pending'}`">
              {{ currentCase.linkage?.status || "等待回報" }}
            </span>
          </div>
          <input v-model="linkageReason" placeholder="輸入連結原因" />

          <div v-if="resources.length === 0" class="empty-inline">目前沒有可選資源</div>
          <div v-else class="resource-list">
            <div v-for="resource in resources" :key="resource.id" class="resource-card">
              <div class="resource-content">
                <h5>{{ resource.name || "未命名資源" }}</h5>
                <span class="resource-tag">{{ resource.types?.[0] || "未分類" }}</span>
              </div>
              <button class="select-btn" @click="bindResource(resource.id)">選擇</button>
            </div>
          </div>
        </div>

        <div v-if="currentCase.stage === 4" class="section-card">
          <h4>追蹤紀錄</h4>

          <select v-model="trackingStatus">
            <option value="">請選擇</option>
            <option value="出席">出席</option>
            <option value="未出席">未出席</option>
          </select>
          <select v-model="trackingEffect">
            <option value="">成效評估</option>
            <option value="改善">改善</option>
            <option value="無變化">無變化</option>
            <option value="惡化">惡化</option>
          </select>
          <textarea v-model="trackingNote" placeholder="輸入追蹤備註"></textarea>
          <button class="select-btn" @click="addTrackingRecord">新增追蹤紀錄</button>
          <ul class="history-list">
            <li v-for="(item, index) in currentCase.tracking || []" :key="`tracking-${index}`">
              第{{ item.step }}次｜{{ item.date }}｜{{ item.status }}｜{{ item.effect }}
            </li>
          </ul>
        </div>

        <div v-if="currentCase.stage === 5" class="section-card">
          <h4>結案資訊</h4>
          <input v-model="closeReason" placeholder="輸入結案原因" />
          <textarea v-model="closeOutcome" placeholder="輸入結案成果"></textarea>
          <button class="reopen-btn" @click="reopenCase">重新開案</button>
        </div>

        <div class="section-card">
          <h4>歷程紀錄</h4>
          <ul class="history-list">
            <li v-for="(item, index) in currentCase.history || []" :key="index">
              階段 {{ item.stage }}｜{{ item.date }}｜{{ item.note }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const cases = ref([]);
const resources = ref([]);
const currentCase = ref(null);
const basicName = ref("");
const basicAge = ref("");
const basicSource = ref("");
const basicIdentity = ref("");
const basicProblem = ref("");
const consultNeedLevel = ref("");
const consultMotivation = ref("");
const consultGoal = ref("");
const consultNote = ref("");
const linkageReason = ref("");
const trackingStatus = ref("");
const trackingEffect = ref("");
const trackingNote = ref("");
const closeReason = ref("");
const closeOutcome = ref("");

const stageLabels = [
  { stage: 1, label: "辨識" },
  { stage: 2, label: "諮詢" },
  { stage: 3, label: "連結" },
  { stage: 4, label: "追蹤" },
  { stage: 5, label: "結案" },
];

const stageText = (stage) => {
  const matched = stageLabels.find((item) => item.stage === stage);
  return matched ? `${matched.stage} ${matched.label}` : "1 辨識";
};

const getToday = () => new Date().toISOString().slice(0, 10);
const withRole = (content) => `[健康管理員] ${content}`;

const loadCases = () => {
  const stored = JSON.parse(localStorage.getItem("cases") || "[]");
  cases.value = Array.isArray(stored) ? stored : [];
};

const loadResources = () => {
  const stored = JSON.parse(localStorage.getItem("resources") || "[]");
  resources.value = Array.isArray(stored) ? stored : [];
};

const loadCurrentCase = () => {
  const found = cases.value.find((item) => String(item.id) === String(route.params.id)) || null;
  if (!found) {
    currentCase.value = null;
    return;
  }

  currentCase.value = {
    ...found,
    basic: {
      name: found.basic?.name || found.name || "",
      age: found.basic?.age || "",
      gender: found.basic?.gender || "",
      identity: Array.isArray(found.basic?.identity) ? found.basic.identity : [],
      source: found.basic?.source || "",
      problem: found.basic?.problem || "",
    },
    consultation: {
      needLevel: found.consultation?.needLevel || "",
      motivation: found.consultation?.motivation || "",
      goal: found.consultation?.goal || "",
      note: found.consultation?.note || "",
    },
    linkage: {
      resourceId: found.linkage?.resourceId ?? found.resourceId ?? null,
      reason: found.linkage?.reason || "",
      status: found.linkage?.status || "",
    },
    tracking: Array.isArray(found.tracking) ? found.tracking : [],
    closure: {
      reason: found.closure?.reason || "",
      outcome: found.closure?.outcome || "",
    },
    history: Array.isArray(found.history) ? found.history : [],
  };

  basicName.value = currentCase.value.basic.name;
  basicAge.value = currentCase.value.basic.age;
  basicSource.value = currentCase.value.basic.source;
  basicIdentity.value = currentCase.value.basic.identity[0] || "";
  basicProblem.value = currentCase.value.basic.problem;
  consultNeedLevel.value = currentCase.value.consultation.needLevel;
  consultMotivation.value = currentCase.value.consultation.motivation;
  consultGoal.value = currentCase.value.consultation.goal;
  consultNote.value = currentCase.value.consultation.note;
  linkageReason.value = currentCase.value.linkage.reason;
  closeReason.value = currentCase.value.closure.reason;
  closeOutcome.value = currentCase.value.closure.outcome;
};

const persistCases = () => {
  localStorage.setItem("cases", JSON.stringify(cases.value));
};

const nextStage = () => {
  if (!currentCase.value) return;
  const currentStage = currentCase.value.stage || 1;
  if (currentStage >= 6) return;

  currentCase.value.history = Array.isArray(currentCase.value.history)
    ? currentCase.value.history
    : [];

  if (currentStage === 1) {
    currentCase.value.basic = {
      ...currentCase.value.basic,
      name: basicName.value,
      age: basicAge.value,
      source: basicSource.value,
      identity: basicIdentity.value ? [basicIdentity.value] : [],
      problem: basicProblem.value,
    };
  }

  if (currentStage === 2) {
    currentCase.value.consultation = {
      ...currentCase.value.consultation,
      needLevel: consultNeedLevel.value,
      motivation: consultMotivation.value,
      goal: consultGoal.value,
      note: consultNote.value,
    };
  }

  if (
    currentStage === 2 &&
    (!consultNeedLevel.value || !consultMotivation.value || !consultGoal.value)
  ) {
    alert("請完整填寫需求評估");
    return;
  }

  if (currentStage === 3) {
    if (!currentCase.value.linkage?.resourceId) {
      alert("請先選擇資源");
      return;
    }

    currentCase.value.linkage = {
      ...currentCase.value.linkage,
      reason: linkageReason.value,
    };

    currentCase.value.history.push({
      stage: 3,
      date: getToday(),
      note: withRole("已完成資源連結"),
    });
  }

  if (currentStage === 4 && (!currentCase.value.tracking || currentCase.value.tracking.length === 0)) {
    alert("請至少新增一筆追蹤紀錄");
    return;
  }

  if (currentStage === 5) {
    if (!closeReason.value || !closeOutcome.value) {
      alert("請填寫結案原因與成果");
      return;
    }

    currentCase.value.closure = {
      reason: closeReason.value,
      outcome: closeOutcome.value,
    };

    currentCase.value.history.push({
      stage: 5,
      date: getToday(),
      note: withRole(`${closeReason.value}｜${closeOutcome.value}`),
    });

    currentCase.value.stage = 6;

    cases.value = cases.value.map((item) =>
      String(item.id) === String(currentCase.value.id) ? { ...currentCase.value } : item
    );

    persistCases();
    console.log(currentCase.value);
    return;
  }

  if (currentStage === 2) {
    currentCase.value.history.push({
      stage: 2,
      date: getToday(),
      note: withRole(consultNote.value || "完成需求評估"),
    });
  }

  const next = currentStage + 1;
  currentCase.value.stage = next;
  currentCase.value.history.push({
    stage: next,
    date: getToday(),
    note: withRole("流程推進"),
  });

  cases.value = cases.value.map((item) =>
    String(item.id) === String(currentCase.value.id) ? { ...currentCase.value } : item
  );
  persistCases();
  console.log(currentCase.value);
};

const bindResource = (resourceId) => {
  console.log("選擇資源ID:", resourceId);
  if (!currentCase.value) return;
  currentCase.value.history = Array.isArray(currentCase.value.history)
    ? currentCase.value.history
    : [];
  currentCase.value.linkage = {
    ...currentCase.value.linkage,
    resourceId: resourceId ?? null,
    reason: linkageReason.value,
  };
  const resource = resources.value.find((r) => r.id === resourceId);
  currentCase.value.history.push({
    stage: 3,
    date: getToday(),
    note: withRole(`連結資源：${resource?.name || "未知資源"}`),
  });

  cases.value = cases.value.map((item) =>
    String(item.id) === String(currentCase.value.id) ? { ...currentCase.value } : item
  );
  persistCases();
};

const selectedResourceName = computed(() => {
  if (!currentCase.value?.linkage?.resourceId) return "";
  const matched = resources.value.find(
    (item) => String(item.id) === String(currentCase.value.linkage.resourceId)
  );
  return matched?.name || "";
});

const addTrackingRecord = () => {
  if (!currentCase.value) return;
  if (!trackingStatus.value || !trackingEffect.value) {
    alert("請填寫追蹤狀態與結果");
    return;
  }

  currentCase.value.tracking = Array.isArray(currentCase.value.tracking)
    ? currentCase.value.tracking
    : [];

  const record = {
    status: trackingStatus.value,
    effect: trackingEffect.value,
    note: trackingNote.value || "",
    date: getToday(),
    step: (currentCase.value.tracking?.length || 0) + 1,
  };

  currentCase.value.tracking.push(record);
  currentCase.value.history.push({
    stage: 4,
    date: getToday(),
    note: withRole(`第${record.step}次追蹤｜${record.status}｜${record.effect}${record.note ? `｜${record.note}` : ""}`),
  });

  if (record.effect === "惡化") {
    const shouldBack = confirm("個案狀況惡化，是否回到諮詢階段？");
    if (shouldBack) {
      currentCase.value.stage = 2;
      currentCase.value.history.push({
        stage: 4,
        date: getToday(),
        note: withRole("追蹤惡化，返回諮詢"),
      });
    }
  }

  trackingStatus.value = "";
  trackingEffect.value = "";
  trackingNote.value = "";

  cases.value = cases.value.map((item) =>
    String(item.id) === String(currentCase.value.id) ? { ...currentCase.value } : item
  );
  persistCases();
};

const reopenCase = () => {
  if (!currentCase.value) return;

  currentCase.value.history = Array.isArray(currentCase.value.history)
    ? currentCase.value.history
    : [];
  currentCase.value.stage = 2;

  currentCase.value.history.push({
    stage: 5,
    date: getToday(),
    note: withRole("重新開案 → 回諮詢"),
  });

  cases.value = cases.value.map((item) =>
    String(item.id) === String(currentCase.value.id) ? { ...currentCase.value } : item
  );
  persistCases();
};

const goToStage = (stage) => {
  if (!currentCase.value) return;
  if (stage < 1 || stage > 5) return;
  currentCase.value.stage = stage;
  cases.value = cases.value.map((item) =>
    String(item.id) === String(currentCase.value.id) ? { ...currentCase.value } : item
  );
  persistCases();
};

onMounted(() => {
  loadCases();
  loadResources();
  loadCurrentCase();
});
</script>

<style scoped>
.case-detail-page {
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

.header-center h2 {
  margin: 0;
  font-size: 18px;
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
}

.main-content {
  margin-top: 20px;
  padding: 0 15px;
}

.info-card,
.flow-card,
.section-card {
  background: white;
  border-radius: 14px;
  border: 1px solid #f0e6e0;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.08);
  padding: 16px;
  margin-bottom: 15px;
}

.info-card h3 {
  margin: 0 0 8px;
  color: #3e2723;
  font-size: 20px;
}

.info-card p {
  margin: 0;
  color: #8d6e63;
  font-size: 14px;
}

.flow-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.flow-step {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 13px;
  background: #ece7e2;
  color: #a1887f;
}

.flow-step.completed {
  background: #c2956e;
  color: white;
}

.flow-step.active {
  background: #5d4037;
  color: white;
  font-weight: 700;
}

.flow-arrow {
  color: #bcaaa4;
  font-size: 12px;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.next-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  background: #5d4037;
  color: white;
  font-size: 15px;
  font-weight: 700;
  padding: 12px;
  margin-bottom: 15px;
  cursor: pointer;
}

.prev-btn {
  border: 1px solid #d6ccc2;
  border-radius: 10px;
  background: white;
  color: #6d4c41;
  font-size: 14px;
  font-weight: 700;
  padding: 12px;
  cursor: pointer;
  min-width: 120px;
}

.prev-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.next-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.section-card h4 {
  margin: 0 0 12px;
  color: #3e2723;
  font-size: 16px;
}

.section-title {
  font-size: 13px;
  color: #a1887f;
  margin: 10px 0 6px;
  font-weight: 600;
}

.linked-resource {
  margin: 0 0 12px;
  color: #8d6e63;
  font-size: 14px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource-card {
  border: 1px solid #efe7dc;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.resource-content h5 {
  margin: 0 0 4px;
  color: #3e2723;
  font-size: 15px;
}

.resource-tag {
  display: inline-block;
  font-size: 12px;
  color: #8d6e63;
  background: #fdf8f5;
  border: 1px solid #efe7dc;
  border-radius: 6px;
  padding: 2px 8px;
}

.select-btn {
  background: #c2956e;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
}

.history-list {
  margin: 0;
  padding-left: 18px;
  color: #6d4c41;
  font-size: 13px;
}

.history-list li {
  margin-bottom: 6px;
  background: #fdf8f5;
  border: 1px solid #efe7dc;
  padding: 8px;
  border-radius: 8px;
}

.empty-state,
.empty-inline {
  color: #bcaaa4;
  font-size: 14px;
}

textarea,
select {
  width: 100%;
  border: 1px solid #d6ccc2;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: #fdf8f5;
  color: #3e2723;
  outline: none;
  transition: all 0.2s ease;
  margin-top: 8px;
  margin-bottom: 10px;
}

select {
  cursor: pointer;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

textarea:focus,
select:focus {
  border-color: #c2956e;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(194, 149, 110, 0.15);
}

input,
textarea,
select {
  width: 100%;
  border: 1px solid #d6ccc2;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: #fdf8f5;
  color: #3e2723;
  margin-top: 8px;
  margin-bottom: 10px;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #c2956e;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(194, 149, 110, 0.15);
}

.reopen-btn {
  background: #e3f2fd;
  border: 1px solid #90caf9;
  color: #1565c0;
  padding: 10px;
  border-radius: 8px;
  margin-top: 10px;
  cursor: pointer;
}

.reopen-btn:hover {
  background: #bbdefb;
}

.status-box {
  background: #fdf8f5;
  border: 1px solid #efe7dc;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.status-成功 {
  color: #2e7d32;
  font-weight: bold;
}

.status-失敗 {
  color: #d32f2f;
  font-weight: bold;
}

.status-pending {
  color: #999;
}

</style>
