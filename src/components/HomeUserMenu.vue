<template>
  <!-- 民眾首頁 header 的使用者選單：使用者圖示，點開顯示姓名、角色與登出（後台的上方列另用 UserMenu） -->
  <div v-if="user" ref="rootEl" class="home-user-menu">
    <button
      type="button"
      class="user-icon-btn"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-controls="home-user-panel"
      :aria-label="`${user.name}的帳號選單`"
      @click="open = !open"
    >
      <i class="fa-solid fa-circle-user" aria-hidden="true"></i>
    </button>
    <div v-if="open" id="home-user-panel" class="user-panel" role="menu">
      <p class="panel-name">{{ user.name }}</p>
      <p v-if="roleLabel" class="panel-role">{{ roleLabel }}</p>
      <button type="button" role="menuitem" class="logout-btn" @click="logout">
        <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i> 登出
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { getRoleLabel } from "../config/roles.js";
import { clearCurrentUser, getCurrentUser } from "../utils/auth.js";

// 登出後通知首頁（首頁仍停在原頁，由首頁清除畫面上的登入者）
const emit = defineEmits(["logout"]);

const user = getCurrentUser();
const roleLabel = computed(() => getRoleLabel(user?.role));
const open = ref(false);
const rootEl = ref(null);

const logout = () => {
  open.value = false;
  clearCurrentUser();
  emit("logout");
};

// 點選單以外的地方或按 Esc 關閉
const onDocumentClick = (event) => {
  if (open.value && !rootEl.value?.contains(event.target)) open.value = false;
};
const onKeydown = (event) => {
  if (event.key === "Escape") open.value = false;
};
onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.home-user-menu {
  position: relative;
  flex-shrink: 0;
}

.user-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #5d4037;
  font-size: 28px;
  cursor: pointer;
}

.user-icon-btn:hover,
.user-icon-btn[aria-expanded="true"] {
  color: #b98158;
}

.user-icon-btn:focus-visible,
.logout-btn:focus-visible {
  outline: 3px solid #c8a27c;
  outline-offset: 2px;
}

/* 下拉面板：只有面板浮在畫面上，不影響 header 的排列 */
.user-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 10;
  min-width: 200px;
  max-width: calc(100vw - 32px);
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eadfd8;
  box-shadow: 0 10px 28px rgba(62, 39, 35, 0.15);
}

.panel-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #3e2723;
  overflow-wrap: anywhere;
}

.panel-role {
  margin: 2px 0 0;
  font-size: 13px;
  color: #8d6e63;
}

.logout-btn {
  width: 100%;
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px solid #c2956e;
  border-radius: 8px;
  background: #fff;
  color: #5d4037;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.logout-btn:hover {
  background: #faf6f2;
}
</style>
