<template>
  <!-- 畫面內的確認、輸入、提示對話框（dialogService）；data-tour 讓導覽可以框起整個對話框與按鈕 -->
  <div v-if="dialog" class="app-dialog-backdrop">
    <section
      ref="panelEl"
      :class="['app-dialog', `tone-${dialog.tone}`]"
      :role="dialog.kind === 'confirm' && dialog.tone === 'danger' ? 'alertdialog' : 'dialog'"
      aria-modal="true"
      aria-labelledby="app-dialog-title"
      aria-describedby="app-dialog-message"
      :data-tour="`dialog-${dialog.id}`"
      @keydown="onKeydown"
    >
      <h2 id="app-dialog-title" class="app-dialog-title">
        <i v-if="dialog.tone === 'danger'" class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        {{ dialog.title }}
      </h2>
      <div id="app-dialog-message" class="app-dialog-message">
        <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
      </div>

      <form v-if="dialog.kind === 'prompt'" class="app-dialog-field" novalidate @submit.prevent="accept">
        <label for="app-dialog-input">{{ dialog.input.label }}</label>
        <input
          id="app-dialog-input"
          ref="inputEl"
          v-model="dialog.value"
          type="text"
          autocomplete="off"
          :placeholder="dialog.input.placeholder || ''"
          :aria-invalid="!!shownProblem"
          :aria-describedby="shownProblem ? 'app-dialog-problem' : undefined"
          data-tour="dialog-input"
        />
        <p v-if="shownProblem" id="app-dialog-problem" class="app-dialog-problem">{{ shownProblem }}</p>
      </form>

      <div class="app-dialog-actions">
        <button
          v-if="dialog.kind !== 'alert'"
          ref="cancelEl"
          type="button"
          class="app-dialog-btn secondary"
          data-tour="dialog-cancel"
          @click="cancel"
        >
          {{ dialog.cancelText }}
        </button>
        <button
          ref="confirmEl"
          type="button"
          :class="['app-dialog-btn', dialog.tone === 'danger' ? 'danger' : 'primary']"
          :disabled="!!problem"
          data-tour="dialog-confirm"
          @click="accept"
        >
          {{ dialog.confirmText }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  acceptDialog,
  cancelAllDialogs,
  cancelDialog,
  dialogState,
  inputProblem,
  messageParagraphs,
} from "../services/dialogService.js";

const dialog = computed(() => dialogState.current);
const paragraphs = computed(() => messageParagraphs(dialog.value?.message));
const problem = computed(() => inputProblem(dialog.value));
// 還沒輸入時不顯示錯誤，只停用確定按鈕
const shownProblem = computed(() => (dialog.value?.value ? problem.value : ""));

const panelEl = ref(null);
const inputEl = ref(null);
const cancelEl = ref(null);
const confirmEl = ref(null);
let returnFocusTo = null;

// 開啟時：輸入框優先；危險操作先停在「取消」，避免按 Enter 就執行
watch(dialog, async (current, previous) => {
  if (current && !previous) returnFocusTo = document.activeElement;
  if (!current) {
    returnFocusTo?.focus?.();
    returnFocusTo = null;
    return;
  }
  await nextTick();
  const target =
    inputEl.value ?? (current.tone === "danger" && cancelEl.value ? cancelEl.value : confirmEl.value);
  target?.focus();
});

const accept = () => acceptDialog();
const cancel = () => cancelDialog();

const onKeydown = (event) => {
  // Esc 只關閉對話框，不傳到後方（例如「?」選單、帳號管理的對話框）
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    cancel();
    return;
  }
  // Tab 只在對話框內循環
  if (event.key !== "Tab") return;
  const items = [...panelEl.value.querySelectorAll("input, button:not([disabled])")];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

// 換頁時關閉（視為取消）
const removeGuard = useRouter().beforeEach(() => {
  cancelAllDialogs();
});
onBeforeUnmount(removeGuard);
</script>

<style scoped>
.app-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(33, 22, 18, 0.45);
}

.app-dialog {
  width: 100%;
  max-width: 460px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 22px 22px 18px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  color: #3e2723;
}

.app-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
}

.tone-danger .app-dialog-title i {
  color: #c0392b;
}

.app-dialog-message p {
  margin: 0 0 8px;
  font-size: 15px;
  line-height: 1.6;
  color: #5d4037;
  overflow-wrap: anywhere;
}

.app-dialog-field {
  margin-top: 12px;
}

.app-dialog-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
}

.app-dialog-field input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #d7c6b8;
  border-radius: 8px;
  font-size: 15px;
}

.app-dialog-field input[aria-invalid="true"] {
  border-color: #c0392b;
}

.app-dialog-problem {
  margin: 6px 0 0;
  font-size: 13px;
  color: #c0392b;
}

.app-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.app-dialog-btn {
  min-width: 88px;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.app-dialog-btn.secondary {
  border: 1px solid #c2956e;
  background: #fff;
  color: #5d4037;
}

.app-dialog-btn.primary {
  border: none;
  background: #b98158;
  color: #fff;
}

.app-dialog-btn.danger {
  border: none;
  background: #c0392b;
  color: #fff;
}

.app-dialog-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-dialog-btn:focus-visible,
.app-dialog-field input:focus-visible {
  outline: 3px solid #c8a27c;
  outline-offset: 2px;
}
</style>
