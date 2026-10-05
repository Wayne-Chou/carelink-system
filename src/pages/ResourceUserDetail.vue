<template>
  <div class="detail-page">
    <div class="container py-5">
      <button class="back-btn" @click="back">← 返回</button>

      <template v-if="resource">
        <header class="hero-card">
          <div class="tags">
            <span v-for="t in resource.prescriptionTypes" :key="t" class="type-tag">
              {{ getPrescriptionTypeLabel(t) }}
            </span>
          </div>
          <h1 class="title">{{ resource.name }}</h1>
          <p class="org">{{ resource.organization }}</p>
          <p v-if="resource.description" class="lead">{{ resource.description }}</p>
          <div v-if="needTagLabels.length" class="tags need-tags">
            <span v-for="label in needTagLabels" :key="label">#{{ label }}</span>
          </div>
        </header>

        <div class="layout">
          <main class="main-col">
            <section class="section">
              <h3>服務時間</h3>
              <p class="emphasis">{{ formatSchedule(resource.schedule) || "請洽詢聯絡人" }}</p>
              <p v-if="availabilityText" :class="['availability', resource.availability.type]">
                {{ availabilityText }}
              </p>
              <p v-if="capacityText" class="muted">{{ capacityText }}</p>
            </section>

            <section class="section">
              <h3>適合誰參加</h3>
              <p v-if="resource.scenarios" class="scenario">{{ resource.scenarios }}</p>
              <p v-if="audienceText">適用對象：{{ audienceText }}</p>
              <p v-if="resource.notSuitableFor" class="caution">
                <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                以下情況可能不適合：{{ resource.notSuitableFor }}
              </p>
            </section>

            <section class="section">
              <h3>如何參加</h3>
              <dl class="info-list">
                <div v-if="participationText">
                  <dt>參與方式</dt>
                  <dd>{{ participationText }}</dd>
                </div>
                <div v-if="feeText">
                  <dt>費用</dt>
                  <dd>{{ feeText }}</dd>
                </div>
                <div v-if="languageText">
                  <dt>使用語言</dt>
                  <dd>{{ languageText }}</dd>
                </div>
                <div v-if="resource.notice">
                  <dt>參與須知</dt>
                  <dd>{{ resource.notice }}</dd>
                </div>
              </dl>
            </section>

            <section v-if="accessibilityText" class="section">
              <h3>無障礙與友善設計</h3>
              <div class="tags">
                <span v-for="label in accessibilityText" :key="label">{{ label }}</span>
              </div>
            </section>

            <section v-if="resource.staff.length" class="section">
              <h3>服務人員</h3>
              <ul class="staff-list">
                <li v-for="(person, i) in resource.staff" :key="i">
                  <strong>{{ person.role || "服務人員" }}</strong>
                  <span v-if="person.name">{{ person.name }}</span>
                  <small v-if="person.license">{{ person.license }}</small>
                  <small v-if="person.experience">{{ person.experience }}</small>
                </li>
              </ul>
            </section>
          </main>

          <aside class="side-col">
            <section class="side-card">
              <h3>地點與交通</h3>
              <p v-if="resource.placeName" class="emphasis">{{ resource.placeName }}</p>
              <p v-if="addressText" class="addr">{{ addressText }}</p>
              <a
                v-if="resource.address.detail"
                :href="mapLink"
                target="_blank"
                rel="noopener"
                class="map-link"
              >
                <i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> 在地圖中查看
              </a>
              <ul v-if="transportItems.length" class="transport-list">
                <li v-for="item in transportItems" :key="item">{{ item }}</li>
              </ul>
            </section>

            <section class="side-card">
              <h3>聯絡方式</h3>
              <p v-if="resource.publicContact.name" class="emphasis">{{ resource.publicContact.name }}</p>
              <ul class="contact-list">
                <li v-if="resource.publicContact.phone">
                  <i class="fa-solid fa-phone" aria-hidden="true"></i>
                  <a :href="`tel:${resource.publicContact.phone}`">{{ resource.publicContact.phone }}</a>
                </li>
                <li v-if="resource.publicContact.emailOrLine">
                  <i
                    :class="isEmail(resource.publicContact.emailOrLine) ? 'fa-solid fa-envelope' : 'fa-solid fa-comment'"
                    aria-hidden="true"
                  ></i>
                  <a
                    v-if="isEmail(resource.publicContact.emailOrLine)"
                    :href="`mailto:${resource.publicContact.emailOrLine}`"
                  >
                    {{ resource.publicContact.emailOrLine }}
                  </a>
                  <span v-else>{{ resource.publicContact.emailOrLine }}</span>
                </li>
                <li v-for="link in resource.links" :key="link">
                  <i class="fa-solid fa-link" aria-hidden="true"></i>
                  <a :href="link" target="_blank" rel="noopener noreferrer">{{ link }}</a>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </template>

      <div v-else class="unavailable">
        <i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
        <p>{{ availability.message }}</p>
        <button type="button" class="back-btn" @click="$router.push('/explore')">
          瀏覽其他社區資源
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getNeedTagLabel, getPrescriptionTypeLabel } from "../config/needTags.js";
import {
  ACCESSIBILITY_OPTIONS,
  AVAILABILITY_TYPES,
  FEE_TYPES,
  LANGUAGES,
  PARTICIPATION_OPTIONS,
  TRANSPORT_OPTIONS,
  optionLabel,
} from "../config/resourceOptions.js";
import { getResourceById } from "../services/resourceService.js";
import { getPublicAvailability, toPublicResource } from "../services/publicResource.js";
import { goBack } from "../utils/navigation.js";
import {
  formatAddress,
  formatAudience,
  formatCapacity,
  formatSchedule,
} from "../utils/resourceFormat.js";

const route = useRoute();
const router = useRouter();

// 頁面只拿到白名單內的公開欄位（見 publicResource.js）
const raw = getResourceById(route.params.id);
const availability = getPublicAvailability(raw);
const resource = toPublicResource(raw);

// 從探索頁或首頁進來就回上一頁；直接開啟網址時回探索頁
const back = () => goBack(router, "/explore");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const needTagLabels = computed(() =>
  (resource?.needTags || []).map((code) =>
    code === "other" && resource.needTagOther ? resource.needTagOther : getNeedTagLabel(code)
  )
);

const audienceText = computed(() => {
  const base = formatAudience(resource);
  const other = resource?.identities?.includes("other") && resource.identityOther;
  return [base === "不限對象" && other ? "" : base, other].filter(Boolean).join("、");
});

const availabilityText = computed(() => {
  const a = resource?.availability;
  if (!a?.type) return "";
  if (a.type === "full") return `目前額滿${a.nextBatch ? `，下梯次：${a.nextBatch}` : ""}`;
  if (a.type === "available" && a.slots) return `${optionLabel(AVAILABILITY_TYPES, a.type)}（尚餘 ${a.slots} 名）`;
  if (a.type === "realtime") return "名額請先洽詢聯絡人";
  return optionLabel(AVAILABILITY_TYPES, a.type);
});

const capacityText = computed(() => {
  const text = formatCapacity(resource?.capacity);
  return text && resource.capacity.type !== "other" ? `可容納人數：${text}` : "";
});

const participationText = computed(() => {
  const p = resource?.participation;
  if (p === "other") return resource.participationOther || "";
  if (p === "referral_only") return "僅接受轉介（請洽健康管理員或社工協助轉介）";
  return optionLabel(PARTICIPATION_OPTIONS, p);
});

const feeText = computed(() => {
  const fee = resource?.fee;
  if (!fee?.type) return "";
  const label = optionLabel(FEE_TYPES, fee.type);
  return fee.detail ? `${label}：${fee.detail}` : label;
});

const languageText = computed(() =>
  (resource?.languages || [])
    .map((code) => {
      if (code === "indigenous" && resource.indigenousTribe) return `原住民語（${resource.indigenousTribe}）`;
      if (code === "other" && resource.languageOther) return resource.languageOther;
      return optionLabel(LANGUAGES, code);
    })
    .filter(Boolean)
    .join("、")
);

const accessibilityText = computed(() => {
  const labels = (resource?.accessibility || [])
    .map((code) =>
      code === "other" ? resource.accessibilityOther : optionLabel(ACCESSIBILITY_OPTIONS, code)
    )
    .filter(Boolean);
  return labels.length ? labels : null;
});

const transportItems = computed(() => {
  const note = resource?.transportNote || {};
  const notes = { public_transit: note.publicTransit, shuttle: note.shuttle, other: note.other };
  return (resource?.transport || [])
    .map((code) => {
      const detail = notes[code];
      if (code === "other") return detail || "";
      const label = optionLabel(TRANSPORT_OPTIONS, code);
      return detail ? `${label}：${detail}` : label;
    })
    .filter(Boolean);
});

const addressText = computed(() => (resource ? formatAddress(resource.address) : ""));

const mapLink = computed(() => {
  const a = resource?.address || {};
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${a.city || ""}${a.district || ""}${a.detail || ""}`
  )}`;
});
</script>

<style scoped>
.detail-page {
  background: #f5f1ed;
  min-height: 100vh;
  padding-bottom: 40px;
  font-family: "Inter", "Noto Sans TC", sans-serif;
  color: #6d4c41;
}

/* 返回按鈕 */
.back-btn {
  background: #ffffff;
  color: #3e2723;
  padding: 10px 20px;
  font-weight: 700;
  border: 1px solid #eadfd8;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  transition: all 0.2s ease;
  border-radius: 8px;
}
.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(62, 39, 35, 0.18);
}

/* 標題卡 */
.hero-card {
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 32px 35px;
  margin-top: 20px;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
}
.title {
  font-size: 28px;
  font-weight: 900;
  color: #3e2723;
  margin: 12px 0 6px;
  overflow-wrap: anywhere;
}
.org {
  color: #8d6e63;
  font-size: 14px;
  margin-bottom: 16px;
}
.lead {
  font-size: 16px;
  line-height: 1.8;
  color: #5d4037;
  margin-bottom: 16px;
}

/* 版面 */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  margin-top: 24px;
  align-items: start;
}
.main-col {
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 30px 35px;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
}
.side-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.side-card {
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 24px;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
}

/* 區塊 */
.section + .section {
  margin-top: 28px;
}
.section h3,
.side-card h3 {
  font-size: 16px;
  font-weight: 800;
  color: #3e2723;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 4px solid #c8a27c;
}
.section p,
.side-card p {
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 6px;
}
.emphasis {
  font-weight: 700;
  color: #3e2723;
}
.muted {
  color: #a1887f;
  font-size: 14px !important;
}
.scenario {
  font-weight: 600;
  color: #3e2723;
}
.caution {
  background: #fdf8f4;
  border: 1px solid #eadfd8;
  padding: 10px 12px;
  font-size: 14px !important;
}
.availability {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 13px !important;
  font-weight: 700;
  background: #f5f1ed;
}
.availability.available {
  background: #edf7ee;
  color: #1b5e20;
}
.availability.full {
  background: #fff8e1;
  color: #8a5a00;
}

.info-list {
  margin: 0;
  display: grid;
  gap: 12px;
}
.info-list dt {
  font-size: 13px;
  font-weight: 600;
  color: #8d6e63;
  margin-bottom: 2px;
}
.info-list dd {
  margin: 0;
  font-size: 15px;
  color: #3e2723;
  line-height: 1.6;
}

/* 標籤 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tags span {
  background: #f5f1ed;
  color: #3e2723;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #eadfd8;
}
.tags .type-tag {
  background: #3e2723;
  color: #fff;
  border-color: #3e2723;
}
.need-tags span {
  background: transparent;
  color: #b98158;
  border: none;
  padding: 0;
}

.staff-list,
.transport-list,
.contact-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.staff-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px dashed #eadfd8;
}
.staff-list strong {
  color: #3e2723;
}
.staff-list small {
  color: #8d6e63;
}
.addr {
  font-size: 14px !important;
  color: #8d6e63;
}
.map-link {
  display: inline-block;
  margin: 4px 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #b98158;
  text-decoration: none;
}
.map-link:hover {
  text-decoration: underline;
}
.transport-list li {
  font-size: 14px;
  padding: 6px 0;
  border-top: 1px dashed #eadfd8;
}
.contact-list li {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 6px 0;
  font-size: 15px;
  overflow-wrap: anywhere;
}
.contact-list i {
  color: #b98158;
  width: 16px;
  flex-shrink: 0;
}
.contact-list a {
  color: #6d4c41;
  text-decoration: none;
  border-bottom: 1px dashed #c8a27c;
}
.contact-list a:hover {
  color: #3e2723;
}

/* 無法查看 */
.unavailable {
  background: #ffffff;
  border: 1px solid #eadfd8;
  margin-top: 20px;
  padding: 60px 20px;
  text-align: center;
}
.unavailable i {
  font-size: 40px;
  color: #c8a27c;
  margin-bottom: 12px;
}
.unavailable p {
  font-size: 16px;
  color: #5d4037;
  margin-bottom: 20px;
}

/* 手機 */
@media (max-width: 992px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 576px) {
  .hero-card,
  .main-col {
    padding: 22px 16px;
  }
  .title {
    font-size: 22px;
  }
}
</style>
