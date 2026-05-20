<template>
  <div class="auth-page">
    <div class="auth-card">
      <button type="button" class="brand" @click="goHome">
        <img :src="logo" alt="CareLink" class="brand-logo" />
        <span class="brand-text">CareLink</span>
      </button>
      <p class="auth-eyebrow">Join us</p>
      <h1>註冊</h1>
      <p class="auth-desc">建立帳號，開始使用 CareLink 社區資源平台</p>
      <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>姓名</span>
          <input v-model="name" type="text" required placeholder="請輸入姓名" />
        </label>
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
        <button type="submit" class="btn-primary">註冊</button>
      </form>
      <p class="auth-footer">
        已有帳號？
        <router-link to="/login">立即登入</router-link>
      </p>
      <button type="button" class="btn-text" @click="goHome">返回首頁</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import logo from "../assets/logo.png";
import { register } from "../utils/auth.js";

const router = useRouter();
const name = ref("");
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");

const goHome = () => router.push("/");

const handleSubmit = () => {
  error.value = "";
  const result = register({
    name: name.value,
    email: email.value,
    password: password.value,
  });
  if (!result.ok) {
    error.value = result.error;
    return;
  }
  router.push("/");
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
