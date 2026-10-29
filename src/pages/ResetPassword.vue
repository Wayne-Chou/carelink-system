<template>
  <div class="auth-page">
    <div class="auth-card">
      <button type="button" class="brand" @click="$router.push('/')">
        <img :src="logo" alt="CareLink" class="brand-logo" />
        <span class="brand-text">CareLink</span>
      </button>
      <p class="auth-eyebrow">{{ isSetup ? "Set password" : "Reset password" }}</p>
      <h1>{{ isSetup ? "設定密碼" : "重設密碼" }}</h1>

      <!-- 設定完成 -->
      <template v-if="done">
        <div class="notice-box success" role="status">密碼已{{ isSetup ? "設定" : "重設" }}，請使用新密碼登入。</div>
        <button type="button" class="btn-primary w-100 mt-3" @click="$router.replace('/login')">前往登入</button>
      </template>

      <!-- 連結無效、已使用或已過期 -->
      <template v-else-if="!check.ok">
        <div class="notice-box warning" role="alert">{{ check.error }}</div>
        <p class="auth-footer">
          <router-link to="/forgot-password">前往「忘記密碼」重新取得連結</router-link>
        </p>
      </template>

      <template v-else>
        <p class="auth-desc">
          {{ check.name }}（{{ check.email }}）您好，請設定新密碼。密碼需{{ PASSWORD_RULE_TEXT }}。
        </p>
        <form class="auth-form" data-tour="reset-form" novalidate @submit.prevent="handleSubmit">
          <label class="field">
            <span>新密碼</span>
            <div class="password-field">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :class="{ invalid: error }"
              />
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
                @click="showPassword = !showPassword"
              >
                <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" aria-hidden="true"></i>
              </button>
            </div>
          </label>
          <label class="field">
            <span>確認新密碼</span>
            <input
              v-model="passwordConfirm"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :class="{ invalid: error }"
            />
          </label>
          <p v-if="error" class="error-msg" role="alert">{{ error }}</p>
          <button type="submit" class="btn-primary">{{ isSetup ? "設定密碼" : "重設密碼" }}</button>
        </form>
      </template>

      <button type="button" class="btn-text" data-tour="reset-back" @click="$router.push('/login')">← 回到登入</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import logo from "../assets/logo.png";
import { PASSWORD_RULE_TEXT } from "../config/accounts.js";
import { checkResetToken, resetPassword } from "../services/accountService.js";

// 設定密碼（審核通過、系統管理員建立帳號）與重設密碼（忘記密碼）共用這一頁：/reset-password?token=…
const route = useRoute();
const token = typeof route.query.token === "string" ? route.query.token : "";
const check = ref(checkResetToken(token));
const isSetup = computed(() => check.value.purpose === "setup");

const password = ref("");
const passwordConfirm = ref("");
const showPassword = ref(false);
const error = ref("");
const done = ref(false);

const handleSubmit = () => {
  const result = resetPassword(token, password.value, passwordConfirm.value);
  if (!result.ok) {
    error.value = result.error;
    // 連結在填寫期間過期或已被使用時，改顯示連結狀態
    const latest = checkResetToken(token);
    if (!latest.ok) check.value = latest;
    return;
  }
  done.value = true;
};
</script>

<style scoped src="../styles/authPage.css"></style>
