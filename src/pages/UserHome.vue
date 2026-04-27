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
          <button class="search-btn">
            <i class="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="container mt-n4">
      <div class="category-grid">
        <div
          v-for="cat in categories"
          :key="cat.name"
          class="cat-item"
          :class="{ active: selectedCategory === cat.name }"
          @click="toggleCategory(cat.name)"
        >
          <div class="cat-icon">
            <i class="fa-solid" :class="cat.icon"></i>
          </div>
          <span>{{ cat.name }}</span>
        </div>
      </div>
    </div>

    <div class="container mt-4">
      <div class="section-title">
        <h3><i class="fa-solid fa-fire"></i> 熱門社區活動</h3>
       
      </div>
      <div v-if="upcomingEvents.length === 0" class="empty-state">
        目前沒有熱門活動
      </div>

      <div v-else class="event-slider-wrapper">
        <div v-for="event in upcomingEvents" :key="event.id" class="event-card">
          <div class="event-tag">{{ event.type }}</div>
          <div class="event-info">
            <h4>{{ event.name }}</h4>
            <p><i class="fa-solid fa-calendar-days"></i> {{ event.date }} {{ event.time }}</p>
            <p><i class="fa-solid fa-location-dot"></i> {{ event.location }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="container mt-4">
      <div class="section-title">
        <h3><i class="fa-solid fa-location-dot"></i> 附近的社區資源</h3>
        
      </div>
      <div v-if="filteredResources.length === 0" class="empty-state">
        {{ searchText ? "找不到相關資源" : "目前沒有可用資源" }}
      </div>

      <div v-else class="resource-list">
        <div
          v-for="res in filteredResources"
          :key="res.id"
          class="res-item"
          @click="goDetail(res)"
        >
          <div class="res-img">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <div class="res-details">
            <h5>{{ res.name }}</h5>
            <div class="risk" :class="res.risk">
              <i class="fa-solid" :class="riskIconMap[res.risk]"></i>
              <span>{{ riskLabelMap[res.risk] }}</span>
            </div>
            <div class="res-meta">
              <span><i class="fa-solid fa-location-dot"></i> 距離 {{ res.distance }}</span>
              <span><i class="fa-solid fa-dollar-sign"></i> {{ res.price }}</span>
            </div>
            <div class="res-targets">
              <span v-for="target in res.targets" :key="target">#{{ target }}</span>
            </div>
            <div class="res-access">
              <span v-if="res.accessibility.transport"><i class="fa-solid fa-bus"></i> 大眾運輸</span>
              <span v-if="res.accessibility.barrierFree"><i class="fa-solid fa-wheelchair"></i> 無障礙</span>
              <span v-if="res.accessibility.parking"><i class="fa-solid fa-car"></i> 停車</span>
            </div>
            <div class="res-condition">
              <span v-if="res.condition.needRegister">需報名</span>
              <span v-if="res.condition.referralOnly">僅限轉介</span>
              <span v-if="res.condition.freeJoin">自由參加</span>
            </div>
            <div class="capacity" :class="res.capacity.status">
              {{ capacityLabelMap[res.capacity.status] }}
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
        <div class="nav-icon"><i class="fa-solid fa-house"></i></div>
        <span>首頁</span>
      </div>
      <div class="nav-btn">
        <div class="nav-icon"><i class="fa-solid fa-calendar-days"></i></div>
        <span>我的預約</span>
      </div>
      <div class="nav-btn">
        <div class="nav-icon"><i class="fa-solid fa-user"></i></div>
        <span>個人中心</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const searchText = ref("");
const router = useRouter();

// category-grid 使用「需求標籤（tags）」作為分類來源
const categories = [
  { name: "全部", icon: "fa-layer-group" },
  { name: "運動健身", icon: "fa-shoe-prints" },
  { name: "社交陪伴", icon: "fa-mug-hot" },
  { name: "教育學習", icon: "fa-book" },
  { name: "藝術文化", icon: "fa-palette" },
];

const selectedCategory = ref("全部");
const upcomingEvents = ref([]);
const nearResources = ref([]);

const filteredResources = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();

  return nearResources.value.filter((res) => {
    const matchKeyword =
      !keyword ||
      res.name?.toLowerCase().includes(keyword) ||
      (res.tags || []).join(" ").toLowerCase().includes(keyword) ||
      (res.targets || []).join(" ").toLowerCase().includes(keyword);

    // category-grid 使用「需求標籤」，因此只比對 tags，不包含 targets
    const matchCategory =
      selectedCategory.value === "全部" ||
      (res.tags || []).includes(selectedCategory.value);

    return matchKeyword && matchCategory;
  });
});

onMounted(() => {
  const stored = JSON.parse(localStorage.getItem("resources") || "[]");

  const activeResources = stored.filter((r) => r.status === "active");

  nearResources.value = activeResources.map((r) => ({
    id: r.id,
    name: r.name,
    tags: r.tags || [],
    targets: r.targetGroups || [],

    // 風險
    risk: r.riskLevel || "green",

    // demo 用
    distance: "附近",
    price: r.feeType || "免費",

    // accessibility 轉換（array → object）
    accessibility: {
      transport: true,
      barrierFree: (r.accessibility || []).includes("無障礙空間"),
      parking: false,
    },

    // 參與條件
    condition: {
      needRegister: r.participation === "須報名",
      referralOnly: r.participation === "僅接受轉介",
      freeJoin: r.participation === "自由參加",
    },

    // 容量
    capacity: {
      status: r.capacityStatus || "available",
    },
  }));

  // 活動先維持空
  upcomingEvents.value = [];
});

const riskIconMap = {
  green: "fa-circle-check",
  yellow: "fa-triangle-exclamation",
  red: "fa-circle-xmark",
};

const riskLabelMap = {
  green: "低風險",
  yellow: "中風險",
  red: "高風險",
};

const capacityLabelMap = {
  available: "尚有名額",
  full: "已額滿",
  waiting: "候補中",
};

const goDetail = (res) => {
  if (!res?.id) return;
  router.push(`/user/resources/${res.id}`);
};

const toggleCategory = (name) => {
  selectedCategory.value =
    selectedCategory.value === name ? "全部" : name;
};
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
.cat-item.active {
  background: #5d4037;
  color: #fff;
  border-radius: 10px;
}
.cat-icon {
  font-size: 28px;
  margin-bottom: 5px;
  color: #8d6e63;
}
.cat-item.active .cat-icon,
.cat-item.active span {
  color: #fff;
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



.resource-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  color: #a1887f;
  padding: 20px;
  font-size: 14px;
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
  font-size: 24px;
  color: #8d6e63;
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
.res-meta i {
  margin-right: 4px;
}
.res-targets span {
  color: #8d6e63;
  font-size: 11px;
  margin-right: 8px;
  font-weight: 600;
}
.risk {
  font-size: 12px;
  font-weight: 600;
  margin: 4px 0;
}
.risk i {
  margin-right: 4px;
}
.risk.green {
  color: #4caf50;
}
.risk.yellow {
  color: #ff9800;
}
.risk.red {
  color: #f44336;
}

.res-access,
.res-condition {
  font-size: 12px;
  color: #8d6e63;
  margin: 2px 0;
}
.res-access span,
.res-condition span {
  margin-right: 10px;
}
.res-access i {
  margin-right: 4px;
}

.capacity {
  font-size: 12px;
  font-weight: 600;
}
.capacity.available {
  color: #4caf50;
}
.capacity.full {
  color: #f44336;
}
.capacity.waiting {
  color: #ff9800;
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

@media (max-width: 576px) {
  .res-meta span,
  .res-access span,
  .res-condition span,
  .res-targets span {
    display: inline-block;
    margin-bottom: 2px;
  }
}
</style>