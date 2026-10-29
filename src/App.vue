<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import HelpButton from "./components/HelpButton.vue";
import TourManager from "./components/TourManager.vue";
import { isHelpVisible } from "./config/help.js";
import { viewVersion } from "./utils/viewRefresh.js";

const route = useRoute();
// 右下角的「?」按鈕（原型展示用）：評估填寫頁不顯示
const showHelp = computed(() => isHelpVisible(route.name));
</script>

<template>
  <!-- viewVersion 變動時重新載入目前頁面（角色預覽載入示範資料或切換角色後） -->
  <router-view v-slot="{ Component }">
    <component :is="Component" :key="viewVersion" />
  </router-view>
  <HelpButton v-if="showHelp" />
  <!-- 操作導覽：歡迎卡片與各頁聚光燈導覽（原型展示用） -->
  <TourManager />
</template>
