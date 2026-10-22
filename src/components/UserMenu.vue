<template>
  <!-- 登入者姓名、角色與登出：放在各工作頁面 header 右側，任何角色都不必回首頁就能登出 -->
  <div v-if="user" :class="['user-menu', variant]">
    <span class="user-name">
      {{ user.name }}<span v-if="roleLabel" class="user-role">｜{{ roleLabel }}</span>
    </span>
    <button type="button" class="logout-btn" @click="logout">
      <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> 登出
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { getRoleLabel } from "../config/roles.js";
import { clearCurrentUser, getCurrentUser } from "../utils/auth.js";

// variant：dark 用在深色 top-bar（白字）；light 用在淺色背景
defineProps({ variant: { type: String, default: "dark" } });
// 登出後通知所在頁面（首頁登出後仍停在首頁，需自行清除畫面上的登入者）
const emit = defineEmits(["logout"]);

const router = useRouter();
const user = getCurrentUser();
const roleLabel = computed(() => getRoleLabel(user?.role));

// 登出：清除登入狀態（含資源端選擇的資源）後回首頁
const logout = () => {
  clearCurrentUser();
  emit("logout");
  router.push("/");
};
</script>

<style scoped>
.user-menu {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
}

.user-role {
  font-weight: 400;
  opacity: 0.8;
}

.logout-btn {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  background: none;
}

.user-menu.dark {
  color: #fff;
}

.user-menu.dark .logout-btn {
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
}

.user-menu.light {
  color: #5d4037;
}

.user-menu.light .logout-btn {
  border: 1px solid #c2956e;
  color: #5d4037;
}

.logout-btn:hover {
  opacity: 0.85;
}

/* 手機寬度只留登出按鈕 */
@media (max-width: 576px) {
  .user-name {
    display: none;
  }
}
</style>
