<template>
  <div class="explore-page">
    <header class="explore-header">
      <div class="container">
        <div class="explore-header-inner">
          <button type="button" class="back-btn" @click="back">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
            返回
          </button>
          <h1>社區資源探索</h1>
        </div>
      </div>
    </header>

    <main class="container explore-main">
      <section class="search-panel" data-tour="explore-search">
        <form class="search-form" @submit.prevent="submitSearch">
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
              placeholder="例如：板橋區文化路、中和區公所"
            />
          </div>
          <div class="search-actions">
            <button type="submit" class="btn-primary">搜尋</button>
            <button type="button" class="btn-secondary" data-tour="explore-nearby" @click="useNearby">
              <i class="fa-solid fa-location-crosshairs"></i>
              使用目前位置
            </button>
          </div>
        </form>
      </section>

      <section class="explore-layout">
        <aside class="filters-panel" data-tour="explore-filters">
          <div class="filters-head">
            <h2>篩選條件</h2>
            <button v-if="hasFilters" type="button" class="clear-btn" @click="clearFilters">
              清除全部
            </button>
          </div>

          <!-- 地區：先選縣市、再選行政區；括號內為目前可查詢的資源數 -->
          <div class="filter-block">
            <label for="city-filter">縣市</label>
            <select id="city-filter" :value="filters.city" @change="setCity($event.target.value)">
              <option value="">全部縣市</option>
              <optgroup v-for="group in cityGroups" :key="group.type" :label="group.type">
                <option v-for="c in group.cities" :key="c.name" :value="c.name">{{ c.label }}</option>
              </optgroup>
            </select>
          </div>

          <div class="filter-block">
            <label for="district-filter">行政區</label>
            <select
              id="district-filter"
              :value="filters.district"
              :disabled="!filters.city"
              @change="setFilter('district', $event.target.value)"
            >
              <option value="">{{ filters.city ? "全部行政區" : "請先選擇縣市" }}</option>
              <option v-for="d in districtOptionList" :key="d.name" :value="d.name">{{ d.label }}</option>
            </select>
          </div>

          <div class="filter-block">
            <label for="type-filter">處方類型</label>
            <select id="type-filter" :value="filters.type" @change="setFilter('type', $event.target.value)">
              <option value="">全部類型</option>
              <option v-for="t in prescriptionTypeOptions" :key="t.code" :value="t.code">
                {{ t.label }}
              </option>
            </select>
          </div>

          <div v-if="tagOptions.length" class="filter-block">
            <p class="filter-title">需求標籤 <small>（符合任一）</small></p>
            <div class="chip-group">
              <button
                v-for="tag in tagOptions"
                :key="tag"
                type="button"
                class="chip"
                :class="{ active: filters.tags.includes(tag) }"
                :aria-pressed="filters.tags.includes(tag)"
                @click="toggleFilter('tags', tag)"
              >
                {{ getNeedTagLabel(tag) }}
              </button>
            </div>
          </div>

          <div class="filter-block">
            <p class="filter-title">適合年齡</p>
            <div class="chip-group">
              <button
                v-for="o in ageOptions"
                :key="o.code"
                type="button"
                class="chip"
                :class="{ active: filters.ageGroups.includes(o.code) }"
                :aria-pressed="filters.ageGroups.includes(o.code)"
                @click="toggleFilter('ageGroups', o.code)"
              >
                {{ o.label }}
              </button>
            </div>
          </div>

          <div class="filter-block">
            <p class="filter-title">適合身分</p>
            <div class="chip-group">
              <button
                v-for="o in identityOptions"
                :key="o.code"
                type="button"
                class="chip"
                :class="{ active: filters.identities.includes(o.code) }"
                :aria-pressed="filters.identities.includes(o.code)"
                @click="toggleFilter('identities', o.code)"
              >
                {{ o.label }}
              </button>
            </div>
          </div>
        </aside>

        <div class="results-panel" data-tour="explore-results">
          <div class="results-head">
            <p>找到 {{ rankedResults.length }} 個符合的社區資源</p>
          </div>

          <!-- 使用目前位置：位置只存在這個頁面的記憶體中，不儲存、不傳送 -->
          <div v-if="filters.nearby" :class="['nearby-panel', geoState.status]" role="status" aria-live="polite">
            <template v-if="geoState.status === 'locating'">
              <p>
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                正在取得您的位置⋯ 請在瀏覽器詢問時選擇「允許」。
              </p>
            </template>
            <template v-else-if="geoState.status === 'located'">
              <p class="nearby-title">
                <i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>
                已依您目前的位置，由近到遠排列
              </p>
              <small>距離為直線距離，實際路程可能較遠。位置只在您的瀏覽器中計算，不會儲存或傳送。</small>
              <div class="radius-chips" role="group" aria-label="距離範圍">
                <span class="radius-label">距離範圍</span>
                <button
                  v-for="option in radiusOptions"
                  :key="option.value"
                  type="button"
                  :class="['chip', { active: radiusValue === option.value }]"
                  :aria-pressed="radiusValue === option.value"
                  @click="setFilter('radius', option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
              <button type="button" class="nearby-stop" @click="stopNearby">不使用位置</button>
            </template>
            <template v-else-if="geoState.status === 'error'">
              <p class="nearby-title">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                無法使用目前位置
              </p>
              <p>{{ geoState.message }}</p>
              <p>您可以改用左側的「縣市」、「行政區」篩選，找出所在地區的資源。</p>
              <div class="nearby-actions">
                <button type="button" class="btn-secondary" @click="focusRegion">改用縣市行政區篩選</button>
                <button type="button" class="nearby-stop" @click="locate">再試一次</button>
              </div>
            </template>
          </div>

          <div v-else class="map-placeholder">
            <i class="fa-solid fa-map-location-dot"></i>
            <p>Map Preview Area</p>
            <small>地圖功能即將推出</small>
          </div>

          <div v-if="rankedResults.length === 0" class="empty-panel">
            <i class="fa-solid fa-folder-open"></i>
            <p v-if="allResources.length === 0">目前尚無已上架資源，請稍後再來查看</p>
            <p v-else-if="radiusKm">{{ radiusKm }} 公里內沒有符合條件的資源，請放寬距離範圍</p>
            <p v-else>目前沒有符合條件的資源，請調整搜尋條件</p>
          </div>

          <div v-else class="result-grid">
            <article v-for="{ resource: res, card, distanceKm } in rankedCards" :key="res.id" class="result-card">
              <div class="result-media" aria-hidden="true">
                <i class="fa-solid fa-image"></i>
              </div>
              <div class="result-content">
                <span v-if="card.badge" class="result-badge">{{ card.badge }}</span>
                <h3 class="result-title">{{ card.title }}</h3>
                <p v-if="geoState.status === 'located'" :class="['result-distance', { unknown: distanceKm === null }]">
                  <i class="fa-solid fa-route" aria-hidden="true"></i>
                  {{ distanceKm === null ? "未提供位置" : formatDistance(distanceKm) }}
                </p>
                <p class="result-desc">{{ card.description }}</p>
                <ul class="result-meta">
                  <li>
                    <i class="fa-solid fa-location-dot"></i>
                    {{ card.region }}
                  </li>
                  <li v-if="card.place">
                    <i class="fa-solid fa-building"></i>
                    {{ card.place }}
                  </li>
                  <li v-if="card.audience">
                    <i class="fa-solid fa-user-group"></i>
                    適用：{{ card.audience }}
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
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { normalizeCityName } from "../config/districts.js";
import { GEOLOCATION_MAX_AGE_MS, GEOLOCATION_TIMEOUT_MS, NEARBY_RADIUS_OPTIONS } from "../config/location.js";
import { formatDistance, geolocationErrorMessage, rankByDistance } from "../utils/geo.js";
import { NEED_TAGS, PRESCRIPTION_TYPES, getNeedTagLabel } from "../config/needTags.js";
import { AGE_GROUPS, IDENTITIES } from "../config/resourceOptions.js";
import { getRecommendableResources } from "../services/resourceService.js";
import { exploreCard } from "../services/listViews.js";
import {
  cityOptionGroups,
  collectCodes,
  districtOptions,
  filterResources,
} from "../services/resourceSearch.js";
import { goBack } from "../utils/navigation.js";

const route = useRoute();
const router = useRouter();

// 只列出符合推薦規則的資源（探索頁情境）
const allResources = ref(getRecommendableResources("explore"));

// 篩選條件以網址 query 為準，可分享、重新整理後保留；首頁的快捷入口也是帶 query 進來
//   keyword, address, city, district, type, tags, age, identity（後三者以逗號分隔）, nearby
const splitList = (value) => String(value || "").split(",").filter(Boolean);

const filters = computed(() => ({
  keyword: String(route.query.keyword || ""),
  address: String(route.query.address || ""),
  city: route.query.city ? normalizeCityName(route.query.city) : "",
  district: String(route.query.district || ""),
  type: String(route.query.type || ""),
  tags: splitList(route.query.tags),
  ageGroups: splitList(route.query.age),
  identities: splitList(route.query.identity),
  nearby: String(route.query.nearby || "") === "true",
  radius: String(route.query.radius || ""),
}));

// 搜尋框可自由輸入，按下搜尋才寫入 query
const keyword = ref("");
const address = ref("");
watch(
  filters,
  (f) => {
    keyword.value = f.keyword;
    address.value = f.address;
  },
  { immediate: true }
);

const filteredResources = computed(() => filterResources(allResources.value, filters.value));

const hasFilters = computed(() => {
  const f = filters.value;
  return !!(
    f.keyword ||
    f.address ||
    f.city ||
    f.district ||
    f.type ||
    f.tags.length ||
    f.ageGroups.length ||
    f.identities.length ||
    f.nearby ||
    f.radius
  );
});

// ── 選項 ──
const prescriptionTypeOptions = PRESCRIPTION_TYPES.filter((t) => t.code !== "other");
const ageOptions = AGE_GROUPS.filter((o) => o.code !== "all");
const identityOptions = IDENTITIES.filter((o) => o.code !== "all" && o.code !== "other");

// 需求標籤只列出有資源的，另外保留目前已選的（避免從首頁帶來的條件看不到）
const tagOptions = computed(() => {
  const used = collectCodes(allResources.value, "needTags", NEED_TAGS.map((t) => t.code));
  const selected = filters.value.tags.filter((t) => !used.includes(t));
  return [...used, ...selected].filter((t) => t !== "other");
});

// 地區兩層選單：縣市依直轄市、市、縣分組；行政區只列出所選縣市的
const cityGroups = computed(() => cityOptionGroups(allResources.value));
const districtOptionList = computed(() => districtOptions(allResources.value, filters.value.city));

// ── 更新 query ──
// 搜尋與篩選一律用 replace：探索頁在瀏覽器歷史中只占一筆，「返回」才會回到進入探索頁之前的頁面
const updateQuery = (patch) => {
  const next = { ...route.query, ...patch };
  const query = Object.fromEntries(
    Object.entries(next).filter(([, v]) => v !== "" && v !== null && v !== undefined)
  );
  router.replace({ path: "/explore", query });
};

const QUERY_KEYS = { tags: "tags", ageGroups: "age", identities: "identity" };

const submitSearch = () =>
  updateQuery({ keyword: keyword.value.trim(), address: address.value.trim() });

const setFilter = (key, value) => updateQuery({ [key]: value });

// 換縣市時清除行政區（不同縣市有同名行政區，不能沿用）
const setCity = (city) => updateQuery({ city, district: "" });

const toggleFilter = (key, code) => {
  const current = filters.value[key];
  const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
  updateQuery({ [QUERY_KEYS[key]]: next.join(",") });
};

// ── 使用目前位置 ──
// 用瀏覽器定位取得民眾位置，只存在這個頁面的記憶體中，不寫入網址、不儲存、不傳送
const geoState = ref({ status: "idle", position: null, message: "" });

const locate = () => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    geoState.value = { status: "error", position: null, message: geolocationErrorMessage("unsupported") };
    return;
  }
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    geoState.value = { status: "error", position: null, message: geolocationErrorMessage("insecure") };
    return;
  }
  geoState.value = { status: "locating", position: null, message: "" };
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      geoState.value = { status: "located", position: { lat: coords.latitude, lng: coords.longitude }, message: "" };
    },
    (error) => {
      geoState.value = { status: "error", position: null, message: geolocationErrorMessage(error.code) };
    },
    { enableHighAccuracy: false, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_MAX_AGE_MS }
  );
};

// 網址帶 nearby=true（含首頁「找我附近的資源」）時啟動定位；取消時清除位置
watch(
  () => filters.value.nearby,
  (nearby) => {
    if (nearby) locate();
    else geoState.value = { status: "idle", position: null, message: "" };
  },
  { immediate: true }
);

const useNearby = () => (filters.value.nearby ? locate() : updateQuery({ nearby: "true" }));
const stopNearby = () => updateQuery({ nearby: "", radius: "" });

const radiusOptions = [
  ...NEARBY_RADIUS_OPTIONS.map((km) => ({ value: String(km), label: `${km} 公里` })),
  { value: "", label: "不限" },
];
const radiusValue = computed(() =>
  NEARBY_RADIUS_OPTIONS.map(String).includes(filters.value.radius) ? filters.value.radius : ""
);
const radiusKm = computed(() =>
  geoState.value.status === "located" && radiusValue.value ? Number(radiusValue.value) : null
);

// 定位成功時依距離排序（可再限制範圍），其他篩選條件照常套用；沒有座標的資源排在最後
const rankedResults = computed(() =>
  geoState.value.status === "located"
    ? rankByDistance(filteredResources.value, geoState.value.position, { radiusKm: radiusKm.value })
    : filteredResources.value.map((resource) => ({ resource, distanceKm: null }))
);

// 卡片顯示資料與角色預覽面板共用（services/listViews.js 的 exploreCard）
const rankedCards = computed(() => rankedResults.value.map((r) => ({ ...r, card: exploreCard(r.resource) })));

const focusRegion = () => {
  const select = document.getElementById("city-filter");
  select?.scrollIntoView({ behavior: "smooth", block: "center" });
  select?.focus();
};

const clearFilters = () => router.replace({ path: "/explore" });

const back = () => goBack(router, "/");
const goResource = (id) => router.push(`/user/resources/${id}`);
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

.nearby-panel {
  margin-bottom: 20px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #f5f0eb;
  border: 1px solid rgba(194, 149, 110, 0.35);
  color: #5d4037;
  font-size: 14px;
}

.nearby-panel p {
  margin: 0 0 6px;
}

.nearby-panel small {
  display: block;
  color: #8d6e63;
}

.nearby-panel.error {
  background: #fff8f2;
  border-color: #ffb74d;
}

.nearby-title {
  font-weight: 700;
}

.radius-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.radius-label {
  font-size: 13px;
  font-weight: 600;
  margin-right: 4px;
}

.nearby-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.nearby-stop {
  margin-top: 10px;
  padding: 0;
  border: none;
  background: none;
  color: #b98158;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.nearby-actions .nearby-stop {
  margin-top: 0;
}

.result-distance {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #2e7d32;
}

.result-distance.unknown {
  color: #9e9e9e;
  font-weight: 600;
}

.filter-block select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.filters-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.clear-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: #b98158;
  text-decoration: underline;
  cursor: pointer;
}
.filter-title small {
  font-weight: 400;
  color: #a1887f;
}
</style>
