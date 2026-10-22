<script setup>
import StoryBar from "./components/StoryBar.vue";
</script>

<template>
  <StoryBar />
  <router-view />
</template>

<style>
/* 流程說明列（StoryBar）顯示時，固定或黏在頂端的 header 往下讓出說明列的高度 */
:root {
  --story-bar-height: 0px;
}

.top-bar,
.site-header {
  top: var(--story-bar-height) !important;
}
</style>
