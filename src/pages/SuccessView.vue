<template>
  <div class="success-page">
    <div class="success-card">
      <div v-if="Number($route.query.missing) > 0" class="missing-notice" role="status">
        <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
        有 {{ Number($route.query.missing) }} 個建議欄位未填，資料已儲存，建議之後補齊。
      </div>
      <div class="check-icon">✓</div>
      <h2>資源已建立</h2>
      <p v-if="resource" class="resource-name">「{{ resource.name }}」</p>

      <div
        v-if="exploreStatus"
        :class="['explore-status', exploreStatus.visible ? 'on' : 'off']"
        role="status"
      >
        <template v-if="exploreStatus.visible">
          <i class="fa-solid fa-eye" aria-hidden="true"></i> 已在探索頁顯示
        </template>
        <template v-else>
          <i class="fa-solid fa-eye-slash" aria-hidden="true"></i>
          尚未在探索頁顯示：{{ exploreStatus.reasons }}
        </template>
      </div>

      <div class="action-buttons">
        <button v-if="resource" class="btn-primary" @click="$router.push(`/resources/${resource.id}`)">
          前往資源詳細頁
        </button>
        <button class="btn-again" @click="$router.push('/list')">
          查看資源列表
        </button>
        <button class="btn-again" @click="$router.push('/form')">
          再新增一筆
        </button>
        <button class="btn-home" @click="$router.push('/')">回到首頁</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { VISIBILITY_REASON_LABELS } from "../config/resourceOptions.js";
import { getVisibility } from "../config/resourceRules.js";
import { getResourceById } from "../services/resourceService.js";

const route = useRoute();

// 表單建立後帶 ?id= 過來；找不到資源（例如直接開啟網址）時只顯示通用訊息
const resource = route.query.id ? getResourceById(route.query.id) : null;

const exploreStatus = computed(() => {
  if (!resource) return null;
  const { explore } = getVisibility(resource);
  return {
    visible: explore.visible,
    reasons: explore.reasons.map((code) => VISIBILITY_REASON_LABELS[code] ?? code).join("、"),
  };
});
</script>

<style scoped>
.success-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fcfaf8;
  padding: 20px;
}
.success-card {
  background: white;
  padding: 40px;
  border-radius: 30px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(93, 64, 55, 0.1);
  max-width: 400px;
  width: 100%;
}
.check-icon {
  width: 80px;
  height: 80px;
  background: #2e7d32;
  color: white;
  font-size: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin: 0 auto 20px;
}
h2 {
  color: #3e2723;
  font-weight: 700;
  margin-bottom: 10px;
}
p {
  color: #8d6e63;
  margin-bottom: 30px;
}
.missing-notice {
  margin-bottom: 24px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  color: #8a5a00;
  font-size: 14px;
  line-height: 1.6;
  text-align: left;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
button {
  padding: 15px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
}
.resource-name {
  color: #3e2723;
  font-weight: 700;
  margin-bottom: 16px;
  overflow-wrap: anywhere;
}
.explore-status {
  margin-bottom: 24px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}
.explore-status.on {
  background: #edf7ee;
  border: 1px solid #b7dfb9;
  color: #1b5e20;
}
.explore-status.off {
  background: #fff8e1;
  border: 1px solid #ffe082;
  color: #8a5a00;
}
.btn-primary {
  background: #2e7d32;
  color: white;
}
.btn-again {
  background: #5d4037;
  color: white;
}
.btn-home {
  background: #efe7dc;
  color: #5d4037;
}
</style>