<template>
  <div class="detail-page">
    <div class="container py-5">
      <nav class="nav-header mb-4">
        <button class="back-btn" @click="back">
          <i class="fa-solid fa-chevron-left me-2" aria-hidden="true"></i>返回
        </button>
        <button v-if="resource" class="edit-btn" @click="$router.push(`/form/${resource.id}`)">
          <i class="fa-solid fa-pen-to-square me-2" aria-hidden="true"></i>編輯
        </button>
      </nav>

      <div v-if="resource && savedNotice" class="saved-banner" role="status">
        <span>
          <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
          已儲存變更
          <template v-if="savedNotice.missing > 0">
            ，有 {{ savedNotice.missing }} 個建議欄位未填，建議之後補齊
          </template>
        </span>
        <button type="button" class="banner-close" aria-label="關閉提示" @click="savedNotice = null">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div v-if="resource" class="main-layout">
        <aside class="sidebar">
          <!-- 基本身分與狀態 -->
          <div class="profile-card">
            <span class="status-badge" :class="resource.status">
              {{ optionLabel(STATUS_OPTIONS, resource.status) || "狀態未填" }}
            </span>
            <h1 class="resource-name">{{ resource.name || "未命名資源" }}</h1>
            <p class="org-name"><FieldValue :value="resource.organization" empty-text="所屬單位未填寫" /></p>

            <div class="resource-id-tag">
              <small>RESOURCE ID</small>
              <span>{{ resource.id }}</span>
              <small class="mt-2">資源編碼</small>
              <span><FieldValue :value="resource.code" /></span>
            </div>

            <div v-if="resource.status === 'paused'" class="status-note">
              <p><strong>暫停原因：</strong><FieldValue :value="resource.pauseReason" /></p>
              <p><strong>預計恢復：</strong><FieldValue :value="resource.resumeAt" /></p>
            </div>
            <div v-if="resource.status === 'seasonal'" class="status-note">
              <p><strong>季節週期：</strong><FieldValue :value="resource.seasonalNote" /></p>
            </div>
          </div>

          <!-- 曝光狀態 -->
          <div class="side-card">
            <h2 class="side-title">曝光狀態</h2>
            <ul class="visibility-list">
              <li v-for="item in visibilityRows" :key="item.key">
                <span>{{ item.label }}</span>
                <span :class="['visibility-badge', item.visible ? 'on' : 'off']">
                  <i
                    :class="item.visible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'"
                    aria-hidden="true"
                  ></i>
                  {{ item.visible ? "會顯示" : "不顯示" }}
                </span>
              </li>
            </ul>
            <div v-if="hiddenReasons.length" class="reason-box">
              <p class="reason-title">不顯示的原因</p>
              <ul>
                <li v-for="reason in hiddenReasons" :key="reason.code">
                  {{ reason.text }}
                  <span v-if="reason.onlyReferral" class="reason-scope">僅影響轉介選單</span>
                </li>
              </ul>
            </div>
            <p v-if="resource.riskLevel === 'yellow' && visibility.referral.visible" class="escort-note">
              <i class="fa-solid fa-user-nurse" aria-hidden="true"></i>
              轉介時會提示「需健康管理員陪同至少一次」
            </p>
          </div>

          <!-- 驗證資訊 -->
          <div class="side-card">
            <h2 class="side-title">
              驗證資訊
              <span v-if="overdue" class="overdue-badge">待驗證</span>
            </h2>
            <dl class="info-group">
              <div class="info-item">
                <dt>驗證者</dt>
                <dd>
                  <FieldValue :value="resource.verifiedBy?.name" />
                  <small v-if="resource.verifiedBy?.type" class="muted">
                    （{{ optionLabel(VERIFIER_TYPES, resource.verifiedBy.type) }}）
                  </small>
                </dd>
              </div>
              <div class="info-item">
                <dt>最後驗證日期</dt>
                <dd><FieldValue :value="resource.lastVerifiedAt" /></dd>
              </div>
              <div class="info-item">
                <dt>預計驗證日期</dt>
                <dd :class="{ 'text-overdue': overdue }">
                  <FieldValue :value="resource.nextVerifyAt" />
                </dd>
              </div>
              <div class="info-item">
                <dt>建立時間</dt>
                <dd><FieldValue :value="formatDateTime(resource.createdAt)" /></dd>
              </div>
              <div class="info-item">
                <dt>最後修改</dt>
                <dd><FieldValue :value="formatDateTime(resource.updatedAt)" /></dd>
              </div>
            </dl>
          </div>
        </aside>

        <main class="content-area">
          <div class="summary-row">
            <div class="glass-card">
              <div class="card-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></div>
              <div class="card-info">
                <label>處方類型</label>
                <div class="tag-group">
                  <span v-for="t in resource.prescriptionTypes" :key="t" class="luxury-tag">
                    {{ getPrescriptionTypeLabel(t) }}
                  </span>
                  <FieldValue v-if="!resource.prescriptionTypes.length" :value="null" />
                </div>
              </div>
            </div>
            <div class="glass-card">
              <div class="card-icon"><i class="fa-solid fa-tags" aria-hidden="true"></i></div>
              <div class="card-info">
                <label>需求標籤</label>
                <div class="tag-group">
                  <span v-for="tag in resource.needTags" :key="tag" class="luxury-tag">
                    {{ tag === "other" && resource.needTagOther ? `其他：${resource.needTagOther}` : getNeedTagLabel(tag) }}
                  </span>
                  <FieldValue v-if="!resource.needTags.length" :value="null" />
                </div>
              </div>
            </div>
          </div>

          <!-- 二、資源內容 -->
          <section class="content-section">
            <h3 class="section-title">資源內容</h3>
            <div class="data-row full">
              <label>資源內容</label>
              <p class="description-text"><FieldValue :value="resource.description" /></p>
            </div>
            <dl class="data-grid">
              <div class="data-row">
                <dt>可容納人數</dt>
                <dd><FieldValue :value="formatCapacity(resource.capacity)" /></dd>
              </div>
              <div class="data-row">
                <dt>服務量能</dt>
                <dd>
                  <FieldValue :value="optionLabel(AVAILABILITY_TYPES, resource.availability.type)" />
                  <small v-if="resource.availability.slots !== null" class="muted">
                    （可用名額 {{ resource.availability.slots }}）
                  </small>
                </dd>
              </div>
              <div v-if="resource.availability.type === 'full'" class="data-row full">
                <dt>下梯次</dt>
                <dd><FieldValue :value="resource.availability.nextBatch" /></dd>
              </div>
              <div class="data-row full">
                <dt>服務週期</dt>
                <dd><FieldValue :value="formatSchedule(resource.schedule)" /></dd>
              </div>
              <div class="data-row full">
                <dt>地點名稱</dt>
                <dd><FieldValue :value="resource.placeName" /></dd>
              </div>
              <div class="data-row full">
                <dt>地址</dt>
                <dd>
                  <FieldValue :value="formatAddress(resource.address)" />
                  <a
                    v-if="resource.address.detail"
                    :href="mapLink"
                    target="_blank"
                    rel="noopener"
                    class="map-link"
                  >
                    <i class="fa-solid fa-map-location-dot" aria-hidden="true"></i> 在地圖中查看
                  </a>
                </dd>
              </div>
            </dl>

            <h4 class="sub-title">人力配置</h4>
            <div v-if="resource.staff.length" class="table-wrap">
              <table class="staff-table">
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>角色</th>
                    <th>證照種類</th>
                    <th>專業經驗</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(person, i) in resource.staff" :key="i">
                    <td><FieldValue :value="person.name" /></td>
                    <td><FieldValue :value="person.role" /></td>
                    <td><FieldValue :value="person.license" empty-text="無" /></td>
                    <td><FieldValue :value="person.experience" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <FieldValue v-else :value="null" />
          </section>

          <!-- 三、安全與風險評級 -->
          <section class="content-section">
            <h3 class="section-title">安全與風險評級</h3>
            <div :class="['risk-summary', resource.riskLevel || 'none']">
              <template v-if="resource.riskLevel">
                <strong>
                  整體風險：{{ RISK_ICON[resource.riskLevel] }}
                  {{ optionLabel(RISK_LEVEL_OPTIONS, resource.riskLevel) }}
                </strong>
                <span>{{ riskDescription(resource.riskLevel) }}</span>
              </template>
              <template v-else>
                <strong>整體風險：尚未評估</strong>
                <span>五項判斷條件未填齊</span>
              </template>
            </div>

            <ul class="criteria-list">
              <li v-for="c in RISK_CRITERIA" :key="c.key">
                <span>{{ c.label }}</span>
                <span :class="['criteria-light', resource.riskCriteria[c.key] || 'none']">
                  <template v-if="resource.riskCriteria[c.key]">
                    {{ RISK_ICON[resource.riskCriteria[c.key]] }}
                    {{ optionLabel(RISK_LEVEL_OPTIONS, resource.riskCriteria[c.key]) }}
                  </template>
                  <template v-else>未填寫</template>
                </span>
              </li>
            </ul>

            <dl class="data-grid">
              <div class="data-row">
                <dt>高風險情境</dt>
                <dd>{{ resource.highRisk.isHighRisk ? "是" : "否" }}</dd>
              </div>
              <div v-if="resource.highRisk.isHighRisk" class="data-row">
                <dt>高風險類型</dt>
                <dd><FieldValue :value="optionLabels(HIGH_RISK_TYPES, resource.highRisk.types)" /></dd>
              </div>
              <div class="data-row full">
                <dt>風險調整說明</dt>
                <dd><FieldValue :value="resource.riskChangeNote" /></dd>
              </div>
            </dl>
            <p v-if="highRiskWithoutLicense" class="warning-box">
              <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              高風險情境且人力配置中沒有人持有證照，人員資格已依規則設為紅燈。
            </p>
          </section>

          <!-- 四、適用對象與可近性 -->
          <section class="content-section">
            <h3 class="section-title">適用對象與可近性</h3>
            <dl class="data-grid">
              <div class="data-row">
                <dt>適合年齡</dt>
                <dd><FieldValue :value="optionLabels(AGE_GROUPS, resource.ageGroups)" /></dd>
              </div>
              <div class="data-row">
                <dt>適合身分</dt>
                <dd>
                  <FieldValue :value="withOther(IDENTITIES, resource.identities, resource.identityOther)" />
                </dd>
              </div>
              <div class="data-row full">
                <dt>不適合對象</dt>
                <dd><FieldValue :value="resource.notSuitableFor" /></dd>
              </div>
              <div class="data-row">
                <dt>參與條件</dt>
                <dd>
                  <FieldValue
                    :value="
                      resource.participation === 'other' && resource.participationOther
                        ? `其他：${resource.participationOther}`
                        : optionLabel(PARTICIPATION_OPTIONS, resource.participation)
                    "
                  />
                </dd>
              </div>
              <div class="data-row">
                <dt>語言</dt>
                <dd><FieldValue :value="languageText" /></dd>
              </div>
              <div class="data-row full">
                <dt>交通可近性</dt>
                <dd>
                  <FieldValue :value="optionLabels(TRANSPORT_OPTIONS, resource.transport)" />
                  <ul v-if="transportNotes.length" class="note-list">
                    <li v-for="note in transportNotes" :key="note.label">
                      {{ note.label }}：{{ note.text }}
                    </li>
                  </ul>
                </dd>
              </div>
              <div class="data-row full">
                <dt>無障礙與包容性</dt>
                <dd>
                  <FieldValue
                    :value="withOther(ACCESSIBILITY_OPTIONS, resource.accessibility, resource.accessibilityOther)"
                  />
                </dd>
              </div>
              <div class="data-row">
                <dt>費用</dt>
                <dd><FieldValue :value="optionLabel(FEE_TYPES, resource.fee.type)" /></dd>
              </div>
              <div v-if="resource.fee.type && resource.fee.type !== 'free'" class="data-row">
                <dt>收費標準或補助資格</dt>
                <dd><FieldValue :value="resource.fee.detail" /></dd>
              </div>
              <div class="data-row full">
                <dt>參與須知</dt>
                <dd><FieldValue :value="resource.notice" /></dd>
              </div>
            </dl>
          </section>

          <!-- 五、協作介面 -->
          <section class="content-section">
            <h3 class="section-title">協作介面</h3>
            <dl class="data-grid">
              <div class="data-row">
                <dt>合作狀態</dt>
                <dd><FieldValue :value="optionLabel(PARTNERSHIP_OPTIONS, resource.partnership)" /></dd>
              </div>
              <div class="data-row">
                <dt>追蹤方式</dt>
                <dd>
                  <FieldValue
                    :value="withOther(FOLLOW_UP_METHODS, resource.followUpMethods, resource.followUpOther)"
                  />
                </dd>
              </div>
              <div class="data-row">
                <dt>公眾聯絡人</dt>
                <dd>
                  <FieldValue :value="resource.publicContact.name" />
                  <ul class="contact-list">
                    <li v-if="resource.publicContact.phone">
                      <a :href="`tel:${resource.publicContact.phone}`" class="link">
                        {{ resource.publicContact.phone }}
                      </a>
                    </li>
                    <li v-if="resource.publicContact.emailOrLine">
                      {{ resource.publicContact.emailOrLine }}
                    </li>
                  </ul>
                </dd>
              </div>
              <div class="data-row">
                <dt>行政聯絡人 <span class="badge-backend">僅後台</span></dt>
                <dd>
                  <template v-if="resource.adminContact.sameAsPublic">同公眾聯絡人</template>
                  <template v-else>
                    <FieldValue :value="resource.adminContact.name" />
                    <ul class="contact-list">
                      <li v-if="resource.adminContact.phone">
                        <a :href="`tel:${resource.adminContact.phone}`" class="link">
                          {{ resource.adminContact.phone }}
                        </a>
                      </li>
                      <li v-if="resource.adminContact.emailOrLine">
                        {{ resource.adminContact.emailOrLine }}
                      </li>
                    </ul>
                  </template>
                </dd>
              </div>
              <div class="data-row full">
                <dt>網站或社群連結</dt>
                <dd>
                  <ul v-if="resource.links.length" class="contact-list">
                    <li v-for="link in resource.links" :key="link">
                      <a :href="link" target="_blank" rel="noopener noreferrer" class="link">{{ link }}</a>
                    </li>
                  </ul>
                  <FieldValue v-else :value="null" />
                </dd>
              </div>
            </dl>
          </section>

          <!-- 六、AI 輔助欄位 -->
          <section class="content-section">
            <h3 class="section-title">AI 輔助欄位</h3>
            <div class="data-row full">
              <label>關鍵字</label>
              <div class="cloud-wrap">
                <span v-for="k in resource.keywords" :key="k" class="hash-tag"># {{ k }}</span>
                <FieldValue v-if="!resource.keywords.length" :value="null" />
              </div>
            </div>
            <div class="data-row full">
              <label>對應生活情境</label>
              <p class="description-text"><FieldValue :value="resource.scenarios" /></p>
            </div>
          </section>
        </main>
      </div>

      <div v-else class="not-found">
        <i class="fa-regular fa-folder-open" aria-hidden="true"></i>
        <p>找不到這筆資源，可能已被刪除。</p>
        <button class="back-btn" @click="$router.push('/list')">返回清單</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import FieldValue from "../components/FieldValue.vue";
import { getNeedTagLabel, getPrescriptionTypeLabel } from "../config/needTags.js";
import {
  ACCESSIBILITY_OPTIONS,
  AGE_GROUPS,
  AVAILABILITY_TYPES,
  FEE_TYPES,
  FOLLOW_UP_METHODS,
  HIGH_RISK_TYPES,
  IDENTITIES,
  LANGUAGES,
  PARTICIPATION_OPTIONS,
  PARTNERSHIP_OPTIONS,
  RISK_CRITERIA,
  RISK_LEVEL_OPTIONS,
  STATUS_OPTIONS,
  TRANSPORT_OPTIONS,
  VERIFIER_TYPES,
  optionLabel,
  optionLabels,
} from "../config/resourceOptions.js";
import { getVisibility } from "../config/resourceRules.js";
import { getResourceById, isVerifyOverdue } from "../services/resourceService.js";
import { consumeFlash } from "../utils/flash.js";
import { goBack } from "../utils/navigation.js";
import {
  formatAddress,
  formatCapacity,
  formatDateTime,
  formatSchedule,
} from "../utils/resourceFormat.js";

const route = useRoute();
const router = useRouter();
const resource = ref(null);
const back = () => goBack(router, "/list");

// 從編輯頁儲存後回來時的一次性提示（只顯示屬於這筆資源的）
const flash = consumeFlash("resource-saved");
const savedNotice = ref(flash && String(flash.id) === String(route.params.id) ? flash : null);

const RISK_ICON = { green: "🟢", yellow: "🟡", red: "🔴" };

watch(
  () => route.params.id,
  (id) => {
    resource.value = getResourceById(id);
  },
  { immediate: true }
);

const riskDescription = (code) => RISK_LEVEL_OPTIONS.find((o) => o.code === code)?.description ?? "";

// 多選代碼轉中文；含「其他」且有補充文字時顯示為「其他：xxx」
const withOther = (options, codes, otherText) =>
  (codes || [])
    .map((code) => (code === "other" && otherText ? `其他：${otherText}` : optionLabel(options, code) || code))
    .join("、");

const overdue = computed(() => !!resource.value && isVerifyOverdue(resource.value));
const visibility = computed(() => getVisibility(resource.value));

const visibilityRows = computed(() => [
  { key: "explore", label: "民眾探索頁", visible: visibility.value.explore.visible },
  { key: "referral", label: "轉介選單", visible: visibility.value.referral.visible },
]);

// 轉介選單的原因涵蓋探索頁的原因；只出現在轉介選單的另外標示
const hiddenReasons = computed(() => {
  const { explore, referral } = visibility.value;
  return referral.reasons.map((code) => ({
    code,
    text: reasonText(code),
    onlyReferral: !explore.reasons.includes(code),
  }));
});

function reasonText(code) {
  const r = resource.value;
  switch (code) {
    case "paused":
      return `資源暫停中${r.resumeAt ? `，預計 ${r.resumeAt} 恢復` : ""}${r.pauseReason ? `（${r.pauseReason}）` : ""}`;
    case "seasonal":
      return `季節性關閉${r.seasonalNote ? `：${r.seasonalNote}` : ""}`;
    case "terminated":
      return "資源已終止，資料保留供歷史個案查詢";
    case "contact_needed":
      return "合作狀態尚未確認，請聯繫資源單位確認";
    case "risk_tracking":
      return "風險紅燈，避免推薦並持續追蹤";
    case "risk_unassessed":
      return "尚未完成風險評估：五項判斷條件未填齊，沒有整體風險等級";
    default:
      return code;
  }
}

const highRiskWithoutLicense = computed(
  () =>
    resource.value?.highRisk?.isHighRisk &&
    !resource.value.staff.some((s) => String(s?.license ?? "").trim())
);

const languageText = computed(() => {
  const r = resource.value;
  return (r.languages || [])
    .map((code) => {
      if (code === "indigenous" && r.indigenousTribe) return `原住民語（${r.indigenousTribe}）`;
      if (code === "other" && r.languageOther) return `其他：${r.languageOther}`;
      return optionLabel(LANGUAGES, code) || code;
    })
    .join("、");
});

const transportNotes = computed(() => {
  const note = resource.value.transportNote || {};
  return [
    { label: "大眾運輸", text: note.publicTransit },
    { label: "專車接駁", text: note.shuttle },
    { label: "其他", text: note.other },
  ].filter((n) => n.text);
});

const mapLink = computed(
  () =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${resource.value.address.city}${resource.value.address.district}${resource.value.address.detail}`
    )}`
);
</script>

<style scoped>
.detail-page {
  background-color: #f5f1ed;
  min-height: 100vh;
  font-family: "Inter", "Noto Sans TC", sans-serif;
  color: #6d4c41;
  padding-bottom: 50px;
}

/* Layout */
.main-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

/* Sidebar */
.profile-card,
.side-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #eadfd8;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  margin-bottom: 24px;
}
.profile-card {
  padding: 40px 24px 28px;
  text-align: center;
}
.profile-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 6px;
  background: linear-gradient(90deg, #3e2723, #c8a27c);
}
.side-card {
  padding: 22px 24px;
}
.side-title {
  font-size: 16px;
  font-weight: 900;
  color: #3e2723;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
  background: #f5f1ed;
  color: #6d4c41;
}
.status-badge.active {
  background: #ecfdf5;
  color: #166534;
}
.status-badge.paused {
  background: #fffbeb;
  color: #92400e;
}
.status-badge.terminated {
  background: #fef2f2;
  color: #991b1b;
}
.status-badge.seasonal {
  background: #eff6ff;
  color: #1e40af;
}

.resource-name {
  font-size: 26px;
  font-weight: 900;
  color: #3e2723;
  margin-bottom: 10px;
  letter-spacing: -0.5px;
  overflow-wrap: anywhere;
}
.org-name {
  color: #6d4c41;
  font-size: 15px;
  margin-bottom: 24px;
}

.resource-id-tag {
  background: #f5f1ed;
  padding: 12px;
  display: flex;
  flex-direction: column;
  border: 1px solid #eadfd8;
  text-align: left;
}
.resource-id-tag small {
  font-size: 10px;
  color: #6d4c41;
  font-weight: 800;
  letter-spacing: 1px;
}
.resource-id-tag span {
  font-family: "Courier New", monospace;
  font-weight: 700;
  color: #3e2723;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.status-note {
  margin-top: 16px;
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  text-align: left;
  font-size: 13px;
}
.status-note p {
  margin: 0 0 4px;
}
.status-note p:last-child {
  margin-bottom: 0;
}

/* 曝光狀態 */
.visibility-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}
.visibility-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed #eadfd8;
  font-weight: 700;
  color: #3e2723;
}
.visibility-badge {
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.visibility-badge.on {
  background: #ecfdf5;
  color: #166534;
}
.visibility-badge.off {
  background: #fef2f2;
  color: #991b1b;
}
.reason-box {
  background: #fdf8f4;
  border: 1px solid #eadfd8;
  padding: 12px 14px;
  font-size: 13px;
}
.reason-title {
  font-weight: 800;
  color: #5d4037;
  margin: 0 0 6px;
}
.reason-box ul {
  margin: 0;
  padding-left: 18px;
  line-height: 1.7;
}
.reason-scope {
  display: inline-block;
  margin-left: 4px;
  font-size: 11px;
  color: #8d6e63;
  border: 1px solid #e0d5cb;
  border-radius: 999px;
  padding: 0 8px;
}
.escort-note {
  margin: 12px 0 0;
  font-size: 13px;
  color: #8a5a00;
  background: #fff8e1;
  border: 1px solid #ffe082;
  padding: 10px 12px;
}

/* 驗證資訊 */
.info-group {
  margin: 0;
}
.info-item {
  margin-bottom: 12px;
  font-size: 13px;
}
.info-item dt {
  font-weight: 600;
  color: #8d6e63;
  margin-bottom: 2px;
}
.info-item dd {
  font-weight: 700;
  color: #3e2723;
  margin: 0;
}
.overdue-badge {
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: #d84315;
  border-radius: 999px;
  padding: 2px 10px;
}
.text-overdue {
  color: #d84315 !important;
}
.muted {
  color: #8d6e63;
  font-weight: 400;
}

/* Summary Cards */
.summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}
.glass-card {
  background: linear-gradient(135deg, #ffffff, #f5f1ed);
  padding: 24px;
  display: flex;
  gap: 20px;
  border: 1px solid #eadfd8;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
}
.card-icon {
  flex-shrink: 0;
  font-size: 22px;
  color: #8d6e63;
  background: #fff;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eadfd8;
}
.card-info label {
  font-size: 13px;
  color: #6d4c41;
  font-weight: 600;
  margin-bottom: 8px;
  display: block;
}
.luxury-tag {
  display: inline-block;
  background: #f5f1ed;
  color: #3e2723;
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 600;
  margin: 0 6px 6px 0;
  border: 1px solid #eadfd8;
}

/* Sections */
.content-section {
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
}
.section-title {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #3e2723;
  margin-bottom: 24px;
  position: relative;
  padding-left: 15px;
}
.section-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 20%;
  width: 5px;
  height: 60%;
  background: linear-gradient(180deg, #c8a27c, #3e2723);
}
.sub-title {
  font-size: 15px;
  font-weight: 800;
  color: #5d4037;
  margin: 28px 0 12px;
}

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 30px;
  margin: 0;
}
.data-row.full {
  grid-column: 1 / -1;
}
.content-section > .data-row.full {
  margin-bottom: 20px;
}
.data-row dt,
.data-row label {
  display: block;
  font-size: 13px;
  color: #6d4c41;
  font-weight: 600;
  margin-bottom: 6px;
}
.data-row dd {
  font-size: 15px;
  font-weight: 700;
  color: #3e2723;
  margin: 0;
  overflow-wrap: anywhere;
}
.link {
  color: #6d4c41;
  text-decoration: none;
  border-bottom: 1px dashed #c8a27c;
}
.map-link {
  display: inline-block;
  margin-left: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #b98158;
  text-decoration: none;
}
.map-link:hover {
  text-decoration: underline;
}
.description-text {
  line-height: 1.8;
  color: #6d4c41;
  background: #f5f1ed;
  padding: 18px 20px;
  margin: 0;
}
.note-list,
.contact-list {
  list-style: none;
  padding: 0;
  margin: 6px 0 0;
  font-weight: 400;
  font-size: 14px;
}
.badge-backend {
  font-size: 11px;
  font-weight: 600;
  color: #8d6e63;
  background: #f5f0ed;
  border: 1px solid #e0d5cb;
  border-radius: 999px;
  padding: 1px 8px;
  margin-left: 4px;
}

/* 人力配置 */
.table-wrap {
  overflow-x: auto;
}
.staff-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 480px;
}
.staff-table th {
  text-align: left;
  font-size: 12px;
  color: #8d6e63;
  font-weight: 700;
  padding: 8px 10px;
  border-bottom: 2px solid #eadfd8;
}
.staff-table td {
  padding: 10px;
  border-bottom: 1px solid #f0e8e2;
  color: #3e2723;
}

/* 風險 */
.risk-summary {
  padding: 14px 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  align-items: baseline;
  border: 1px solid #e0d5cb;
  background: #fdfbf9;
  color: #5d4037;
  margin-bottom: 18px;
}
.risk-summary.green {
  background: #edf7ee;
  border-color: #b7dfb9;
  color: #1b5e20;
}
.risk-summary.yellow {
  background: #fff8e1;
  border-color: #ffe082;
  color: #8a5a00;
}
.risk-summary.red {
  background: #fdecea;
  border-color: #f5c2c0;
  color: #b71c1c;
}
.risk-summary span {
  font-size: 14px;
}
.criteria-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}
.criteria-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #eadfd8;
  padding: 10px 12px;
  font-weight: 700;
  color: #3e2723;
  font-size: 14px;
}
.criteria-light {
  font-size: 13px;
}
.criteria-light.none {
  color: #bcaaa4;
  font-weight: 400;
}
.warning-box {
  margin: 20px 0 0;
  padding: 10px 14px;
  background: #fff4e5;
  color: #8a4b08;
  font-size: 13px;
  line-height: 1.6;
}

/* Tag Cloud */
.cloud-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.hash-tag {
  display: inline-block;
  color: #6d4c41;
  background: #f5f1ed;
  padding: 6px 16px;
  font-weight: 700;
  font-size: 14px;
  border: 1px solid #eadfd8;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.edit-btn {
  background: #5d4037;
  color: #fff;
  padding: 10px 20px;
  font-weight: 700;
  border: 1px solid #5d4037;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  transition: all 0.2s ease;
}
.edit-btn:hover {
  background: #3e2723;
  transform: translateY(-3px);
}
.saved-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: #edf7ee;
  border: 1px solid #b7dfb9;
  color: #1b5e20;
  font-weight: 600;
  font-size: 14px;
}
.banner-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px 8px;
}

/* Back Button */
.back-btn {
  background: #ffffff;
  color: #3e2723;
  padding: 10px 20px;
  font-weight: 700;
  border: 1px solid #eadfd8;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  transition: all 0.2s ease;
}
.back-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 32px rgba(62, 39, 35, 0.18);
}

.not-found {
  text-align: center;
  padding: 80px 20px;
  color: #8d6e63;
}
.not-found i {
  font-size: 40px;
  margin-bottom: 12px;
}

/* Mobile */
@media (max-width: 992px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
  .summary-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 576px) {
  .data-grid {
    grid-template-columns: 1fr;
  }
  .content-section {
    padding: 22px 16px;
  }
}
</style>
