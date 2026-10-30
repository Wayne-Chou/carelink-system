<template>
  <!-- 後台版面：左側選單（依角色權限）、上方列（姓名、角色、登出）、右側內容區；手機寬度時選單收合成漢堡按鈕 -->
  <div class="admin-shell">
    <header class="admin-topbar" data-tour="admin-topbar">
      <button
        type="button"
        class="menu-toggle"
        :aria-expanded="menuOpen"
        aria-controls="admin-menu"
        aria-label="開啟選單"
        @click="menuOpen = !menuOpen"
      >
        <i class="fa-solid fa-bars" aria-hidden="true"></i>
      </button>
      <router-link v-if="canOpen(homePath)" :to="homePath" class="admin-brand">
        <img :src="logo" alt="" class="brand-logo" />
        <span>CareLink 後台</span>
      </router-link>
      <span class="spacer"></span>
      <router-link to="/" class="public-link">
        <i class="fa-solid fa-house" aria-hidden="true"></i> 回到民眾首頁
      </router-link>
      <UserMenu variant="dark" />
    </header>

    <div v-if="menuOpen" class="menu-backdrop" @click="menuOpen = false"></div>

    <div class="admin-body">
      <nav id="admin-menu" :class="['admin-menu', { open: menuOpen }]" aria-label="後台選單" data-tour="admin-menu">
        <ul>
          <li v-for="item in menu" :key="item.key">
            <router-link
              v-if="canOpen(item.path)"
              :to="item.path"
              :class="['menu-link', { active: item.key === activeKey }]"
              :aria-current="item.key === activeKey ? 'page' : undefined"
              @click="menuOpen = false"
            >
              <i :class="['fa-solid', item.icon]" aria-hidden="true"></i>
              {{ item.label }}
            </router-link>
          </li>
        </ul>
      </nav>

      <main class="admin-content">
        <p v-if="deniedNotice" class="denied-notice" role="alert">
          <i class="fa-solid fa-lock" aria-hidden="true"></i>
          {{ deniedNotice }}
          <button type="button" aria-label="關閉提示" @click="deniedNotice = ''">×</button>
        </p>
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import logo from "../assets/logo.png";
import UserMenu from "./UserMenu.vue";
import { NO_PERMISSION_MESSAGE, adminMenuFor, homePathFor } from "../services/accessControl.js";
import { getCurrentUser } from "../utils/auth.js";
import { useCanOpen } from "../composables/useCanOpen.js";
import { viewVersion } from "../utils/viewRefresh.js";

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
// 選單已依權限產生，連結仍統一經過 canOpen（與其他頁面相同的規則）
const canOpen = useCanOpen();

// 換頁或切換角色（viewVersion）後重新讀取登入者，選單跟著更新
const user = computed(() => {
  route.fullPath;
  viewVersion.value;
  return getCurrentUser();
});
const menu = computed(() => adminMenuFor(user.value));
const homePath = computed(() => homePathFor(user.value));

// 目前所在的選單項目：網址相同，或在該項目底下（例：資源管理底下的資源詳細頁），取網址最長的一項
// 後台首頁只比對自己（所有後台網址都在它底下）
const activeKey = computed(() => {
  const path = route.path;
  const matches = menu.value.filter(
    (item) => path === item.path || (item.key !== "home" && path.startsWith(`${item.path}/`))
  );
  return matches.sort((a, b) => b.path.length - a.path.length)[0]?.key ?? null;
});

// 沒有權限時路由導回後台首頁並帶 denied=1；顯示提示後把參數移除
const deniedNotice = ref("");
watch(
  () => route.query.denied,
  (denied) => {
    if (!denied) return;
    deniedNotice.value = NO_PERMISSION_MESSAGE;
    const { denied: _removed, ...query } = route.query;
    router.replace({ query });
  },
  { immediate: true }
);

const onKeydown = (event) => {
  if (event.key === "Escape" && menuOpen.value) menuOpen.value = false;
};
onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background: #f5f2ef;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  background: #3e2723;
  color: #fff;
}

.menu-toggle {
  display: none;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 18px;
}

.admin-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}

.brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.spacer {
  flex: 1;
}

.public-link {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  text-decoration: none;
  white-space: nowrap;
}

.public-link:hover {
  color: #fff;
  text-decoration: underline;
}

.admin-body {
  display: flex;
  align-items: flex-start;
}

.admin-menu {
  position: sticky;
  top: 56px;
  flex: 0 0 220px;
  height: calc(100vh - 56px);
  overflow-y: auto;
  padding: 14px 10px;
  background: #fff;
  border-right: 1px solid #eadfd8;
}

.admin-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.menu-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #5d4037;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}

.menu-link i {
  width: 18px;
  text-align: center;
  color: #8d6e63;
}

.menu-link:hover {
  background: #faf6f2;
}

.menu-link.active {
  background: #f5ece5;
  color: #3e2723;
}

.menu-link.active i {
  color: #b98158;
}

.menu-link:focus-visible,
.menu-toggle:focus-visible,
.public-link:focus-visible {
  outline: 3px solid #c8a27c;
  outline-offset: 2px;
}

.admin-content {
  flex: 1;
  min-width: 0;
}

/* 各頁原本的標題列：在後台內容區中不固定在畫面頂端（上方列已固定） */
.admin-content :deep(.top-bar) {
  position: static;
}

.denied-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff3e0;
  color: #e65100;
  font-size: 14px;
  font-weight: 600;
}

.denied-notice button {
  margin-left: auto;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 18px;
}

.menu-backdrop {
  display: none;
}

/* 手機寬度：選單收合成漢堡按鈕，點開從左側滑出 */
@media (max-width: 768px) {
  .menu-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .public-link {
    display: none;
  }

  .admin-menu {
    position: fixed;
    top: 56px;
    left: 0;
    bottom: 0;
    z-index: 130;
    height: auto;
    width: 240px;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
  }

  .admin-menu.open {
    transform: translateX(0);
  }

  .menu-backdrop {
    display: block;
    position: fixed;
    inset: 56px 0 0 0;
    z-index: 125;
    background: rgba(0, 0, 0, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .admin-menu {
    transition: none;
  }
}
</style>
