<template>
  <div class="auth-page">
    <div class="auth-card">
      <button type="button" class="brand" @click="goHome">
        <img :src="logo" alt="CareLink" class="brand-logo" />
        <span class="brand-text">CareLink</span>
      </button>
      <p class="auth-eyebrow">Welcome back</p>
      <h1>登入</h1>
      <p class="auth-desc">登入後可管理社區資源與個案流程</p>
      <form class="auth-form" data-tour="login-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>Email</span>
          <input v-model="email" type="email" required placeholder="you@example.com" />
        </label>
        <label class="field">
          <span>密碼</span>
          <div class="password-field">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="請輸入密碼"
            />
            <button
              type="button"
              class="password-toggle"
              :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
              @click="showPassword = !showPassword"
            >
              <i
                :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                aria-hidden="true"
              ></i>
            </button>
          </div>
        </label>
        <p class="forgot-row" data-tour="login-forgot">
          <router-link to="/forgot-password">忘記密碼？</router-link>
        </p>
        <p v-if="error" class="error-msg" role="alert">{{ error }}</p>
        <button type="submit" class="btn-primary">登入</button>
      </form>

      <!-- 快速登入（示範用）：按下即以該角色的示範帳號登入，導向與一般登入相同 -->
      <section class="quick-login" data-tour="login-quick" aria-labelledby="quick-login-title">
        <h2 id="quick-login-title">快速登入（示範用）</h2>
        <div class="quick-grid">
          <button
            v-for="q in quickLogins"
            :key="q.email"
            type="button"
            class="quick-btn"
            @click="quickLogin(q)"
          >
            <strong>{{ q.label }}<span v-if="q.subtitle">：{{ q.subtitle }}</span></strong>
            <small>{{ q.description }}</small>
          </button>
        </div>
      </section>
      <p class="auth-footer" data-tour="login-register">
        還沒有帳號？
        <router-link to="/register">申請帳號</router-link>
      </p>
      <button type="button" class="btn-text" @click="back">← 返回</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { goBack } from "../utils/navigation.js";
import logo from "../assets/logo.png";
import { login } from "../utils/auth.js";
import { DEMO_ACCOUNTS, QUICK_LOGINS, getRoleLabel } from "../config/roles.js";
import { landingPathFor } from "../services/accessControl.js";
import { getAssessmentById } from "../services/assessmentService.js";

const router = useRouter();
const route = useRoute();
const back = () => goBack(router, "/");
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");

const goHome = () => router.push("/");

const signIn = (credentials) => {
  error.value = "";
  const result = login(credentials);
  if (!result.ok) {
    error.value = result.error;
    return;
  }
  // 原本被擋下的頁面有權限就回去；否則依角色到預設頁（資源點直接進入資源端後台）
  const redirect = typeof route.query.redirect === "string" ? router.resolve(route.query.redirect) : null;
  router.replace(landingPathFor(result.user, redirect, { findAssessment: getAssessmentById }));
};

const handleSubmit = () => signIn({ email: email.value, password: password.value });

// 快速登入：直接用示範帳號的 Email 與密碼登入
const quickLogins = QUICK_LOGINS.map((q) => ({ ...q, label: getRoleLabel(q.role) }));
const quickLogin = (q) => {
  const account = DEMO_ACCOUNTS.find((a) => a.email === q.email);
  if (account) signIn({ email: account.email, password: account.password });
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(180deg, #8b5e4a 0%, #f5f1ed 55%, #fffaf7 100%);
  font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 28px;
  padding: 40px 36px;
  box-shadow: 0 12px 40px rgba(62, 39, 35, 0.12);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #3e2723;
  margin-bottom: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.brand-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.brand-text {
  font-size: 16px;
  font-weight: 700;
}

.auth-eyebrow {
  font-size: 13px;
  font-weight: 600;
  color: #b98158;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.auth-card h1 {
  font-size: 28px;
  font-weight: 800;
  color: #3e2723;
  margin-bottom: 8px;
}

.auth-desc {
  color: #6d4c41;
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.6;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  font-size: 14px;
  font-weight: 600;
  color: #5d4037;
}

.field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #eadfd8;
  border-radius: 10px;
  font-size: 15px;
  color: #3e2723;
  background: rgba(255, 255, 255, 0.9);
  box-sizing: border-box;
}

.field input:focus {
  outline: none;
  border-color: #c8a27c;
  box-shadow: 0 0 0 3px rgba(185, 129, 88, 0.15);
}

.password-field {
  position: relative;
  display: flex;
  align-items: center;
}

.password-field input {
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: #8d6e63;
  font-size: 15px;
  cursor: pointer;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: #b98158;
}

.error-msg {
  color: #c62828;
  font-size: 14px;
  margin: 0;
}

.btn-primary {
  border: none;
  background: #b98158;
  color: #fff;
  padding: 12px 20px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.btn-primary:hover {
  background: #a06f4a;
  transform: translateY(-1px);
}

.quick-login {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px dashed #d7c2ad;
}

.quick-login h2 {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
  color: #5d4037;
}

.quick-grid {
  display: grid;
  gap: 8px;
}

.quick-btn {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  border: 1px solid #eadbcd;
  border-radius: 10px;
  background: #faf6f2;
  color: #5d4037;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.quick-btn strong {
  font-size: 14px;
}

.quick-btn strong span {
  font-weight: 600;
  color: #8a5a3c;
}

.quick-btn small {
  font-size: 12px;
  color: #8d6e63;
}

.quick-btn:hover,
.quick-btn:focus-visible {
  border-color: #c2956e;
  background: #fff8f2;
}

.auth-footer {
  margin-top: 20px;
  font-size: 14px;
  color: #6d4c41;
  text-align: center;
}

.auth-footer a {
  color: #b98158;
  font-weight: 600;
  text-decoration: none;
}

.auth-footer a:hover {
  text-decoration: underline;
}

.btn-text {
  display: block;
  width: 100%;
  margin-top: 12px;
  border: none;
  background: transparent;
  color: #8d6e63;
  font-size: 14px;
  cursor: pointer;
}

.btn-text:hover {
  color: #3e2723;
}

.forgot-row {
  margin: -8px 0 0;
  text-align: right;
  font-size: 13px;
}

.forgot-row a {
  color: #8d6e63;
  text-decoration: none;
}

.forgot-row a:hover {
  color: #b98158;
  text-decoration: underline;
}
</style>
