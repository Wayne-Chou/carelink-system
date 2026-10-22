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
      <form class="auth-form" @submit.prevent="handleSubmit">
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
        <p v-if="error" class="error-msg" role="alert">{{ error }}</p>
        <button type="submit" class="btn-primary">登入</button>
      </form>
      <!-- 示範帳號：點一下帶入 Email 與密碼 -->
      <section class="demo-accounts" aria-labelledby="demo-accounts-title">
        <h2 id="demo-accounts-title">示範帳號</h2>
        <p class="demo-note">示範帳號僅供展示，點一下即可帶入；密碼皆為 {{ DEMO_PASSWORD }}</p>
        <!-- 依角色分組：系統管理員、判讀人員、健康管理員、資源點（標示各自綁定的資源） -->
        <div v-for="group in demoGroups" :key="group.role" class="demo-group">
          <h3>{{ group.label }}<span v-if="group.accounts.length > 1">（{{ group.accounts.length }} 個）</span></h3>
          <ul>
            <li v-for="account in group.accounts" :key="account.email">
              <button
                type="button"
                :class="['demo-account', { selected: email === account.email }]"
                @click="useDemo(account)"
              >
                <span>{{ account.email }}</span>
                <small>{{ demoDescription(account) }}</small>
              </button>
            </li>
          </ul>
        </div>
      </section>
      <!-- 示範情境：載入後自動帶入這一步操作者的示範帳號 -->
      <ScenarioLoader class="scenario-loader-box" @loaded="onScenarioLoaded" />
      <p class="auth-footer">
        還沒有帳號？
        <router-link to="/register">立即註冊</router-link>
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
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES } from "../config/roles.js";
import ScenarioLoader from "../components/ScenarioLoader.vue";
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

const handleSubmit = () => {
  error.value = "";
  const result = login({ email: email.value, password: password.value });
  if (!result.ok) {
    error.value = result.error;
    return;
  }
  // 原本被擋下的頁面有權限就回去；否則依角色到預設頁（資源點直接進入資源端後台）
  const redirect = typeof route.query.redirect === "string" ? router.resolve(route.query.redirect) : null;
  router.replace(landingPathFor(result.user, redirect, { findAssessment: getAssessmentById }));
};

const demoDescription = (account) => {
  if (account.role === "admin") return "全部頁面與功能";
  if (account.role === "reader") return `${account.name}（醫師）`;
  if (account.role === "provider") return `綁定 ${account.resourceLabel}（窗口 ${account.name}）`;
  return account.name;
};
const demoGroups = ROLES.map((r) => ({
  role: r.code,
  label: r.label,
  accounts: DEMO_ACCOUNTS.filter((a) => a.role === r.code),
})).filter((g) => g.accounts.length);

const onScenarioLoaded = ({ email: operatorEmail }) => {
  const account = DEMO_ACCOUNTS.find((a) => a.email === operatorEmail);
  if (account) useDemo(account);
};

const useDemo = (account) => {
  email.value = account.email;
  password.value = account.password;
  error.value = "";
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

.demo-accounts {
  margin-top: 24px;
  padding: 16px;
  border-radius: 14px;
  background: #faf6f2;
  border: 1px dashed #d7c2ad;
}

.demo-accounts h2 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: #5d4037;
}

.demo-note {
  margin: 0 0 10px;
  font-size: 12px;
  color: #8d6e63;
}

.demo-group + .demo-group {
  margin-top: 10px;
}

.demo-group h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #8a5a3c;
}

.demo-group h3 span {
  font-weight: 400;
}

.demo-accounts ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.demo-account {
  width: 100%;
  display: grid;
  gap: 2px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #eadbcd;
  background: #fff;
  color: #5d4037;
  cursor: pointer;
}

.demo-account strong {
  font-size: 14px;
}

.demo-account span {
  font-size: 13px;
  font-family: "Courier New", monospace;
}

.demo-account small {
  font-size: 12px;
  color: #8d6e63;
}

.demo-account:hover,
.demo-account.selected {
  border-color: #c2956e;
  background: #fff8f2;
}

.scenario-loader-box {
  margin-top: 16px;
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
</style>
