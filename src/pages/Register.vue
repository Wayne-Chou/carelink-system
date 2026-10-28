<template>
  <div class="auth-page">
    <div class="auth-card wide">
      <button type="button" class="brand" @click="goHome">
        <img :src="logo" alt="CareLink" class="brand-logo" />
        <span class="brand-text">CareLink</span>
      </button>

      <!-- 送出後：說明需等候審核 -->
      <template v-if="submitted">
        <p class="auth-eyebrow">Application sent</p>
        <h1>已送出申請</h1>
        <div class="notice-box success" role="status">
          <p class="mb-2">
            {{ submitted.name }} 您好，我們已收到您申請「{{ getRoleLabel(submitted.role) }}」帳號的資料，帳號狀態為「待審核」。
          </p>
          <p class="mb-0">
            系統管理員審核後，結果會以 Email 通知（{{ submitted.email }}）。審核通過時會寄出設定密碼的連結，設定密碼後即可登入。
          </p>
        </div>
        <p class="auth-footer">
          <router-link to="/mailbox" class="prototype-link">
            <span class="prototype-tag">原型展示用</span> 查看模擬信箱
          </router-link>
        </p>
        <button type="button" class="btn-text" @click="goHome">回到首頁</button>
      </template>

      <template v-else>
        <p class="auth-eyebrow">Join us</p>
        <h1>{{ rejectReason !== null ? "重新申請帳號" : "申請帳號" }}</h1>
        <p class="auth-desc">
          送出後由系統管理員審核，通過後會寄出設定密碼的連結。標示 <span class="required">*</span> 的欄位必填。
        </p>
        <div v-if="rejectReason !== null" class="notice-box warning mb-3" role="note">
          已帶入上次的申請資料，請修改後重新送出（個資保護與保密同意需重新勾選）。
          <template v-if="rejectReason">上次退回原因：{{ rejectReason }}</template>
        </div>

        <form class="auth-form" novalidate @submit.prevent="handleSubmit">
          <label v-for="f in commonFields" :key="f.key" class="field">
            <span>{{ f.label }}<span class="required">*</span></span>
            <textarea
              v-if="f.key === 'reason'"
              v-model="form.reason"
              rows="3"
              :class="{ invalid: errors.reason }"
              placeholder="例：在範例醫院家醫科服務，需要判讀社區民眾的生活近況評估"
            ></textarea>
            <input
              v-else
              v-model="form[f.key]"
              :type="f.type"
              :placeholder="f.placeholder"
              :autocomplete="f.autocomplete"
              :class="{ invalid: errors[f.key] }"
            />
            <small v-if="f.hint" class="field-hint">{{ f.hint }}</small>
            <p v-if="errors[f.key]" class="field-error">{{ errors[f.key] }}</p>
          </label>

          <label class="field">
            <span>申請角色<span class="required">*</span></span>
            <select v-model="form.role" :class="{ invalid: errors.role }">
              <option value="" disabled>請選擇角色</option>
              <option v-for="r in roleOptions" :key="r.code" :value="r.code">{{ r.label }}</option>
            </select>
            <small v-if="selectedRole" class="field-hint">{{ selectedRole.description }}</small>
            <small class="field-hint">系統管理員、資源管理員不開放申請，由系統管理員建立</small>
            <p v-if="errors.role" class="field-error">{{ errors.role }}</p>
          </label>

          <!-- 依申請角色的額外欄位 -->
          <label v-for="f in detailFields" :key="`${form.role}-${f.key}`" class="field">
            <span>{{ f.label }}<span v-if="f.required" class="required">*</span><small v-else class="field-hint">（選填）</small></span>
            <select
              v-if="f.type === 'select'"
              v-model="form.details[form.role][f.key]"
              :class="{ invalid: detailError(f.key) }"
            >
              <option value="" disabled>請選擇</option>
              <option v-for="o in f.options" :key="o.code" :value="o.code">{{ o.label }}</option>
            </select>
            <select
              v-else-if="f.type === 'resource'"
              v-model="form.details[form.role][f.key]"
              :disabled="!resources.length"
              :class="{ invalid: detailError(f.key) }"
            >
              <option value="" disabled>{{ resources.length ? "請選擇資源" : "目前沒有資源" }}</option>
              <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.code }} {{ r.name }}</option>
            </select>
            <input v-else v-model="form.details[form.role][f.key]" type="text" :class="{ invalid: detailError(f.key) }" />
            <small v-if="f.type === 'resource' && !resources.length" class="field-hint">
              目前沒有可綁定的資源，請先聯絡資源管理員建立資源
            </small>
            <small v-else-if="f.type === 'resource'" class="field-hint">審核通過時完成綁定，審核者可依確認結果調整</small>
            <p v-if="detailError(f.key)" class="field-error">{{ detailError(f.key) }}</p>
          </label>

          <div class="notice-box">
            <p class="mb-2"><strong>個資保護與保密同意</strong></p>
            <p class="mb-2">
              使用本平台會接觸民眾的評估、個案與聯絡資料。我同意僅在執行業務必要範圍內查看與使用，不對外洩漏、不另行複製或留存，
              並遵守個人資料保護法與所屬單位的保密規範；離職或不再承辦時，會通知系統管理員停用帳號。
            </p>
            <label class="consent">
              <input v-model="form.consent" type="checkbox" />
              我已閱讀並同意上述個資保護與保密規範<span class="required">*</span>
            </label>
            <p v-if="errors.consent" class="field-error">{{ errors.consent }}</p>
          </div>

          <p v-if="errorCount" class="error-msg" role="alert">還有 {{ errorCount }} 個欄位需要修正</p>
          <button type="submit" class="btn-primary">送出申請</button>
        </form>
        <p class="auth-footer">
          已有帳號？
          <router-link to="/login">立即登入</router-link>
        </p>
        <button type="button" class="btn-text" @click="back">← 返回</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { goBack } from "../utils/navigation.js";
import logo from "../assets/logo.png";
import { REGISTERABLE_ROLES, ROLES, getRoleLabel } from "../config/roles.js";
import { ROLE_DETAIL_FIELDS, SUPERVISOR_HINT } from "../config/accounts.js";
import { createEmptyApplication, getReapplyForm, submitApplication } from "../services/accountService.js";
import { getAllResources } from "../services/resourceService.js";

const router = useRouter();
const route = useRoute();
const back = () => goBack(router, "/");
const goHome = () => router.push("/");

// 退回信的「重新申請」連結：/register?reapply=帳號 id，帶入原本的申請資料（密碼除外）
const reapply = typeof route.query.reapply === "string" ? getReapplyForm(route.query.reapply) : null;
const form = reactive(reapply?.form ?? createEmptyApplication());
const rejectReason = reapply ? reapply.rejectReason : null;

const errors = ref({});
const errorCount = computed(() => Object.keys(errors.value).length);
const submitted = ref(null);

const commonFields = [
  { key: "name", label: "姓名", type: "text", autocomplete: "name" },
  { key: "email", label: "Email", type: "email", placeholder: "you@example.com", autocomplete: "email" },
  { key: "phone", label: "手機", type: "tel", placeholder: "0900-000-001", autocomplete: "tel" },
  { key: "organization", label: "目前任職或服務單位", type: "text", autocomplete: "organization" },
  { key: "jobTitle", label: "職稱", type: "text", autocomplete: "organization-title" },
  { key: "supervisorName", label: "目前單位主管或聯絡人姓名", type: "text" },
  { key: "supervisorContact", label: "目前單位主管或聯絡人電話或 Email", type: "text", hint: SUPERVISOR_HINT },
  { key: "reason", label: "申請理由", type: "text" },
];

// 可申請的角色：判讀人員、健康管理員、資源點（config/roles.js 的 REGISTERABLE_ROLES）
const roleOptions = ROLES.filter((r) => REGISTERABLE_ROLES.includes(r.code));
const selectedRole = computed(() => roleOptions.find((r) => r.code === form.role) ?? null);
const detailFields = computed(() => ROLE_DETAIL_FIELDS[form.role] ?? []);
const detailError = (key) => errors.value[`details.${form.role}.${key}`];

// 資源點要綁定的資源：列出目前全部資源，依資源編碼排序
const resources = getAllResources().sort((a, b) => String(a.code).localeCompare(String(b.code)));

const handleSubmit = () => {
  const result = submitApplication(form);
  if (!result.ok) {
    errors.value = result.errors;
    return;
  }
  errors.value = {};
  submitted.value = result.account;
  window.scrollTo({ top: 0 });
};
</script>

<style scoped src="../styles/authPage.css"></style>
<style scoped>
.consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
}

.consent input {
  margin-top: 4px;
}

.field > span .field-hint {
  font-weight: 400;
}
</style>
