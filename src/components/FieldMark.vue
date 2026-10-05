<template>
  <span v-if="required || STRICT_VALIDATION" class="mark-required" aria-label="必填">*</span>
  <span v-else class="mark-suggested">建議填寫</span>
</template>

<script setup>
// 欄位標籤旁的必填標示：嚴格模式或 required 時顯示紅色 *，否則顯示灰色「建議填寫」
import { STRICT_VALIDATION } from "../config/resourceRules.js";

defineProps({
  required: { type: Boolean, default: false },
});
</script>

<style scoped>
.mark-required {
  color: #d32f2f;
}
.mark-suggested {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
  color: #a1887f;
}
</style>
