<template>
  <div class="explore-page">
    <header class="explore-header">
      <div class="container">
        <div class="explore-header-inner">
          <button type="button" class="back-btn" @click="goHome">
            <i class="fa-solid fa-arrow-left"></i>
            回到首頁
          </button>
          <h1>社區資源探索</h1>
        </div>
      </div>
    </header>

    <main class="container explore-main">
      <section class="search-panel">
        <form class="search-form" @submit.prevent="applyQuery">
          <div class="field-group">
            <label for="keyword-input">關鍵字搜尋</label>
            <input
              id="keyword-input"
              v-model="keyword"
              type="search"
              placeholder="例如：共餐、心理支持、長者運動"
            />
          </div>
          <div class="field-group">
            <label for="address-input">地址或地標</label>
            <input
              id="address-input"
              v-model="address"
              type="text"
              placeholder="例如：板橋車站、中和區公所"
            />
          </div>
          <div class="search-actions">
            <button type="submit" class="btn-primary">搜尋</button>
            <button type="button" class="btn-secondary" @click="useNearby">
              <i class="fa-solid fa-location-crosshairs"></i>
              使用目前位置
            </button>
          </div>
        </form>
      </section>

      <section class="explore-layout">
        <aside class="filters-panel">
          <h2>篩選條件</h2>

          <div class="filter-block">
            <label for="region-filter">行政區</label>
            <select id="region-filter" v-model="selectedRegion" @change="applyQuery">
              <option value="">全部行政區</option>
              <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>

          <div class="filter-block">
            <label for="category-filter">分類</label>
            <select id="category-filter" v-model="selectedCategory" @change="applyQuery">
              <option value="">全部分類</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div class="filter-block">
            <p class="filter-title">需求標籤</p>
            <div class="chip-group">
              <button
                v-for="tag in availableTags"
                :key="tag"
                type="button"
                class="chip"
                :class="{ active: selectedTags.includes(tag) }"
                @click="toggleTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div class="filter-block">
            <p class="filter-title">適用對象</p>
            <div class="chip-group">
              <button
                v-for="group in availableTargetGroups"
                :key="group"
                type="button"
                class="chip"
                :class="{ active: selectedTargetGroups.includes(group) }"
                @click="toggleTargetGroup(group)"
              >
                {{ group }}
              </button>
            </div>
          </div>
        </aside>

        <div class="results-panel">
          <div class="results-head">
            <p>找到 {{ filteredResources.length }} 個符合的社區資源</p>
          </div>

          <div class="map-placeholder">
            <i class="fa-solid fa-map-location-dot"></i>
            <p>Map Preview Area</p>
            <small>地圖功能即將推出</small>
          </div>

          <div v-if="filteredResources.length === 0" class="empty-panel">
            <i class="fa-solid fa-folder-open"></i>
            <p>目前沒有符合條件的資源，請調整搜尋條件</p>
          </div>

          <div v-else class="result-grid">
            <article v-for="res in filteredResources" :key="res.id" class="result-card">
              <div class="result-media" aria-hidden="true">
                <i class="fa-solid fa-image"></i>
              </div>
              <div class="result-content">
                <span v-if="res.tags?.length" class="result-badge">{{ res.tags[0] }}</span>
                <h3 class="result-title">{{ res.name }}</h3>
                <p class="result-desc">
                  {{ res.description || "社區資源據點，提供在地健康、社交與支持服務。" }}
                </p>
                <ul class="result-meta">
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
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

const keyword = ref("");
const address = ref("");
const selectedRegion = ref("");
const selectedCategory = ref("");
const isNearby = ref(false);
const selectedTags = ref([]);
const selectedTargetGroups = ref([]);
const allResources = ref([]);

const DISTRICT_POOL = ["板橋區", "中和區", "新店區", "永和區", "信義區", "三重區"];
const categories = ["運動健身", "社交陪伴", "心理支持", "教育學習", "長者照護", "營養健康"];

const syncFromQuery = () => {
  keyword.value = String(route.query.keyword || "");
  address.value = String(route.query.address || "");
  selectedRegion.value = String(route.query.region || "");
  selectedCategory.value = String(route.query.category || "");
  isNearby.value = String(route.query.nearby || "") === "true";
};

const availableTags = computed(() => {
  const tags = allResources.value.flatMap((r) => r.tags || []);
  return [...new Set(tags)].filter(Boolean);
});

const availableTargetGroups = computed(() => {
  const groups = allResources.value.flatMap((r) => r.targetGroups || []);
  return [...new Set(groups)].filter(Boolean);
});

const filteredResources = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const addr = address.value.trim().toLowerCase();
  const region = selectedRegion.value;
  const category = selectedCategory.value;

  return allResources.value.filter((res) => {
    const tags = res.tags || [];
    const targetGroups = res.targetGroups || [];

    const matchKeyword =
      !kw ||
      res.name?.toLowerCase().includes(kw) ||
      tags.join(" ").toLowerCase().includes(kw) ||
      targetGroups.join(" ").toLowerCase().includes(kw) ||
      (res.locationName || "").toLowerCase().includes(kw) ||
      (res.region || "").toLowerCase().includes(kw);

    const matchAddress =
      !addr ||
      (res.address || "").toLowerCase().includes(addr) ||
      (res.locationName || "").toLowerCase().includes(addr) ||
      (res.region || "").toLowerCase().includes(addr);

    const matchCategory =
      !category ||
      tags.includes(category) ||
      (category === "心理支持" && tags.some((t) => String(t).includes("心理"))) ||
      (category === "長者照護" && targetGroups.includes("長者")) ||
      (category === "營養健康" &&
        tags.some((t) => String(t).includes("營養") || String(t).includes("共餐")));

    const matchRegion = !region || res.region === region;
    const matchTags = selectedTags.value.every((tag) => tags.includes(tag));
    const matchTargetGroups = selectedTargetGroups.value.every((group) =>
      targetGroups.includes(group)
    );

    // nearby is placeholder mode before map/geolocation API
    const matchNearby = !isNearby.value || true;

    return (
      matchKeyword &&
      matchAddress &&
      matchCategory &&
      matchRegion &&
      matchTags &&
      matchTargetGroups &&
      matchNearby
    );
  });
});

const applyQuery = () => {
  const query = {};
  if (keyword.value.trim()) query.keyword = keyword.value.trim();
  if (address.value.trim()) query.address = address.value.trim();
  if (selectedRegion.value) query.region = selectedRegion.value;
  if (selectedCategory.value) query.category = selectedCategory.value;
  if (isNearby.value) query.nearby = "true";
  router.push({ path: "/explore", query });
};

const useNearby = () => {
  isNearby.value = true;
  applyQuery();
};

const toggleTag = (tag) => {
  const idx = selectedTags.value.indexOf(tag);
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1);
  } else {
    selectedTags.value.push(tag);
  }
};

const toggleTargetGroup = (group) => {
  const idx = selectedTargetGroups.value.indexOf(group);
  if (idx >= 0) {
    selectedTargetGroups.value.splice(idx, 1);
  } else {
    selectedTargetGroups.value.push(group);
  }
};

const goHome = () => router.push("/");
const goResource = (id) => router.push(`/user/resources/${id}`);

onMounted(() => {
  const stored = JSON.parse(localStorage.getItem("resources") || "[]");
  allResources.value = stored
    .filter((r) => r.status === "active")
    .map((r, i) => ({
      ...r,
      region: r.region || DISTRICT_POOL[i % DISTRICT_POOL.length],
    }));
  syncFromQuery();
});

watch(
  () => route.query,
  () => {
    syncFromQuery();
  }
);
</script>

<style scoped>
.explore-page {
  min-height: 100vh;
  background: #faf8f5;
  color: #3e2723;
  font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
}

.explore-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #efe7dc;
}

.explore-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.explore-header h1 {
  margin: 0;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 800;
}

.back-btn {
  border: 1px solid #d4b896;
  background: #fffaf7;
  color: #5d4037;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.explore-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-panel,
.filters-panel,
.results-panel {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(194, 149, 110, 0.18);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(62, 39, 35, 0.08);
}

.search-panel {
  padding: 20px;
}

.search-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 14px;
  align-items: end;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-group label {
  font-size: 14px;
  font-weight: 600;
  color: #5d4037;
}

.field-group input,
.filters-panel select {
  width: 100%;
  padding: 11px 14px;
  font-size: 15px;
  color: #5d4037;
  border: 1px solid #eee2d8;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
}

.search-actions {
  display: flex;
  gap: 10px;
}

.btn-primary,
.btn-secondary {
  border: none;
  border-radius: 10px;
  padding: 11px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-primary {
  background: #b98158;
  color: #fff;
}

.btn-secondary {
  border: 1px solid #d4c4b5;
  background: #faf7f4;
  color: #5d4037;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.explore-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.filters-panel {
  padding: 20px;
  position: sticky;
  top: 92px;
}

.filters-panel h2 {
  margin: 0 0 14px;
  font-size: 20px;
}

.filter-block + .filter-block {
  margin-top: 18px;
}

.filter-block label,
.filter-title {
  display: block;
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #5d4037;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid rgba(194, 149, 110, 0.28);
  background: #faf7f4;
  color: #5d4037;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
}

.chip.active {
  background: #5d4037;
  color: #fff;
  border-color: #5d4037;
}

.results-panel {
  padding: 20px;
}

.results-head p {
  margin: 0 0 14px;
  font-size: 15px;
  color: #6d5d55;
  font-weight: 600;
}

.map-placeholder {
  border: 1px dashed rgba(194, 149, 110, 0.4);
  background: #fffaf7;
  border-radius: 12px;
  min-height: 150px;
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8d6e63;
  text-align: center;
}

.map-placeholder i {
  font-size: 24px;
}

.empty-panel {
  text-align: center;
  padding: 36px 20px;
  border: 1px dashed #e8ddd2;
  border-radius: 12px;
  background: #faf7f4;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.result-card {
  border: 1px solid rgba(194, 149, 110, 0.18);
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(62, 39, 35, 0.08);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.result-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(62, 39, 35, 0.12);
}

.result-media {
  height: 120px;
  background: linear-gradient(145deg, #f5ebe3 0%, #efe2d4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c4b5aa;
  font-size: 24px;
}

.result-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-badge {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  color: #7b665e;
  background: #faf7f4;
  border: 1px solid rgba(194, 149, 110, 0.18);
  padding: 4px 10px;
  border-radius: 10px;
}

.result-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.result-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #7b665e;
}

.result-meta {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-meta li {
  font-size: 13px;
  color: #6d5d55;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.btn-card {
  margin-top: auto;
  width: 100%;
  border: 1px solid rgba(194, 149, 110, 0.28);
  background: #faf7f4;
  color: #4e342e;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@media (max-width: 992px) {
  .search-form {
    grid-template-columns: 1fr;
  }

  .explore-layout {
    grid-template-columns: 1fr;
  }

  .filters-panel {
    position: static;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .explore-header-inner {
    flex-direction: column;
    align-items: flex-start;
  }

  .search-actions {
    flex-direction: column;
  }

  .search-actions .btn-primary,
  .search-actions .btn-secondary {
    width: 100%;
    justify-content: center;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
