<template>
  <!-- 歡迎卡片（原型展示用）：每個角色第一次登入時顯示；可左右切換（按鈕、方向鍵、滑動） -->
  <Teleport to="body">
    <div v-if="welcomeState.role" class="welcome-backdrop" @keydown="onKeydown">
      <section
        ref="dialogEl"
        class="welcome-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        tabindex="-1"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <p class="welcome-role">{{ roleLabel }}｜歡迎使用 CareLink</p>
        <h2 id="welcome-title">{{ card.title }}</h2>
        <p class="welcome-text">{{ card.text }}</p>

        <div class="dots" role="tablist" aria-label="歡迎卡片">
          <button
            v-for="(c, i) in welcomeState.cards"
            :key="i"
            type="button"
            role="tab"
            :aria-selected="i === index"
            :aria-label="`第 ${i + 1} 張：${c.title}`"
            :class="['dot', { active: i === index }]"
            @click="index = i"
          ></button>
        </div>

        <div class="welcome-actions">
          <button v-if="!isLast" type="button" class="skip-btn" @click="finish">略過</button>
          <span class="spacer"></span>
          <button v-if="index > 0" type="button" class="prev-btn" @click="index -= 1">上一步</button>
          <button type="button" class="next-btn" @click="next">{{ isLast ? "開始導覽" : "下一步" }}</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { getRoleLabel } from "../config/roles.js";
import { closeWelcome, welcomeState } from "../services/tourController.js";

const index = ref(0);
const dialogEl = ref(null);
const card = computed(() => welcomeState.cards[index.value] ?? { title: "", text: "" });
const isLast = computed(() => index.value === welcomeState.cards.length - 1);
const roleLabel = computed(() => getRoleLabel(welcomeState.role));

// 開啟時回到第一張，並把焦點移到卡片上（方向鍵與 Esc 可直接使用）
watch(
  () => welcomeState.role,
  async (role) => {
    if (!role) return;
    index.value = 0;
    await nextTick();
    dialogEl.value?.focus();
  }
);

// 看完或略過：記為已看過，接著開始這一頁的導覽
const finish = () => closeWelcome();
const next = () => (isLast.value ? finish() : (index.value += 1));
const prev = () => {
  if (index.value > 0) index.value -= 1;
};

const onKeydown = (event) => {
  if (event.key === "ArrowRight") next();
  else if (event.key === "ArrowLeft") prev();
  else if (event.key === "Escape") finish();
};

// 左右滑動切換（手機）
let touchX = null;
const onTouchStart = (event) => {
  touchX = event.changedTouches[0].clientX;
};
const onTouchEnd = (event) => {
  if (touchX === null) return;
  const dx = event.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) < 40) return;
  if (dx < 0) next();
  else prev();
};
</script>

<style scoped>
.welcome-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(38, 50, 56, 0.6);
}

.welcome-card {
  width: min(440px, 100%);
  padding: 26px 24px 20px;
  border-radius: 20px;
  background: #fff;
  border-top: 6px solid #37474f;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  outline: none;
  color: #263238;
}

.welcome-role {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #607d8b;
}

.welcome-card h2 {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 800;
}

.welcome-text {
  min-height: 72px;
  margin: 0;
  font-size: 16px;
  line-height: 1.75;
  color: #37474f;
}

.dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 18px 0 14px;
}

.dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #cfd8dc;
}

.dot.active {
  width: 24px;
  border-radius: 999px;
  background: #37474f;
}

.welcome-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spacer {
  flex: 1;
}

.skip-btn,
.prev-btn,
.next-btn {
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
}

.skip-btn {
  border: none;
  background: transparent;
  color: #607d8b;
}

.prev-btn {
  border: 1px solid #b0bec5;
  background: #fff;
  color: #37474f;
}

.next-btn {
  border: none;
  background: #37474f;
  color: #fff;
}

.next-btn:hover {
  background: #263238;
}

.dot:focus-visible,
.skip-btn:focus-visible,
.prev-btn:focus-visible,
.next-btn:focus-visible {
  outline: 3px solid #90caf9;
  outline-offset: 2px;
}
</style>
