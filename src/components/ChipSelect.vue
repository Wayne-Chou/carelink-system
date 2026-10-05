<template>
  <div class="chip-group" :class="{ invalid }" role="group">
    <button
      v-for="option in options"
      :key="option.code"
      type="button"
      :class="['chip', { active: isActive(option.code) }]"
      :aria-pressed="isActive(option.code)"
      @click="toggle(option.code)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
// 標籤式選擇：multiple 為 true 時 modelValue 是陣列，否則是單一值
// exclusive：互斥代碼（例如 "all" 不指定），選它會清除其他選項，選其他選項會取消它
const props = defineProps({
  modelValue: { type: [Array, String, Number, Boolean], default: () => [] },
  options: { type: Array, required: true },
  multiple: { type: Boolean, default: true },
  exclusive: { type: [String, Number], default: null },
  invalid: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const selected = () => (Array.isArray(props.modelValue) ? props.modelValue : []);

const isActive = (code) =>
  props.multiple ? selected().includes(code) : props.modelValue === code;

const toggle = (code) => {
  if (!props.multiple) {
    emit("update:modelValue", code);
    return;
  }
  const current = selected();
  if (current.includes(code)) {
    emit("update:modelValue", current.filter((c) => c !== code));
  } else if (props.exclusive !== null && code === props.exclusive) {
    emit("update:modelValue", [code]);
  } else {
    emit("update:modelValue", [...current.filter((c) => c !== props.exclusive), code]);
  }
};
</script>

<style scoped>
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 2px;
  border-radius: 12px;
}
.chip-group.invalid {
  outline: 1px solid #d32f2f;
  outline-offset: 4px;
}
.chip {
  padding: 8px 16px;
  background: #f5f0ed;
  border: none;
  border-radius: 50px;
  font-size: 13px;
  color: #8d6e63;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.chip:hover {
  background: #efe7dc;
}
.chip.active {
  background: #5d4037;
  color: white;
}
.chip:focus-visible {
  outline: 2px solid #c2956e;
  outline-offset: 2px;
}
</style>
