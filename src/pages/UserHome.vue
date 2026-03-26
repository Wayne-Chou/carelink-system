<template>
  <div class="user-page">
    <div class="user-hero">
      <div class="header-nav">
        <div class="container">
          <button class="back-btn" @click="$router.push('/')">
            ← 返回角色選擇
          </button>
        </div>
      </div>
      <div class="container welcome-section">
        <h2>您好，想找什麼資源？</h2>
        <div class="search-bar">
          <input
            type="text"
            placeholder="搜尋關鍵字，例如：健走、共餐..."
            v-model="searchText"
          />
          <button class="search-btn">🔍</button>
        </div>
      </div>
    </div>

    <div class="container mt-n4">
      <div class="category-grid">
        <div v-for="cat in categories" :key="cat.name" class="cat-item">
          <div class="cat-icon">{{ cat.icon }}</div>
          <span>{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <div class="container mt-4">
      <div class="section-title">
        <h3>🔥 熱門社區活動</h3>
        <span class="more">查看更多</span>
      </div>
      <div class="event-slider-wrapper">
        <div v-for="event in upcomingEvents" :key="event.id" class="event-card">
          <div class="event-tag">{{ event.type }}</div>
          <div class="event-info">
            <h4>{{ event.name }}</h4>
            <p>📅 {{ event.date }} {{ event.time }}</p>
            <p>📍 {{ event.location }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="container mt-4">
      <div class="section-title">
        <h3>📍 附近的社區資源</h3>
        <div class="view-toggle">
          <button class="active">列表</button>
          <button>地圖</button>
        </div>
      </div>

      <div class="resource-list">
        <div
          v-for="res in nearResources"
          :key="res.id"
          class="res-item"
          @click="goDetail(res)"
        >
          <div class="res-img">
            <span>{{ res.emoji }}</span>
          </div>
          <div class="res-details">
            <h5>{{ res.name }}</h5>
            <div class="res-meta">
              <span>📏 距離 {{ res.distance }}</span>
              <span>💰 {{ res.price }}</span>
            </div>
            <div class="res-tags">
              <span v-for="tag in res.tags" :key="tag">#{{ tag }}</span>
            </div>
          </div>
          <div class="res-arrow">〉</div>
        </div>
      </div>
    </div>

    <div class="bottom-nav">
      <div class="nav-btn active">
        <div class="nav-icon">🏠</div>
        <span>首頁</span>
      </div>
      <div class="nav-btn">
        <div class="nav-icon">📅</div>
        <span>我的預約</span>
      </div>
      <div class="nav-btn">
        <div class="nav-icon">👤</div>
        <span>個人中心</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const searchText = ref("");

const categories = [
  { name: "運動健身", icon: "👟" },
  { name: "社交陪伴", icon: "☕" },
  { name: "教育學習", icon: "📚" },
  { name: "基本生活", icon: "🏠" },
  { name: "藝術文化", icon: "🎨" },
  { name: "更多", icon: "⋯" },
];

const upcomingEvents = [
  {
    id: 1,
    name: "河堤公園晨間健走",
    date: "明天",
    time: "07:00",
    location: "河堤公園入口",
    type: "運動",
  },
  {
    id: 2,
    name: "長者數位手機教學",
    date: "本週五",
    time: "14:00",
    location: "社區中心",
    type: "學習",
  },
  {
    id: 3,
    name: "週末愛心共餐",
    date: "本週六",
    time: "11:30",
    location: "社區食堂",
    type: "共餐",
  },
];

const nearResources = [
  {
    id: 1,
    name: "老友室內桌遊社",
    distance: "500m",
    price: "免費",
    emoji: "🎲",
    tags: ["社交", "室內"],
  },
  {
    id: 2,
    name: "銀髮族共餐食堂",
    distance: "800m",
    price: "$50",
    emoji: "🍱",
    tags: ["食物", "共餐"],
  },
];

const goDetail = (res) => alert(`進入「${res.name}」詳情頁`);
</script>

<style scoped>
.user-page {
  background: #fdfbf9;
  min-height: 100vh;
  padding-bottom: 100px;
}

/* Hero */
.user-hero {
  background: linear-gradient(135deg, #5d4037, #8d6e63);
  padding: 20px 0 50px;
  color: white;
  border-radius: 0 0 30px 30px;
}
.back-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}
.welcome-section h2 {
  font-size: 24px;
  margin: 20px 0;
  font-weight: 700;
}
.search-bar {
  display: flex;
  background: white;
  border-radius: 12px;
  padding: 5px 15px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
.search-bar input {
  border: none;
  flex: 1;
  padding: 10px;
  outline: none;
  font-size: 15px;
}
.search-btn {
  background: none;
  border: none;
  font-size: 18px;
}

/* 分類網格 */
.mt-n4 {
  margin-top: -30px;
}
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  background: white;
  padding: 20px;
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(93, 64, 55, 0.1);
}
.cat-item {
  text-align: center;
}
.cat-icon {
  font-size: 28px;
  margin-bottom: 5px;
}
.cat-item span {
  font-size: 13px;
  color: #5d4037;
  font-weight: 600;
}

/* Slider 對齊 */
.event-slider-wrapper {
  display: flex;
  overflow-x: auto;
  gap: 15px;
  padding: 5px 0 15px;
  scrollbar-width: none;
}
.event-slider-wrapper::-webkit-scrollbar {
  display: none;
}
.event-card {
  min-width: 260px;
  background: white;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #efe7dc;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
}

/* 列表與標題 */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.section-title h3 {
  font-size: 18px;
  font-weight: 700;
  color: #3e2723;
  margin: 0;
}
.more {
  font-size: 13px;
  color: #c2956e;
}
.view-toggle {
  background: #efe7dc;
  padding: 3px;
  border-radius: 8px;
  display: flex;
}
.view-toggle button {
  border: none;
  background: none;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 5px;
  cursor: pointer;
}
.view-toggle button.active {
  background: white;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.res-item {
  display: flex;
  align-items: center;
  background: white;
  padding: 15px;
  border-radius: 16px;
  border: 1px solid #efe7dc;
  cursor: pointer;
  transition: 0.2s;
}
.res-item:active {
  transform: scale(0.98);
  background: #fdf8f5;
}
.res-img {
  width: 52px;
  height: 52px;
  background: #fdf8f5;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  margin-right: 15px;
}
.res-details {
  flex: 1;
}
.res-details h5 {
  font-size: 16px;
  margin: 0 0 4px;
  color: #3e2723;
  font-weight: 700;
}
.res-meta {
  font-size: 12px;
  color: #a1887f;
  margin-bottom: 4px;
}
.res-meta span {
  margin-right: 10px;
}
.res-tags span {
  color: #c2956e;
  font-size: 11px;
  margin-right: 8px;
  font-weight: 500;
}
.res-arrow {
  color: #d6ccc2;
  font-weight: bold;
}

/* 底部導覽列 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  display: flex;
  justify-content: space-around;
  padding: 10px 0 25px;
  border-top: 1px solid #efe7dc;
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.05);
  z-index: 1000;
}
.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #bcaaa4;
  cursor: pointer;
  flex: 1;
}
.nav-icon {
  font-size: 22px;
}
.nav-btn span {
  font-size: 11px;
  font-weight: 600;
}
.nav-btn.active {
  color: #5d4037;
}
</style>