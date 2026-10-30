<template>
  <div class="fill-page">
    <header class="fill-header">
      <button type="button" class="exit-btn" @click="exit">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i> 離開
      </button>
      <span class="form-title">{{ FORM_TITLE }}</span>
      <span v-if="questionNumber" class="progress-text">第 {{ questionNumber }} / {{ QUESTION_TOTAL }} 題</span>
      <span v-else class="progress-text"></span>
    </header>
    <div v-if="questionNumber" class="progress-bar" aria-hidden="true">
      <div class="progress-fill" :style="{ width: `${(questionNumber / QUESTION_TOTAL) * 100}%` }"></div>
    </div>

    <main class="fill-main">
      <!-- 開頭說明 -->
      <section v-if="current === 'intro'" class="screen" data-tour="new-intro">
        <h1 ref="heading" tabindex="-1">{{ FORM_TITLE }}</h1>
        <p v-for="text in INTRO_PARAGRAPHS" :key="text" class="intro-text">{{ text }}</p>
        <p class="intro-emphasis">{{ INTRO_EMPHASIS }}</p>
        <button type="button" class="primary-btn" data-tour="new-start" @click="next">開始填寫</button>
        <!-- 這一頁沒有右下角的「?」按鈕：交給民眾前，工作人員可從這裡手動開啟導覽 -->
        <p class="tour-link-row">
          <button type="button" class="tour-link" @click="startPageTour('assessment-new')">工作人員：查看操作導覽</button>
        </p>
      </section>

      <!-- 基本資料 -->
      <section v-else-if="current === 'person'" class="screen">
        <h1 ref="heading" tabindex="-1">請填寫您的基本資料</h1>
        <label class="big-field">
          <span>姓名 <em class="required">必填</em></span>
          <input v-model.trim="form.person.name" type="text" autocomplete="name" />
        </label>
        <label class="big-field">
          <span>身分證字號 <em class="optional">可不填</em></span>
          <input v-model.trim="form.person.nationalId" type="text" autocomplete="off" maxlength="10" />
          <small>系統只保存後四碼</small>
        </label>
        <p v-if="hint" class="gentle-hint" role="alert">{{ hint }}</p>
        <nav class="screen-nav">
          <button type="button" class="secondary-btn" @click="prev">上一步</button>
          <button type="button" class="primary-btn" @click="next">下一步</button>
        </nav>
      </section>

      <!-- 一、生活狀況 Q1–Q10 -->
      <section v-else-if="currentQuestion" class="screen">
        <p class="section-label">{{ SECTION_ONE_TITLE }}｜{{ SECTION_ONE_INSTRUCTION }}</p>
        <p class="question-no">第 {{ questionNumber }} 題</p>
        <h1 :id="`${current}-text`" ref="heading" tabindex="-1" class="question-text">
          {{ currentQuestion.text }}
        </h1>
        <div ref="answerGroup" class="answer-list" role="radiogroup" :aria-labelledby="`${current}-text`">
          <button
            v-for="option in ANSWER_OPTIONS"
            :key="option.code"
            type="button"
            role="radio"
            :aria-checked="form.answers[current] === option.code"
            :class="['answer-btn', option.code, { selected: form.answers[current] === option.code }]"
            @click="answer(option.code)"
          >
            <i
              v-if="form.answers[current] === option.code"
              class="fa-solid fa-circle-check"
              aria-hidden="true"
            ></i>
            {{ option.label }}
          </button>
        </div>
        <p v-if="hint" class="gentle-hint" role="alert">{{ hint }}</p>
        <nav class="screen-nav">
          <button type="button" class="secondary-btn" @click="prev">上一題</button>
          <button type="button" class="primary-btn" @click="next">下一題</button>
        </nav>
      </section>

      <!-- Q11 生活支持需求 -->
      <section v-else-if="current === 'q11'" class="screen">
        <p class="section-label">{{ Q11_TITLE }}</p>
        <p class="question-no">第 11 題</p>
        <h1 id="q11-text" ref="heading" tabindex="-1" class="question-text small">{{ Q11_TEXT }}</h1>
        <div ref="answerGroup" role="group" aria-labelledby="q11-text">
          <fieldset v-for="group in Q11_GROUPS" :key="group.title" class="q11-group">
            <legend>{{ group.title }}</legend>
            <button
              v-for="item in group.items"
              :key="item.code"
              type="button"
              :aria-pressed="form.answers.q11.includes(item.code)"
              :class="['choice-btn', { selected: form.answers.q11.includes(item.code) }]"
              @click="toggleQ11(item.code)"
            >
              <i
                :class="form.answers.q11.includes(item.code) ? 'fa-solid fa-square-check' : 'fa-regular fa-square'"
                aria-hidden="true"
              ></i>
              <span>
                <strong>{{ item.label }}</strong>
                <small v-if="item.description">{{ item.description }}</small>
              </span>
            </button>
          </fieldset>
          <button
            type="button"
            :aria-pressed="q11Skipped"
            :class="['choice-btn', 'skip', { selected: q11Skipped }]"
            @click="skipQ11"
          >
            <i :class="q11Skipped ? 'fa-solid fa-square-check' : 'fa-regular fa-square'" aria-hidden="true"></i>
            <span><strong>不回答</strong></span>
          </button>
        </div>
        <p v-if="hint" class="gentle-hint" role="alert">{{ hint }}</p>
        <nav class="screen-nav">
          <button type="button" class="secondary-btn" @click="prev">上一題</button>
          <button type="button" class="primary-btn" @click="next">下一題</button>
        </nav>
      </section>

      <!-- Q12 -->
      <section v-else-if="current === 'q12'" class="screen">
        <p class="question-no">第 12 題</p>
        <h1 ref="heading" tabindex="-1" class="question-text small">{{ Q12_TEXT }}</h1>
        <textarea
          v-model="form.answers.q12"
          class="big-textarea"
          rows="5"
          aria-label="Q12 回答"
          placeholder="可以寫下任何想說的話，也可以空白"
        ></textarea>
        <nav class="screen-nav">
          <button type="button" class="secondary-btn" @click="prev">上一題</button>
          <button type="button" class="primary-btn" @click="next">
            {{ form.answers.q12.trim() ? "填好了" : "不填，完成" }}
          </button>
        </nav>
      </section>

      <!-- 交給工作人員 -->
      <section v-else-if="current === 'handoff'" class="screen handoff-screen">
        <div class="done-icon" aria-hidden="true"><i class="fa-solid fa-hands-holding"></i></div>
        <h1 ref="heading" tabindex="-1">謝謝您的填寫<br />請將平板交給工作人員</h1>
        <p class="handoff-note">若想修改答案，可以按「回上一題」</p>
        <nav class="screen-nav">
          <button type="button" class="secondary-btn" @click="prev">回上一題</button>
          <button type="button" class="primary-btn staff" @click="next">
            <i class="fa-solid fa-user-nurse" aria-hidden="true"></i> 工作人員：繼續填寫
          </button>
        </nav>
      </section>

      <!-- 以下由工作人員填寫 -->
      <section v-else-if="current === 'staff'" class="screen staff-screen">
        <h1 ref="heading" tabindex="-1">{{ STAFF_SECTION_TITLE }}</h1>
        <p class="staff-summary">
          填答者：{{ form.person.name }}｜Q1–Q10 已回答 {{ answeredCount }} 題（含不回答 {{ skipCount }} 題）
        </p>
        <fieldset class="big-field">
          <legend>填答方式</legend>
          <div class="mode-list">
            <label
              v-for="option in FILL_MODE_OPTIONS"
              :key="option.code"
              :class="['mode-option', { selected: form.fillMode === option.code }]"
            >
              <input v-model="form.fillMode" type="radio" name="fill-mode" :value="option.code" />
              {{ option.label }}
            </label>
          </div>
        </fieldset>
        <label class="big-field">
          <span>施測情境備註 <em class="optional">選填</em></span>
          <textarea v-model.trim="form.fillNote" rows="3" placeholder="例：民眾視力不佳，由施測者唸題"></textarea>
        </label>
        <p v-if="submitError" class="error-text" role="alert">{{ submitError }}</p>
        <nav class="screen-nav">
          <button type="button" class="secondary-btn" @click="prev">上一步</button>
          <button type="button" class="primary-btn" :disabled="submitting" @click="submit">送出</button>
        </nav>
      </section>

      <!-- 完成 -->
      <section v-else-if="current === 'done'" class="screen done-screen">
        <div class="done-icon" aria-hidden="true"><i class="fa-solid fa-check"></i></div>
        <h1 ref="heading" tabindex="-1">評估已送出（{{ created?.code }}）</h1>
        <div class="done-actions">
          <button type="button" class="primary-btn" @click="reset">填寫下一份</button>
          <button v-if="canOpen('/admin/assessments')" type="button" class="secondary-btn" @click="$router.push('/admin/assessments')">前往評估列表</button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { startPageTour } from "../services/tourController.js";
import { useCanOpen } from "../composables/useCanOpen.js";
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ANSWER_OPTIONS,
  EXCLUSIVE_Q11_CODES,
  FILL_MODE_OPTIONS,
  FORM_TITLE,
  INTRO_EMPHASIS,
  INTRO_PARAGRAPHS,
  QUESTIONS,
  Q11_GROUPS,
  Q11_TEXT,
  Q11_TITLE,
  Q12_TEXT,
  SECTION_ONE_INSTRUCTION,
  SECTION_ONE_TITLE,
  STAFF_SECTION_TITLE,
} from "../config/assessmentForm.js";
import { createAssessment } from "../services/assessmentService.js";
import { goBack } from "../utils/navigation.js";

const router = useRouter();
// 導向沒有權限的頁面的連結與按鈕一律不顯示
const canOpen = useCanOpen();

const QUESTION_KEYS = QUESTIONS.map((q) => q.key);
const STEPS = ["intro", "person", ...QUESTION_KEYS, "q11", "q12", "handoff", "staff", "done"];
const QUESTION_TOTAL = QUESTIONS.length + 2;

const emptyForm = () => ({
  person: { name: "", nationalId: "" },
  answers: { ...Object.fromEntries(QUESTION_KEYS.map((k) => [k, ""])), q11: [], q12: "" },
  fillMode: "self",
  fillNote: "",
});

const form = reactive(emptyForm());

const stepIndex = ref(0);
const q11Skipped = ref(false);
const hint = ref("");
const submitting = ref(false);
const submitError = ref("");
const created = ref(null);
const heading = ref(null);
const answerGroup = ref(null);

const current = computed(() => STEPS[stepIndex.value]);
const currentQuestion = computed(() => QUESTIONS.find((q) => q.key === current.value) ?? null);
const questionNumber = computed(() => {
  const i = [...QUESTION_KEYS, "q11", "q12"].indexOf(current.value);
  return i >= 0 ? i + 1 : 0;
});
const answeredCount = computed(() => QUESTION_KEYS.filter((k) => form.answers[k]).length);
const skipCount = computed(() => QUESTION_KEYS.filter((k) => form.answers[k] === "skip").length);

// 換頁後把焦點移到標題，螢幕報讀器會讀出新題目
watch(stepIndex, async () => {
  hint.value = "";
  await nextTick();
  heading.value?.focus();
  window.scrollTo({ top: 0 });
});

// 尚未作答時不換頁，改顯示溫和提示並把畫面帶到選項
// 不自動視為「不回答」：長者可能只是漏按或按到旁邊，悄悄記成不回答會讓判讀人員誤解；
// 「不回答」本身就是一個明確的大按鈕，想跳過的民眾按它即可
const missingAnswerHint = () => {
  if (current.value === "person" && !form.person.name) return "請先填寫您的姓名";
  if (QUESTION_KEYS.includes(current.value) && !form.answers[current.value]) {
    return "這一題還沒有選擇喔。請選「是」或「否」；不想回答，可以按「不回答」。";
  }
  if (current.value === "q11" && !form.answers.q11.length && !q11Skipped.value) {
    return "這一題還沒有勾選喔。可以勾選需要的項目，或最下面的「目前沒有其他需要」；不想回答，可以按「不回答」。";
  }
  return "";
};

const next = async () => {
  hint.value = missingAnswerHint();
  if (hint.value) {
    await nextTick();
    answerGroup.value?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (stepIndex.value < STEPS.length - 1) stepIndex.value += 1;
};

const prev = () => {
  if (stepIndex.value > 0) stepIndex.value -= 1;
};

const answer = (code) => {
  form.answers[current.value] = code;
  hint.value = "";
};

// Q11：「若以上項目皆無需要」組的選項與其他組互斥，組內也只能擇一；「不回答」與全部互斥
const toggleQ11 = (code) => {
  hint.value = "";
  q11Skipped.value = false;
  const selected = form.answers.q11;
  if (selected.includes(code)) {
    form.answers.q11 = selected.filter((c) => c !== code);
  } else if (EXCLUSIVE_Q11_CODES.includes(code)) {
    form.answers.q11 = [code];
  } else {
    form.answers.q11 = [...selected.filter((c) => !EXCLUSIVE_Q11_CODES.includes(c)), code];
  }
};
const skipQ11 = () => {
  hint.value = "";
  q11Skipped.value = !q11Skipped.value;
  if (q11Skipped.value) form.answers.q11 = [];
};

const submit = () => {
  submitError.value = "";
  submitting.value = true;
  try {
    created.value = createAssessment({
      person: { ...form.person },
      answers: { ...form.answers, q12: form.answers.q12.trim() },
      fillMode: form.fillMode,
      fillNote: form.fillNote,
    });
    stepIndex.value += 1;
  } catch (error) {
    console.error(error);
    submitError.value = "送出失敗，請再試一次";
  } finally {
    submitting.value = false;
  }
};

const reset = () => {
  Object.assign(form, emptyForm());
  q11Skipped.value = false;
  created.value = null;
  stepIndex.value = 0;
};

const hasInput = () =>
  !!form.person.name || Object.values(form.answers).some((v) => (Array.isArray(v) ? v.length : v));

const exit = () => {
  if (current.value !== "done" && hasInput() && !confirm("尚未送出，離開後填寫內容不會保存。確定要離開嗎？")) {
    return;
  }
  goBack(router, "/");
};
</script>

<style scoped>
.fill-page {
  min-height: 100vh;
  background: #fcfaf8;
  color: #3e2723;
  font-size: 20px;
}

.fill-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: #5d4037;
  color: #fff;
}
.exit-btn {
  justify-self: start;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: #fff;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 16px;
}
.form-title {
  font-weight: 700;
  font-size: 18px;
}
.progress-text {
  justify-self: end;
  font-size: 16px;
}
.progress-bar {
  height: 6px;
  background: #efe7dc;
}
.progress-fill {
  height: 100%;
  background: #c2956e;
  transition: width 0.3s ease;
}

.fill-main {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 20px 60px;
}

.screen h1 {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.5;
  margin-bottom: 28px;
}
.screen h1:focus {
  outline: none;
}
.section-label {
  font-size: 16px;
  color: #8d6e63;
  margin-bottom: 4px;
}
.question-no {
  font-size: 18px;
  font-weight: 700;
  color: #b98158;
  margin-bottom: 8px;
}
.question-text {
  font-size: 32px !important;
}
.question-text.small {
  font-size: 26px !important;
}

.intro-text {
  font-size: 22px;
  line-height: 1.9;
  margin-bottom: 16px;
}
.intro-emphasis {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.7;
  background: #fff8e1;
  border: 2px solid #ffe082;
  border-radius: 16px;
  padding: 18px 22px;
  margin: 28px 0 36px;
  color: #6d4c00;
}

/* 輸入欄位 */
.big-field {
  display: block;
  border: none;
  padding: 0;
  margin: 0 0 28px;
}
.big-field > span,
.big-field legend {
  display: block;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 10px;
}
.big-field input,
.big-field textarea,
.big-textarea {
  width: 100%;
  font-size: 24px;
  padding: 16px 18px;
  border: 2px solid #d6ccc2;
  border-radius: 14px;
  background: #fff;
  color: #3e2723;
}
.big-field input:focus,
.big-field textarea:focus,
.big-textarea:focus {
  outline: none;
  border-color: #b98158;
  box-shadow: 0 0 0 4px rgba(185, 129, 88, 0.2);
}
.big-field small {
  display: block;
  margin-top: 8px;
  font-size: 16px;
  color: #8d6e63;
}
.required,
.optional {
  font-style: normal;
  font-size: 15px;
  font-weight: 600;
  margin-left: 6px;
}
.required {
  color: #c62828;
}
.optional {
  color: #a1887f;
}

/* 是／否／不回答 */
.answer-list {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}
.answer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 80px;
  border-radius: 18px;
  border: 3px solid #d6ccc2;
  background: #fff;
  font-size: 30px;
  font-weight: 800;
  color: #3e2723;
  transition: background 0.15s, border-color 0.15s;
}
.answer-btn.skip {
  min-height: 64px;
  font-size: 22px;
  font-weight: 600;
  color: #6d4c41;
}
.answer-btn.selected {
  border-color: #5d4037;
  background: #5d4037;
  color: #fff;
}
.answer-btn:focus-visible,
.choice-btn:focus-visible,
.primary-btn:focus-visible,
.secondary-btn:focus-visible {
  outline: 3px solid #c2956e;
  outline-offset: 3px;
}

/* 尚未作答的提示：溫和的提醒色，不用紅色警告 */
.gentle-hint {
  font-size: 20px;
  line-height: 1.6;
  color: #6d4c00;
  background: #fff8e1;
  border: 2px solid #ffe082;
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 24px;
}

/* Q11 分組複選 */
.q11-group {
  border: none;
  padding: 0;
  margin: 0 0 22px;
  display: grid;
  gap: 10px;
}
.q11-group legend {
  font-size: 20px;
  font-weight: 800;
  color: #5d4037;
  margin-bottom: 10px;
  padding-bottom: 4px;
  border-bottom: 2px solid #efe7dc;
  width: 100%;
}
.choice-btn {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  min-height: 72px;
  padding: 14px 18px;
  border-radius: 14px;
  border: 2px solid #d6ccc2;
  background: #fff;
  color: #3e2723;
  text-align: left;
}
.choice-btn i {
  font-size: 28px;
  color: #a1887f;
  margin-top: 2px;
}
.choice-btn strong {
  display: block;
  font-size: 22px;
  line-height: 1.4;
}
.choice-btn small {
  display: block;
  font-size: 17px;
  line-height: 1.5;
  color: #6d4c41;
  margin-top: 4px;
}
.choice-btn.selected {
  border-color: #5d4037;
  background: #f5ede6;
}
.choice-btn.selected i {
  color: #5d4037;
}
.choice-btn.skip {
  margin-bottom: 28px;
}

.big-textarea {
  margin-bottom: 36px;
  line-height: 1.6;
}

/* 交給工作人員 */
.handoff-screen {
  text-align: center;
  padding-top: 32px;
}
.handoff-screen h1 {
  font-size: 34px;
}
.handoff-note {
  font-size: 18px;
  color: #8d6e63;
  margin-bottom: 36px;
}
.primary-btn.staff {
  background: #5d4037;
}

/* 工作人員 */
.staff-screen {
  border-top: 6px solid #8d6e63;
  padding-top: 24px;
}
.staff-summary {
  font-size: 17px;
  color: #6d4c41;
  background: #f5f0ed;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 24px;
}
.mode-list {
  display: grid;
  gap: 10px;
}
.mode-option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 10px 18px;
  border: 2px solid #d6ccc2;
  border-radius: 12px;
  background: #fff;
  font-size: 20px;
  cursor: pointer;
}
.mode-option.selected {
  border-color: #5d4037;
  background: #f5ede6;
}
.mode-option input {
  width: 22px;
  height: 22px;
  accent-color: #5d4037;
}

/* 按鈕 */
.screen-nav,
.done-actions {
  display: flex;
  gap: 14px;
}
.primary-btn,
.secondary-btn {
  flex: 1;
  min-height: 64px;
  border-radius: 14px;
  font-size: 22px;
  font-weight: 700;
}
.primary-btn {
  border: none;
  background: #2e7d32;
  color: #fff;
}
.primary-btn:disabled {
  background: #c8c1bb;
  cursor: not-allowed;
}
.secondary-btn {
  border: 2px solid #d6ccc2;
  background: #fff;
  color: #5d4037;
  flex: 0 0 auto;
  padding: 0 28px;
}
.screen > .primary-btn {
  width: 100%;
}
.error-text {
  color: #c62828;
  font-size: 18px;
  margin-bottom: 16px;
}

/* 完成 */
.done-screen {
  text-align: center;
  padding-top: 40px;
}
.done-icon {
  width: 110px;
  height: 110px;
  margin: 0 auto 28px;
  border-radius: 50%;
  background: #2e7d32;
  color: #fff;
  font-size: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.handoff-screen .done-icon {
  background: #8d6e63;
}
.done-actions .secondary-btn {
  flex: 1;
}

@media (max-width: 600px) {
  .fill-page {
    font-size: 18px;
  }
  .screen h1,
  .question-text,
  .question-text.small {
    font-size: 24px !important;
  }
  .form-title {
    display: none;
  }
  .fill-header {
    grid-template-columns: 1fr 1fr;
  }
  .screen-nav {
    flex-direction: column-reverse;
  }
  .secondary-btn {
    flex: 1;
  }
}

/* 工作人員手動開啟導覽的小連結（這一頁沒有右下角的「?」按鈕） */
.tour-link-row {
  margin: 18px 0 0;
  text-align: center;
}

.tour-link {
  border: none;
  background: transparent;
  color: #607d8b;
  font-size: 14px;
  text-decoration: underline;
}
</style>
