<template>
  <div class="platform-home">
    <!-- Navbar -->
    <header class="site-header">
      <div class="container header-inner">
        <a href="#" class="brand" @click.prevent="scrollToTop">
          <img :src="logo" alt="CareLink" class="brand-logo" />
          <span class="brand-text">CareLink 社區資源平台</span>
        </a>
        <nav class="header-nav">
          <a href="#near-me" @click.prevent="scrollTo('near-me')">附近服務</a>
          <a href="#region" @click.prevent="scrollTo('region')">行政區</a>
          <a href="#useful-info" @click.prevent="scrollTo('useful-info')">實用資訊</a>
          <a href="#categories" @click.prevent="scrollTo('categories')">服務分類</a>
          <template v-if="!currentUser">
            <button type="button" class="btn-auth-link" @click="goLogin">登入</button>
            <button type="button" class="btn-admin" @click="goRegister">註冊</button>
          </template>
          <template v-else>
            <span class="header-user-name">{{ currentUser.name }}</span>
            <button
              v-if="currentUser.role === 'admin'"
              type="button"
              class="btn-admin"
              @click="goList"
            >
              資源管理
            </button>
            <button type="button" class="btn-auth-link" @click="logout">登出</button>
          </template>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section
      class="hero-section"
      :style="{ '--hero-bg-image': `url(${heroBg})` }"
    >
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="hero-eyebrow">社區資源連結 · 健康促進</p>
          <h1>找到適合你的社區資源</h1>
          <p class="hero-desc">
            提供長者、照顧者與社區民眾快速查找健康、社交與支持服務。
          </p>
          <form class="hero-search" @submit.prevent="handleSearch">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              v-model="searchText"
              type="search"
              placeholder="搜尋健走、共餐、心理支持..."
              aria-label="搜尋社區資源"
            />
            <button type="submit">搜尋</button>
          </form>
          <div class="hero-chips">
            <button
              type="button"
              class="hero-chip"
              @click="searchText = '健康促進'; handleSearch()"
            >
              健康促進
            </button>
            <button
              type="button"
              class="hero-chip"
              @click="searchText = '共餐'; handleSearch()"
            >
              共餐活動
            </button>
            <button
              type="button"
              class="hero-chip"
              @click="searchText = '心理支持'; handleSearch()"
            >
              心理支持
            </button>
            <button
              type="button"
              class="hero-chip"
              @click="searchText = '長者運動'; handleSearch()"
            >
              長者運動
            </button>
          </div>
          <p class="hero-hint">
            或依
            <a href="/explore" @click.prevent="goExplore()">精選資源</a>
            瀏覽
          </p>
        </div>

      </div>
    </section>

    <!-- Provider quick actions (logged in only) -->
    <section
      v-if="currentUser"
      class="provider-quick-section"
      aria-label="登入後快捷工作區"
    >
      <div class="container">
        <div class="provider-quick-panel">
          <p class="provider-quick-greeting">
            歡迎回來，<strong>{{ currentUser.name }}</strong>
          </p>
          <div class="provider-quick-actions">
            <button type="button" class="provider-quick-btn" @click="goList">
              <i class="fa-solid fa-list" aria-hidden="true"></i>
              管理資源
            </button>
            <button type="button" class="provider-quick-btn" @click="goForm">
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
              新增資源
            </button>
            <button type="button" class="provider-quick-btn" @click="goCases">
              <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
              個案管理
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Platform quick access -->
    <section id="platform-quick" class="section platform-quick-section">
      <div class="container">
        <div class="platform-quick-head">
          <p class="section-eyebrow">Start here</p>
          <h2 class="platform-quick-title">我想找</h2>
        </div>
        <div class="quick-chips">
          <button
            v-for="topic in quickTopics"
            :key="topic.label"
            type="button"
            class="quick-chip"
            @click="quickSearch(topic.query)"
          >
            {{ topic.label }}
          </button>
        </div>
        <div class="platform-meta">
          <p class="platform-stat">
            <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
            目前已上架 <strong>{{ activeResourceCount }}</strong> 個社區資源
          </p>
          <div class="hot-districts">
            <span class="hot-label">熱門行政區</span>
            <button
              v-for="d in hotDistricts"
              :key="d"
              type="button"
              class="hot-district-btn"
              @click="selectHotDistrict(d)"
            >
              {{ d }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- What's near me? -->
    <section id="near-me" class="section near-section section--primary">
      <div class="container">
        <div class="section-head">
          <p class="section-eyebrow">What's near me?</p>
          <h2>尋找附近的社區服務</h2>
          <p>輸入地址或地標，快速找到離您最近的資源與據點</p>
        </div>
        <div class="near-grid">
          <div class="near-form">
            <label class="field-label" for="address-input">地址或地標</label>
            <input
              id="address-input"
              v-model="addressSearch"
              type="text"
              class="field-input"
              placeholder="例如：板橋車站、中和四號橋、新店區公所..."
              @keyup.enter="handleAddressSearch"
            />
            <div class="near-actions">
              <button type="button" class="btn-primary" @click="handleAddressSearch">
                搜尋附近
              </button>
              <button type="button" class="btn-secondary" @click="useCurrentLocation">
                <i class="fa-solid fa-location-crosshairs"></i>
                使用目前位置
              </button>
            </div>
          </div>
          <div class="near-aside">
            <div class="tip-card tip-card-large">
              <div class="tip-icon"><i class="fa-solid fa-map-location-dot"></i></div>
              <h3>地區型服務平台</h3>
              <p>
                CareLink 依行政區與地理位置整理社區資源，協助您找到可及的健康、社交與照護服務。
              </p>
            </div>
            <div class="tip-card tip-card-small tip-card-muted">
              <div class="tip-icon"><i class="fa-solid fa-hand-holding-heart"></i></div>
              <h3>適用對象</h3>
              <p>長者、照顧者、慢性病友與一般社區民眾皆可查詢使用。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- What's in my region? -->
    <section id="region" class="section region-section section--quiet">
      <div class="container region-panel">
        <div class="region-intro">
          <p class="section-eyebrow">What's in my region?</p>
          <h2>選擇行政區</h2>
          <p>依所在區域瀏覽已上架的社區資源</p>
        </div>
        <div class="region-control">
          <label class="field-label" for="region-select">行政區</label>
          <select
            id="region-select"
            v-model="selectedRegion"
            class="region-select"
            @change="handleRegionChange"
          >
            <option v-for="d in districts" :key="d.value" :value="d.value">
              {{ d.label }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- Useful Information -->
    <section id="useful-info" class="section info-section section--info">
      <div class="container">
        <div class="info-layout">
          <aside class="info-intro">
            <p class="section-eyebrow">Useful Information</p>
            <h2>實用資訊</h2>
            <p class="info-intro-lead">
              平台指南與常見服務說明，協助您更快理解 CareLink 如何連結社區資源。
            </p>
            <ul class="info-intro-points">
              <li>如何依行政區與分類搜尋</li>
              <li>長者、照顧者與一般民眾皆適用</li>
              <li>可從 FAQ 直接前往相關資源</li>
            </ul>
          </aside>
          <div class="faq-list">
          <div
            v-for="(item, index) in usefulInfo"
            :key="item.question"
            class="faq-item"
            :class="{ open: expandedFaq === index }"
          >
            <button
              type="button"
              class="faq-trigger"
              :aria-expanded="expandedFaq === index"
              @click="toggleFaq(index)"
            >
              <span class="faq-question">{{ item.question }}</span>
              <span class="faq-icon" aria-hidden="true">
                <i
                  class="fa-solid"
                  :class="expandedFaq === index ? 'fa-minus' : 'fa-plus'"
                ></i>
              </span>
            </button>
            <div class="faq-panel" :class="{ open: expandedFaq === index }">
              <div class="faq-panel-inner">
                <p class="faq-answer">{{ item.answer }}</p>
                <button type="button" class="faq-action" @click="handleInfoLink(item.question)">
                  搜尋相關資源
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Select a Category -->
    <section id="categories" class="section categories-section section--secondary">
      <div class="container">
        <div class="section-head">
          <p class="section-eyebrow">Select a Category</p>
          <h2>服務分類</h2>
          <p>依類別篩選社區資源</p>
        </div>
        <div class="category-grid">
          <button
            v-for="cat in categories"
            :key="cat.name"
            type="button"
            class="category-card"
            :class="{ active: selectedCategory === cat.name }"
            @click="selectCategory(cat.name)"
          >
            <span class="category-card-icon">
              <i class="fa-solid" :class="cat.icon"></i>
            </span>
            <span class="category-card-body">
              <span class="category-card-title">{{ cat.name }}</span>
              <span class="category-card-desc">{{ cat.description }}</span>
            </span>
            <span class="category-card-cta">
              查看資源
              <i class="fa-solid fa-arrow-right"></i>
            </span>
          </button>
        </div>
      </div>
    </section>

    <!-- Featured Resources -->
    <section id="featured" class="section featured-section section--primary">
      <div class="container">
        <div class="section-head row-head">
          <div>
            <p class="section-eyebrow">Featured Resources</p>
            <h2>精選資源</h2>
            <p>{{ featuredSubtitle }}</p>
          </div>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="text-link btn-link"
            @click="clearFilters"
          >
            清除篩選
          </button>
        </div>

        <div v-if="featuredResources.length === 0" class="empty-panel">
          <i class="fa-solid fa-folder-open"></i>
          <p>{{ emptyResourcesMessage }}</p>
        </div>

        <div v-else class="featured-grid">
          <article
            v-for="res in featuredResources"
            :key="res.id"
            class="featured-card"
          >
            <div class="featured-media" aria-hidden="true">
              <i class="fa-solid fa-image"></i>
            </div>
            <div class="featured-content">
              <span v-if="res.tags?.length" class="featured-badge">
                {{ res.tags[0] }}
              </span>
              <h3 class="featured-title">{{ res.name }}</h3>
              <p v-if="res.description" class="featured-desc">
                {{ res.description }}
              </p>
              <p v-else class="featured-desc featured-desc-muted">
                社區資源據點，提供在地健康、社交與支持服務。
              </p>
              <ul class="featured-meta">
                <li>
                  <i class="fa-solid fa-location-dot"></i>
                  {{ res.region || "地區待確認" }}
                </li>
                <li v-if="res.locationName || res.address">
                  <i class="fa-solid fa-building"></i>
                  {{ res.locationName || res.address }}
                </li>
                <li v-if="res.targetGroups?.length">
                  <i class="fa-solid fa-user-group"></i>
                  適用：{{ res.targetGroups.join("、") }}
                </li>
              </ul>
              <button type="button" class="btn-card" @click="goResource(res.id)">
                前往查看
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="site-footer">
      <div class="container footer-inner">
        <div>
          <strong>CareLink 社區資源平台</strong>
          <p>社區資源連結與健康促進服務</p>
        </div>
        <nav class="footer-nav">
          <a href="#near-me" @click.prevent="scrollTo('near-me')">附近服務</a>
          <a href="#region" @click.prevent="scrollTo('region')">行政區</a>
          <a href="#useful-info" @click.prevent="scrollTo('useful-info')">實用資訊</a>
          <a href="#featured" @click.prevent="scrollTo('featured')">精選資源</a>
          
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import logo from "../assets/logo.png";
import heroBg from "../assets/bg-community-brown.png";
import { clearCurrentUser, getCurrentUser } from "../utils/auth.js";

const router = useRouter();
const currentUser = ref(null);
const searchText = ref("");
const addressSearch = ref("");
const selectedCategory = ref("");
const selectedRegion = ref("");
const allResources = ref([]);

const DISTRICT_POOL = ["板橋區", "中和區", "新店區", "永和區", "信義區", "三重區"];

const districts = [
  { value: "", label: "全部行政區" },
  ...DISTRICT_POOL.map((d) => ({ value: d, label: d })),
];

const usefulInfo = [
  {
    question: "社區處方是什麼？",
    answer:
      "社區處方是透過社區資源連結，協助民眾改善健康、社交與生活支持需求。",
  },
  {
    question: "如何尋找長者資源？",
    answer: "您可以透過行政區、分類或關鍵字搜尋附近適合的長者服務與活動。",
  },
  {
    question: "社區共餐服務介紹",
    answer: "社區共餐提供長者與居民共同用餐與社交互動，降低孤立感並促進健康。",
  },
  {
    question: "如何申請照護補助？",
    answer: "可透過地方政府、長照中心或社福單位協助申請相關補助與資源。",
  },
  {
    question: "社區據點參與方式",
    answer: "部分活動自由參加，部分需提前報名或由個管師轉介。",
  },
  {
    question: "心理支持服務說明",
    answer: "提供心理諮詢、支持團體與情緒陪伴等社區服務。",
  },
  {
    question: "長者運動注意事項",
    answer: "建議依個人身體狀況參與，必要時可由專業人員陪同。",
  },
  {
    question: "如何成為志工",
    answer: "可透過社區據點或合作單位報名參與志工服務。",
  },
];

const expandedFaq = ref(null);

const toggleFaq = (index) => {
  expandedFaq.value = expandedFaq.value === index ? null : index;
};

const categories = [
  {
    name: "運動健身",
    icon: "fa-shoe-prints",
    description: "長者健走、體適能與社區運動課程",
  },
  {
    name: "社交陪伴",
    icon: "fa-mug-hot",
    description: "共餐、聚會與社區陪伴活動",
  },
  {
    name: "心理支持",
    icon: "fa-heart-pulse",
    description: "心理諮詢、支持團體與情緒陪伴",
  },
  {
    name: "教育學習",
    icon: "fa-book",
    description: "共學課程、數位學習與終身教育",
  },
  {
    name: "長者照護",
    icon: "fa-hand-holding-heart",
    description: "提供日照、陪伴與健康支持服務",
  },
  {
    name: "營養健康",
    icon: "fa-apple-whole",
    description: "營養諮詢、共餐與健康促進活動",
  },
];

const quickTopics = [
  { label: "共餐", query: "共餐" },
  { label: "運動", query: "運動" },
  { label: "心理支持", query: "心理支持" },
  { label: "長者照護", query: "長者照護" },
];

const hotDistricts = ["板橋區", "中和區", "新店區"];

const activeResourceCount = computed(() => allResources.value.length);

const goExplore = (params = {}) => {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value !== null && value !== false)
  );
  router.push({ path: "/explore", query });
};

const quickSearch = (query) => {
  searchText.value = query;
  goExplore({ keyword: query });
};

const selectHotDistrict = (district) => {
  selectedRegion.value = district;
  goExplore({ region: district });
};

onMounted(() => {
  currentUser.value = getCurrentUser();
  const stored = JSON.parse(localStorage.getItem("resources") || "[]");
  allResources.value = stored
    .filter((r) => r.status === "active")
    .map((r, i) => ({
      ...r,
      region: r.region || DISTRICT_POOL[i % DISTRICT_POOL.length],
    }));
});

const filteredResources = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  const addr = addressSearch.value.trim().toLowerCase();

  return allResources.value.filter((res) => {
    const matchKeyword =
      !keyword ||
      res.name?.toLowerCase().includes(keyword) ||
      (res.tags || []).join(" ").toLowerCase().includes(keyword) ||
      (res.targetGroups || []).join(" ").toLowerCase().includes(keyword) ||
      (res.locationName || "").toLowerCase().includes(keyword) ||
      (res.region || "").toLowerCase().includes(keyword);

    const matchAddress =
      !addr ||
      (res.address || "").toLowerCase().includes(addr) ||
      (res.locationName || "").toLowerCase().includes(addr) ||
      (res.region || "").toLowerCase().includes(addr);

    const cat = selectedCategory.value;
    const tags = res.tags || [];
    const matchCategory =
      !cat ||
      tags.includes(cat) ||
      (cat === "心理支持" && tags.some((t) => String(t).includes("心理"))) ||
      (cat === "長者照護" && (res.targetGroups || []).includes("長者")) ||
      (cat === "營養健康" &&
        tags.some((t) => String(t).includes("營養") || String(t).includes("共餐")));

    const matchRegion =
      !selectedRegion.value || res.region === selectedRegion.value;

    return matchKeyword && matchAddress && matchCategory && matchRegion;
  });
});

const featuredResources = computed(() => filteredResources.value.slice(0, 6));

const hasActiveFilters = computed(
  () =>
    !!searchText.value.trim() ||
    !!addressSearch.value.trim() ||
    !!selectedCategory.value ||
    !!selectedRegion.value
);

const featuredSubtitle = computed(() => {
  if (selectedRegion.value) return `${selectedRegion.value}的社區資源`;
  if (addressSearch.value.trim()) return `「${addressSearch.value.trim()}」附近服務`;
  if (selectedCategory.value) return `「${selectedCategory.value}」相關資源`;
  if (searchText.value.trim()) return `搜尋「${searchText.value.trim()}」的結果`;
  return "精選已上架的社區服務與活動";
});

const emptyResourcesMessage = computed(() => {
  if (hasActiveFilters.value) {
    return "找不到符合條件的資源，試試其他關鍵字或篩選條件";
  }
  return "目前尚無已上架資源，請稍後再來查看";
});

const scrollTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const selectCategory = (name) => {
  selectedCategory.value = selectedCategory.value === name ? "" : name;
  goExplore({ category: selectedCategory.value || "" });
};

const clearFilters = () => {
  searchText.value = "";
  addressSearch.value = "";
  selectedCategory.value = "";
  selectedRegion.value = "";
};

const handleSearch = () => {
  goExplore({ keyword: searchText.value.trim() });
};

const handleAddressSearch = () => {
  goExplore({ address: addressSearch.value.trim() });
};

const useCurrentLocation = () => {
  goExplore({ nearby: "true" });
};

const handleRegionChange = () => {
  goExplore({ region: selectedRegion.value || "" });
};

const infoSearchMap = {
  "社區處方是什麼？": "社區",
  如何尋找長者資源: "長者",
  社區共餐服務介紹: "共餐",
  如何申請照護補助: "照護",
  社區據點參與方式: "社區",
  心理支持服務說明: "心理支持",
  長者運動注意事項: "運動",
  如何成為志工: "志工",
};

const handleInfoLink = (title) => {
  const keyword = infoSearchMap[title] ?? "";
  searchText.value = keyword;
  goExplore({ keyword });
};

const goList = () => router.push("/list");
const goForm = () => router.push("/form");
const goCases = () => router.push("/cases");
const goLogin = () => router.push("/login");
const goRegister = () => router.push("/register");
const goUser = () => {
  goExplore();
};
const goResource = (id) => router.push(`/user/resources/${id}`);
const logout = () => {
  clearCurrentUser();
  currentUser.value = null;
  router.push("/");
};
</script>

<style scoped>
.platform-home {
  min-height: 100vh;
  background: #ffffff;
  color: #3e2723;
  font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
  --header-height: 72px;
  scroll-padding-top: var(--header-height);
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 40px;
  --space-5: 64px;
  --space-6: 96px;
  --shadow-soft: 0 10px 30px rgba(62, 39, 35, 0.08);
  --shadow-hover: 0 16px 40px rgba(62, 39, 35, 0.12);
  --radius-card: 16px;
  --radius-btn: 10px;
  --card-hover-transform: translateY(-3px);
  --card-transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease,
    background 0.22s ease;
}

/* 統一內容寬度 */
.platform-home :deep(.container),
.platform-home .container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
}

/* Header */
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid #efe7dc;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #3e2723;
}

.brand-logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.brand-text {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.header-nav a {
  color: #5d4037;
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  transition: color 0.2s;
}

.header-nav a:hover {
  color: #b98158;
}

.btn-admin {
  border: none;
  background: #b98158;
  color: #fff;
  padding: 10px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.btn-admin:hover {
  background: #a06f4a;
  transform: translateY(-1px);
}

.btn-auth-link {
  border: none;
  background: transparent;
  color: #5d4037;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 4px;
  transition: color 0.2s;
}

.btn-auth-link:hover {
  color: #b98158;
}

.header-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #3e2723;
  white-space: nowrap;
}

/* Hero */
.hero-section {
  position: relative;
  overflow: hidden;
  min-height: 760px;
  display: flex;
  align-items: center;
  background: linear-gradient(180deg, #8b5e4a 0%, #9a6a55 100%);
  padding: calc(var(--header-height) + 40px) 0 0;
}

.hero-section::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120px;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0) 0%,
    #fffaf7 100%
  );
  pointer-events: none;
  z-index: 2;
}

.hero-section::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--hero-bg-image);
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: cover;
  opacity: 1;
  pointer-events: none;
  z-index: 1;
}

.hero-grid {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding-bottom: 48px;
}

.hero-copy {
  text-align: center;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 28px;
  padding: 48px 56px;
  max-width: 760px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(62, 39, 35, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.65);
}

.hero-eyebrow {
  font-size: 14px;
  font-weight: 600;
  color: #b98158;
  letter-spacing: 0.08em;
  margin-bottom: 14px;
}

.hero-copy h1 {
  font-size: clamp(32px, 4vw, 46px);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 18px;
  color: #3e2723;
}

.hero-desc {
  font-size: 18px;
  line-height: 1.7;
  color: #6d4c41;
  margin-bottom: 32px;
}

.hero-search {
  display: flex;
  align-items: center;
  max-width: 680px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e8ddd2;
  border-radius: 999px;
  padding: 6px 6px 6px 20px;
  box-shadow: 0 4px 16px rgba(93, 64, 55, 0.06);
}

.search-icon {
  color: #bcaaa4;
  margin-right: 10px;
}

.hero-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 12px 8px;
  background: transparent;
  color: #3e2723;
}

.hero-search button {
  border: none;
  background: #b98158;
  color: #fff;
  padding: 12px 26px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.hero-search button:hover {
  background: #a06f4a;
}

.hero-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.hero-chip {
  border: 1px solid rgba(232, 221, 210, 0.95);
  background: #faf6f1;
  color: #5d4037;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(93, 64, 55, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.hero-chip:hover {
  background: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(93, 64, 55, 0.1);
}

.hero-hint {
  margin-top: 18px;
  font-size: 14px;
  color: #8d6e63;
}

.hero-hint a {
  color: #b98158;
  font-weight: 600;
  text-decoration: none;
}

.hero-hint a:hover {
  text-decoration: underline;
}

/* Sections — rhythm & typography system */
.section {
  position: relative;
  padding: var(--space-5) 0;
  overflow: hidden;
}

.section > .container {
  position: relative;
  z-index: 1;
}

.section-eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #b98158;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.section-head {
  margin-bottom: var(--space-3);
}

.section--primary .section-head h2,
.featured-section .section-head h2 {
  font-size: clamp(42px, 5vw, 64px);
  line-height: 1.08;
  font-weight: 800;
  color: #3e2723;
  margin-bottom: var(--space-2);
}

.section--secondary .section-head h2,
.region-intro h2 {
  font-size: clamp(30px, 3vw, 42px);
  line-height: 1.15;
  font-weight: 800;
  color: #3e2723;
  margin-bottom: var(--space-2);
}

.info-intro h2 {
  font-size: 28px;
  line-height: 1.2;
  font-weight: 800;
  color: #3e2723;
  margin-bottom: var(--space-2);
}

.section-head p:not(.section-eyebrow),
.region-intro > p:not(.section-eyebrow),
.info-intro-lead {
  font-size: 16px;
  line-height: 1.7;
  color: #7b665e;
  max-width: 640px;
  margin: 0;
}

.section--primary {
  padding-top: var(--space-6);
  padding-bottom: var(--space-6);
}

.section--quiet {
  padding-top: var(--space-4);
  padding-bottom: var(--space-4);
}

.section--info {
  padding-top: var(--space-4);
  padding-bottom: var(--space-5);
}

.categories-section.section--secondary {
  padding-top: var(--space-5);
  padding-bottom: var(--space-5);
}

.featured-section.section--primary {
  padding-top: var(--space-5);
  padding-bottom: var(--space-6);
}

.row-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.text-link {
  color: #b98158;
  font-weight: 600;
  font-size: 15px;
  text-decoration: none;
  white-space: nowrap;
}

.text-link:hover {
  text-decoration: underline;
}

.btn-link {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #5d4037;
  margin-bottom: 8px;
}

.field-input {
  width: 100%;
  padding: 11px 14px;
  font-size: 15px;
  color: #5d4037;
  border: 1px solid #eee2d8;
  border-radius: var(--radius-btn);
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field-input:hover {
  border-color: #e5d5c8;
}

.field-input:focus {
  outline: none;
  border-color: #c2956e;
  box-shadow: 0 0 0 3px rgba(194, 149, 110, 0.12);
}

/* Provider quick actions */
.provider-quick-section {
  padding: var(--space-3) 0 var(--space-2);
  background: linear-gradient(180deg, #fffaf7 0%, #faf8f5 100%);
}

.provider-quick-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(234, 223, 216, 0.9);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
}

.provider-quick-greeting {
  margin: 0;
  font-size: 15px;
  color: #6d4c41;
  line-height: 1.5;
}

.provider-quick-greeting strong {
  color: #3e2723;
  font-weight: 700;
}

.provider-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.provider-quick-btn {
  border: 1px solid rgba(194, 149, 110, 0.35);
  background: #fff;
  color: #5d4037;
  padding: 10px 18px;
  border-radius: var(--radius-btn);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: var(--card-transition);
}

.provider-quick-btn:hover {
  background: #f5ebe3;
  border-color: #c2956e;
  box-shadow: var(--shadow-soft);
  transform: var(--card-hover-transform);
}

/* Platform quick access */
.platform-quick-section {
  padding: var(--space-4) 0;
  background: #faf8f5;
  border-bottom: 1px solid rgba(194, 149, 110, 0.15);
}

.platform-quick-title {
  font-size: clamp(22px, 2.5vw, 28px);
  font-weight: 800;
  color: #3e2723;
  margin: 0 0 var(--space-2);
}

.quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.quick-chip {
  border: 1px solid rgba(194, 149, 110, 0.35);
  background: #fff;
  color: #5d4037;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.quick-chip:hover {
  background: #f5ebe3;
  border-color: #c2956e;
  box-shadow: var(--shadow-soft);
}

.platform-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.platform-stat {
  margin: 0;
  font-size: 15px;
  color: #7b665e;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.platform-stat strong {
  color: #3e2723;
  font-weight: 800;
}

.hot-districts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
}

.hot-label {
  font-size: 13px;
  font-weight: 600;
  color: #9a8f86;
  margin-right: var(--space-1);
}

.hot-district-btn {
  border: 1px solid rgba(194, 149, 110, 0.28);
  background: rgba(255, 255, 255, 0.9);
  color: #5d4037;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.hot-district-btn:hover {
  background: #fff;
  border-color: #c2956e;
  color: #3e2723;
}

/* near-section — map atmosphere (intensity ~80) */
.near-section {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    #f7f2ed 0%,
    #f0e9e2 55%,
    #ebe2d6 100%
  );
}

.near-section::before {
  content: "";
  position: absolute;
  top: -60px;
  left: -40px;
  width: min(380px, 48vw);
  height: min(300px, 38vw);
  border-radius: 50%;
  background: radial-gradient(
    ellipse 70% 65% at 50% 45%,
    rgba(255, 252, 248, 0.55) 0%,
    rgba(232, 213, 196, 0.2) 50%,
    transparent 78%
  );
  filter: blur(28px);
  opacity: 0.4;
  pointer-events: none;
  z-index: 0;
}

.near-section::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'%3E%3Cellipse cx='228' cy='258' rx='148' ry='118' fill='%23b98158' fill-opacity='0.1'/%3E%3Cpath stroke='%235d4037' stroke-opacity='0.2' stroke-width='1.2' fill='none' d='M88 228h176M148 198v108M228 202v96'/%3E%3Cpath stroke='%233e2723' stroke-opacity='0.22' fill='none' d='M118 222 Q188 198 248 232 M138 272 L268 268'/%3E%3Ccircle cx='118' cy='222' r='4' fill='%23b98158' fill-opacity='0.35'/%3E%3Ccircle cx='248' cy='232' r='3.5' fill='%23c2956e' fill-opacity='0.3'/%3E%3C/svg%3E");
  background-size: min(460px, 44vw) min(460px, 44vw);
  background-position: 100% 100%;
  background-repeat: no-repeat;
  opacity: 0.36;
  pointer-events: none;
  z-index: 0;
}

.near-section > .container {
  position: relative;
  z-index: 2;
}

.near-section .section-head {
  position: relative;
  z-index: 1;
}

.near-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: var(--space-3);
  align-items: start;
}

.near-form {
  position: relative;
  z-index: 1;
  padding: var(--space-4) var(--space-4) calc(var(--space-4) + 4px);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(232, 221, 210, 0.9);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.near-form .field-label,
.near-form .field-input,
.near-form .near-actions {
  position: relative;
  z-index: 1;
}

.near-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.btn-primary {
  border: none;
  background: #b98158;
  color: #fff;
  padding: 12px 24px;
  border-radius: var(--radius-btn);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #a06f4a;
}

.btn-secondary {
  border: 1px solid #d4c4b5;
  background: #faf7f4;
  color: #5d4037;
  padding: 12px 20px;
  border-radius: var(--radius-btn);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #f5ebe3;
}

.near-aside {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: 1.4fr 0.75fr;
  gap: var(--space-2);
  min-height: 100%;
}

.near-section .tip-card {
  position: relative;
  padding: 20px 22px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--shadow-soft);
  transition: var(--card-transition);
}

.near-section .tip-card:hover {
  transform: var(--card-hover-transform);
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-hover);
}

.near-section .tip-card-muted {
  background: rgba(253, 248, 245, 0.62);
}

.near-section .tip-card-muted:hover {
  background: rgba(253, 248, 245, 0.82);
}

.near-section .tip-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-btn);
  background: linear-gradient(145deg, #faf7f4 0%, #f0e6dc 100%);
  border: 1px solid rgba(212, 184, 150, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  color: #8d6e63;
  margin-bottom: 12px;
}

.near-section .tip-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #5d4037;
}

.near-section .tip-card p {
  font-size: 14px;
  line-height: 1.5;
  color: #8d6e63;
  margin: 0;
}

/* region-section — calm navigation (intensity ~45) */
.region-section {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #f7f2ed;
}

.region-section::before {
  display: none;
}

.region-section::after {
  display: none;
}

.region-section .container.region-panel,
.region-section > .container {
  position: relative;
  z-index: 1;
}

.region-panel {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
  padding: var(--space-4);
  border: 1px solid rgba(194, 149, 110, 0.2);
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: var(--shadow-soft);
}

.region-intro {
  flex: 1;
  min-width: 220px;
}

.region-control {
  min-width: min(100%, 420px);
  flex: 1;
  max-width: 480px;
}

.region-control .field-label {
  margin-bottom: var(--space-1);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9a8f86;
}

.region-select {
  width: 100%;
  padding: 18px 20px;
  font-size: 18px;
  color: #3e2723;
  background: #ffffff;
  border: 1px solid rgba(194, 149, 110, 0.4);
  border-radius: var(--radius-btn);
  cursor: pointer;
  outline: none;
  font-weight: 600;
  box-shadow: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.region-select:hover {
  border-color: #c2956e;
}

.region-section .region-select:focus {
  outline: none;
  border-color: #c2956e;
  box-shadow: 0 0 0 3px rgba(194, 149, 110, 0.18);
}

/* info-section — warm paper FAQ (intensity ~35) */
.info-section {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: linear-gradient(180deg, #f5f0eb 0%, #faf8f5 100%);
}

.info-section::before {
  content: "";
  position: absolute;
  top: -40px;
  right: -20%;
  width: min(520px, 70vw);
  height: min(360px, 50vw);
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    ellipse 60% 55% at 60% 40%,
    rgba(255, 248, 242, 0.45) 0%,
    transparent 72%
  );
  opacity: 0.5;
}

.info-section::after {
  display: none;
}

.info-section > .container {
  position: relative;
  z-index: 1;
}

.info-layout {
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) 1.1fr;
  gap: var(--space-4);
  align-items: start;
}

.info-intro {
  position: sticky;
  top: calc(var(--header-height) + var(--space-2));
}

.info-intro-points {
  margin: var(--space-3) 0 0;
  padding-left: 1.1em;
  color: #7b665e;
  font-size: 15px;
  line-height: 1.75;
}

.info-intro-points li + li {
  margin-top: var(--space-1);
}

.info-section .faq-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
}

.info-section .faq-item {
  background: rgba(255, 248, 242, 0.94);
  border: 1px solid rgba(194, 149, 110, 0.24);
  border-radius: var(--radius-card);
  overflow: hidden;
  min-height: 0;
  box-shadow: var(--shadow-soft);
  transition: var(--card-transition);
}

.info-section .faq-item:hover {
  border-color: rgba(194, 149, 110, 0.32);
  box-shadow: var(--shadow-soft);
}

.info-section .faq-item.open {
  background: #fff;
  border-color: rgba(194, 149, 110, 0.36);
  box-shadow: var(--shadow-soft);
}

.info-section .faq-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.info-section .faq-question {
  font-size: 15px;
  font-weight: 600;
  color: #3e2723;
  line-height: 1.45;
}

.info-section .faq-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: rgba(232, 213, 196, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a1887f;
  font-size: 9px;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.info-section .faq-item.open .faq-icon {
  background: rgba(232, 213, 196, 0.65);
  color: #6d4c41;
}

.info-section .faq-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.info-section .faq-panel.open {
  grid-template-rows: 1fr;
}

.info-section .faq-panel-inner {
  overflow: hidden;
  padding: 0 18px;
  opacity: 0;
  transition: opacity 0.3s ease 0.05s, padding 0.35s ease;
}

.info-section .faq-panel.open .faq-panel-inner {
  padding: 0 18px 18px;
  opacity: 1;
}

.info-section .faq-answer {
  font-size: 14px;
  line-height: 1.7;
  color: #5d4037;
  margin: 0 0 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(194, 149, 110, 0.2);
}

.info-section .faq-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: #b98158;
  cursor: pointer;
  transition: color 0.15s ease;
}

.info-section .faq-action:hover {
  color: #8d6e63;
}

/* categories-section — experience cards (intensity ~65) */
.categories-section {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: linear-gradient(180deg, #f0e9e2 0%, #f7f2ed 100%);
}

.categories-section::before {
  content: "";
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: min(640px, 90vw);
  height: min(400px, 55vw);
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    ellipse 55% 45% at 50% 50%,
    rgba(232, 213, 196, 0.28) 0%,
    transparent 70%
  );
  opacity: 0.45;
}

.categories-section::after {
  display: none;
}

.categories-section > .container {
  position: relative;
  z-index: 1;
}

.categories-section .category-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.categories-section .category-card {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid rgba(194, 149, 110, 0.22);
  border-radius: var(--radius-card);
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: var(--card-transition);
}

.category-card-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-btn);
  background: #faf7f4;
  border: 1px solid rgba(194, 149, 110, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b98158;
  font-size: 18px;
  flex-shrink: 0;
}

.category-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.category-card-title {
  font-size: 17px;
  font-weight: 700;
  color: #3e2723;
}

.category-card-desc {
  font-size: 14px;
  line-height: 1.5;
  color: #7b665e;
  font-weight: 400;
}

.category-card-cta {
  font-size: 13px;
  font-weight: 600;
  color: #b98158;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.categories-section .category-card:hover {
  transform: var(--card-hover-transform);
  background: #fff;
  border-color: rgba(194, 149, 110, 0.35);
  box-shadow: var(--shadow-hover);
}

.categories-section .category-card.active {
  border-color: #c2956e;
  background: #fff;
  box-shadow: var(--shadow-hover);
}

.categories-section .category-card.active .category-card-cta {
  color: #8d6e63;
}
@media (max-width: 768px) {
  .categories-section .category-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .categories-section .category-card {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    align-items: start;
    padding: 20px;
    gap: 14px;
  }

  .categories-section .category-card-icon {
    width: 44px;
    height: 44px;
    font-size: 16px;
  }

  .categories-section .category-card-body {
    gap: 6px;
  }

  .categories-section .category-card-title {
    font-size: 16px;
    line-height: 1.3;
  }

  .categories-section .category-card-desc {
    font-size: 13px;
    line-height: 1.55;
  }

  .categories-section .category-card-cta {
    grid-column: 1 / -1;
    justify-content: flex-start;
    padding-top: 4px;
    font-size: 13px;
  }
}
/* featured-section — showcase (intensity ~50) */
.featured-section {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #faf8f5;
}

.featured-section::before {
  display: none;
}

.featured-section::after {
  display: none;
}

.featured-section > .container {
  position: relative;
  z-index: 1;
}

.featured-section .featured-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.featured-section .featured-card {
  position: relative;
  padding: 0;
  border: 1px solid rgba(194, 149, 110, 0.18);
  border-radius: var(--radius-card);
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-soft);
  transition: var(--card-transition);
}

.featured-section .featured-card:hover {
  transform: var(--card-hover-transform);
  border-color: rgba(194, 149, 110, 0.28);
  box-shadow: var(--shadow-hover);
}

.featured-media {
  height: 140px;
  background: linear-gradient(145deg, #f5ebe3 0%, #efe2d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c4b5aa;
  font-size: 28px;
}

.featured-content {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
}

.featured-section .featured-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  color: #7b665e;
  background: #faf7f4;
  border: 1px solid rgba(194, 149, 110, 0.18);
  padding: 4px 10px;
  border-radius: var(--radius-btn);
  letter-spacing: 0.02em;
}

.featured-title {
  font-size: 18px;
  font-weight: 700;
  color: #3e2723;
  margin: 0;
  line-height: 1.35;
}

.featured-desc {
  font-size: 14px;
  line-height: 1.6;
  color: #7b665e;
  margin: 0;
}

.featured-desc-muted {
  font-style: italic;
}

.featured-section .featured-meta {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.featured-section .featured-meta li {
  font-size: 13px;
  color: #6d5d55;
  line-height: 1.45;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.featured-section .featured-meta i {
  width: 14px;
  margin-top: 2px;
  color: #a1887f;
  flex-shrink: 0;
}

.featured-section .btn-card {
  margin-top: auto;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(194, 149, 110, 0.28);
  background: #faf7f4;
  color: #4e342e;
  padding: 12px 16px;
  border-radius: var(--radius-btn);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
}

.featured-section .btn-card:hover {
  background: #fff;
  border-color: #c2956e;
  color: #3e2723;
  box-shadow: var(--shadow-soft);
}

.featured-section .btn-card i {
  font-size: 12px;
  transition: transform 0.2s ease;
}

.featured-section .btn-card:hover i {
  transform: translateX(3px);
}

.featured-section .empty-panel {
  text-align: center;
  padding: 48px 24px;
  background: rgba(255, 248, 242, 0.92);
  border: 1px dashed rgba(194, 149, 110, 0.3);
  border-radius: var(--radius-card);
  color: #5d4037;
  box-shadow: var(--shadow-soft);
}

.featured-section .empty-panel i {
  font-size: 36px;
  color: #c2956e;
  margin-bottom: 16px;
}

.featured-section .empty-panel p {
  font-size: 16px;
  font-weight: 600;
  color: #3e2723;
  margin-bottom: 16px;
}

.featured-section .empty-panel .btn-outline {
  border: 1px solid rgba(194, 149, 110, 0.35);
  background: rgba(255, 248, 242, 0.9);
  color: #4e342e;
  padding: 12px 28px;
  border-radius: var(--radius-btn);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.featured-section .empty-panel .btn-outline:hover {
  background: #fff;
  border-color: #c2956e;
  box-shadow: var(--shadow-soft);
}

.section-cta {
  text-align: center;
  margin-top: var(--space-4);
}

.btn-outline {
  border: 1px solid #d4b896;
  background: transparent;
  color: #5d4037;
  padding: 12px 28px;
  border-radius: var(--radius-btn);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-outline:hover {
  background: #f5ebe3;
}

.empty-panel {
  text-align: center;
  padding: 48px 24px;
  background: #faf7f4;
  border: 1px dashed #e8ddd2;
  border-radius: 10px;
  color: #8d6e63;
}

.empty-panel i {
  font-size: 36px;
  color: #d7ccc8;
  margin-bottom: 16px;
}

.empty-panel p {
  font-size: 16px;
  font-weight: 600;
  color: #5d4037;
  margin-bottom: 16px;
}

/* Footer */
.site-footer {
  background: linear-gradient(135deg, #4e342e 0%, #3e2723 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #efebe9;
  padding: 40px 0;
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.footer-inner strong {
  display: block;
  font-size: 16px;
  margin-bottom: 6px;
}

.footer-inner p {
  margin: 0;
  font-size: 14px;
  opacity: 0.85;
}

.footer-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.footer-nav a,
.footer-link {
  color: #efebe9;
  text-decoration: none;
  font-size: 14px;
  opacity: 0.9;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.footer-nav a:hover,
.footer-link:hover {
  opacity: 1;
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 992px) {
  .near-section::before {
    width: min(280px, 52vw);
    height: min(230px, 42vw);
    opacity: 0.5;
  }

  .near-section::after {
    background-size: min(400px, 55vw) min(400px, 55vw);
    opacity: 0.32;
  }

  .info-section::before {
    opacity: 0.5;
  }

  .info-section::after {
    opacity: 0.18;
  }

  .categories-section::before {
    opacity: 0.48;
  }

  .featured-section::before {
    opacity: 0.42;
  }

  .near-grid {
    grid-template-columns: 1fr;
  }

  .info-layout {
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .info-intro {
    position: static;
  }

  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .category-grid {
    grid-template-columns: 1fr;
  }

  .categories-section .category-card {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
  }

  .category-card-cta {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }

  .region-panel {
    padding: 24px 22px;
    gap: 22px;
  }
}

@media (max-width: 768px) {
  .platform-home {
    --header-height: 108px;
  }

  .platform-home .container {
    padding: 16px;
  }

  .header-inner {
    flex-wrap: wrap;
    align-items: center;
    padding: 10px 0;
    gap: 10px 14px;
  }

  .brand {
    flex: 1 1 auto;
    min-width: 0;
  }

  .brand-logo {
    width: 32px;
    height: 32px;
  }

  .brand-text {
    font-size: 14px;
    line-height: 1.3;
  }

  .header-nav {
    flex: 1 1 100%;
    flex-wrap: wrap;
    gap: 10px 14px;
    justify-content: flex-start;
  }

  .header-nav a {
    font-size: 13px;
  }

  .btn-admin {
    padding: 8px 16px;
    font-size: 13px;
  }

  .hero-section {
    min-height: 640px;
    padding: calc(var(--header-height) + 24px) 0 0;
  }

  .hero-copy {
    padding: 28px 20px;
    max-width: 100%;
  }

  .hero-search {
    border-radius: 20px;
    flex-wrap: wrap;
    padding: 12px;
    gap: 8px;
  }

  .hero-search button {
    width: 100%;
  }

  .hero-chip {
    font-size: 13px;
    padding: 8px 14px;
  }

  .hero-section::after {
    background-position: center bottom;
    background-size: cover;
    opacity: 1;
  }

  .provider-quick-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .provider-quick-actions {
    width: 100%;
  }

  .provider-quick-btn {
    flex: 1 1 auto;
    justify-content: center;
    min-width: calc(50% - 4px);
  }

  .section {
    padding: var(--space-5) 0;
  }

  .section--primary {
    padding-top: var(--space-5);
    padding-bottom: var(--space-5);
  }

  .row-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .platform-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .region-panel {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px 22px;
    gap: 18px;
  }

  .region-intro {
    padding-right: 0;
  }

  .region-control {
    max-width: 100%;
    width: 100%;
    padding-top: 0;
  }

  .near-aside {
    grid-template-rows: auto auto;
  }

  .near-section::after {
    background-size: min(300px, 75vw) min(300px, 75vw);
    opacity: 0.3;
  }

  .near-form {
    padding: var(--space-3);
  }

  .info-section .faq-trigger {
    padding: 14px 16px;
  }

  .info-section .faq-question {
    font-size: 14px;
  }

  .category-grid,
  .featured-grid {
    grid-template-columns: 1fr;
  }

  .near-actions {
    flex-direction: column;
  }

  .near-actions .btn-primary,
  .near-actions .btn-secondary {
    width: 100%;
    justify-content: center;
  }

  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-nav {
    flex-wrap: wrap;
    gap: 14px;
  }
}

</style>
