<template>
  <!-- 載入示範情境「林示範的故事」：選擇從第幾步開始；會清空所有資源、評估、個案 -->
  <div :class="['scenario-loader', variant]">
    <label class="loader-label" :for="selectId">示範情境：林示範的故事</label>
    <div class="loader-row">
      <select :id="selectId" v-model.number="step">
        <option v-for="s in STORY_STEPS" :key="s.step" :value="s.step">
          從第 {{ s.step }} 步開始：{{ exampleTitle(s) }}
        </option>
      </select>
      <button type="button" class="load-btn" @click="load">
        <i class="fa-solid fa-flask" aria-hidden="true"></i> 載入示範情境
      </button>
    </div>
    <p class="loader-warning">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
      載入會清空所有資源、評估、個案，只保留示範情境資料（使用者帳號不受影響）
    </p>
    <p v-if="message" class="loader-message" role="status">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { STORY_STEPS, exampleTitle } from "../config/demoStory.js";
import { countData, loadScenario } from "../services/demoService.js";
import { describeStory, getStoryState } from "../services/storyService.js";

// variant：light 用在淺色背景（登入頁、資源列表篩選區）
defineProps({ variant: { type: String, default: "light" } });
const emit = defineEmits(["loaded"]);

let uid = 0;
const selectId = `scenario-step-${++uid}-${Math.random().toString(36).slice(2, 7)}`;
const step = ref(1);
const message = ref("");

const load = () => {
  const counts = countData();
  const ok = confirm(
    `確定要載入示範情境（從第 ${step.value} 步開始）？\n\n會清空目前全部 ${counts.resources} 筆資源、${counts.assessments} 筆評估、${counts.cases} 筆個案（含自建資料），只保留示範情境資料。此動作無法復原。`
  );
  if (!ok) return;
  const result = loadScenario(step.value);
  // 依載入後的實際資料決定操作者（例：第 5 步為所選資源的資源點帳號）
  const detail = describeStory(getStoryState(), null);
  const operator = detail.operator;
  message.value = `已載入第 ${result.step} 步「${detail.info.title}」：請用${operator.label}帳號（${operator.email}）操作`;
  emit("loaded", { ...result, role: operator.role, email: operator.email });
};
</script>

<style scoped>
.scenario-loader {
  padding: 14px 16px;
  border-radius: 12px;
  background: #faf6f2;
  border: 1px dashed #d7c2ad;
  color: #5d4037;
}

.loader-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
}

.loader-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.loader-row select {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d6ccc2;
  background: #fff;
  font-size: 14px;
  color: #3e2723;
}

.load-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #5d4037;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.load-btn:hover {
  background: #4e342e;
}

.loader-warning {
  margin: 8px 0 0;
  font-size: 12px;
  color: #b45309;
}

.loader-message {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #2e7d32;
}
</style>
