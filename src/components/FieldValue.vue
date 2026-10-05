<template>
  <span v-if="isEmpty" class="field-empty">{{ emptyText }}</span>
  <span v-else class="field-value"><slot>{{ display }}</slot></span>
</template>

<script setup>
// 顯示欄位值；空字串、null、空陣列顯示為淡色「未填寫」
// value 為陣列時以頓號連接；也可用 slot 自訂內容（仍以 value 判斷是否為空）
import { computed } from "vue";

const props = defineProps({
  value: { type: [String, Number, Array, Boolean, Object], default: null },
  emptyText: { type: String, default: "未填寫" },
});

const isEmpty = computed(() => {
  const v = props.value;
  if (v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
});

const display = computed(() =>
  Array.isArray(props.value) ? props.value.join("、") : String(props.value)
);
</script>

<style scoped>
.field-empty {
  color: #bcaaa4;
  font-weight: 400;
}
.field-value {
  white-space: pre-line;
}
</style>
