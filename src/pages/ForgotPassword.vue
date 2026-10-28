<template>
  <div class="auth-page">
    <div class="auth-card">
      <button type="button" class="brand" @click="$router.push('/')">
        <img :src="logo" alt="CareLink" class="brand-logo" />
        <span class="brand-text">CareLink</span>
      </button>
      <p class="auth-eyebrow">Forgot password</p>
      <h1>忘記密碼</h1>
      <p class="auth-desc">輸入註冊時的 Email，我們會寄出重設密碼信，信中的連結 {{ RESET_TOKEN_MINUTES }} 分鐘內有效。</p>

      <div v-if="message" class="notice-box success" role="status">{{ message }}</div>
      <form v-else class="auth-form" novalidate @submit.prevent="handleSubmit">
        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" :class="{ invalid: error }" />
          <p v-if="error" class="field-error">{{ error }}</p>
        </label>
        <button type="submit" class="btn-primary">寄出重設密碼信</button>
      </form>

      <p class="auth-footer">
        <router-link to="/mailbox" class="prototype-link">
          <span class="prototype-tag">原型展示用</span> 查看模擬信箱
        </router-link>
      </p>
      <button type="button" class="btn-text" @click="$router.push('/login')">← 回到登入</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import logo from "../assets/logo.png";
import { RESET_TOKEN_MINUTES, isEmail } from "../config/accounts.js";
import { requestPasswordReset } from "../services/accountService.js";

const email = ref("");
const error = ref("");
const message = ref("");

// 不論 Email 是否存在都顯示相同訊息，避免透露哪些 Email 有帳號
const handleSubmit = () => {
  if (!isEmail(email.value)) {
    error.value = "請輸入正確的 Email";
    return;
  }
  error.value = "";
  message.value = requestPasswordReset(email.value).message;
};
</script>

<style scoped src="../styles/authPage.css"></style>
