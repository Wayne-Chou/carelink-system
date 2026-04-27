<template>
  <div class="detail-page">
    <div class="container py-5">
      <nav class="nav-header mb-4">
        <button class="back-btn" @click="$router.push('/list')">
          <i class="fa-solid fa-chevron-left me-2"></i>返回清單
        </button>
      </nav>

      <div v-if="resource" class="main-layout">
        <aside class="sidebar">
          <div class="profile-card">
            <span
              class="status-badge"
              :class="resource.status"
            >
              {{ statusMap[resource.status] || "未填寫" }}
            </span>
            <h1 class="resource-name">{{ resource.name || "未填寫" }}</h1>
            <p class="org-name">{{ resource.organization || "未填寫" }}單位</p>
            
            <div class="resource-id-tag">
              <small>RESOURCE ID</small>
              <span>#{{ resource.id || "--" }}</span>
            </div>

            <div class="info-group">
              <div class="info-item">
                <label>風險等級</label>
                <span :class="'risk ' + resource.riskLevel">
                  {{
                    resource.riskLevel === "green"
                      ? "🟢 低風險"
                      : resource.riskLevel === "yellow"
                      ? "🟡 中風險"
                      : "🔴 高風險"
                  }}
                </span>
              </div>

              <div class="info-item">
                <label>最後驗證</label>
                <span>{{ resource.lastVerifyDate || "未填寫" }}</span>
              </div>

              <div class="info-item">
                <label>下次驗證</label>
                <span>{{ resource.nextVerifyDate || "未填寫" }}</span>
              </div>

              <div v-if="resource.riskNote" class="info-item full">
                <label>風險說明</label>
                <p>{{ resource.riskNote }}</p>
              </div>
            </div>
          </div>

          <div class="quick-stats">
            <div class="info-pill">
              <div class="icon-circle"><i class="fa-solid fa-location-dot"></i></div>
              <div class="pill-content">
                <label>服務地點</label>
                <span class="val">{{ resource.locationName || "未填寫" }}</span>
              </div>
            </div>
          </div>
        </aside>

        <main class="content-area">
          <div class="summary-row">
            <div class="glass-card type-highlight">
               <div class="card-icon"><i class="fa-solid fa-layer-group"></i></div>
               <div class="card-info">
                 <label>資源類型</label>
                 <div class="tag-group">
                   <span v-for="t in resource.types || []" :key="t" class="luxury-tag">{{ t }}</span>
                 </div>
               </div>
            </div>
            <div class="glass-card target-highlight">
               <div class="card-icon"><i class="fa-solid fa-users"></i></div>
               <div class="card-info">
                 <label>適用對象</label>
                 <div class="tag-group">
                   <span v-for="g in resource.targetGroups || []" :key="g" class="luxury-tag">{{ g }}</span>
                 </div>
               </div>
            </div>
          </div>

          <div class="info-stack">
            <section class="content-section">
              <div class="section-header">
                <h3 class="section-title">詳細資訊</h3>
              </div>
              <div class="section-body">
                <div class="data-row full">
                  <label>資源描述內容</label>
                  <p class="description-text">{{ resource.content || "暫無詳細資料..." }}</p>
                </div>
                <div class="data-grid">
                  <div class="data-row">
                    <label>聯繫人</label>
                    <span class="value">{{ resource.contactName || "未填寫" }}</span>
                  </div>
                  <div class="data-row">
                    <label>電話</label>
                    <a :href="'tel:'+resource.contactPhone" class="value link">{{ resource.contactPhone || "未填寫" }}</a>
                  </div>
                  <div class="data-row full">
                    <label>詳細地址</label>
                    <span class="value">{{ resource.address || "未填寫" }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="content-section">
              <div class="section-header">
                <h3 class="section-title">相關標籤</h3>
              </div>
              <div class="section-body">
                <div class="cloud-wrap">
                  <span v-for="tag in resource.tags || []" :key="tag" class="hash-tag"># {{ tag }}</span>
                  <span v-if="!(resource.tags || []).length" class="empty-hint">暫無標籤</span>
                </div>
              </div>
            </section>
          </div>

        </main>
      </div>
      <div v-else>找不到資源資料</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const resource = ref(null);

const statusMap = {
  approved: "✅ 已審核",
  active: "🟢 活躍",
  pause: "🟡 暫停",
  end: "🔴 終止",
  season: "🔵 季節性",
};

const loadResource = () => {
  const stored = JSON.parse(localStorage.getItem("resources") || "[]");
  const found = stored.find(
    (item) => String(item.id) === String(route.params.id)
  );
  resource.value = found || null;
};

onMounted(() => {
  loadResource();
});
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
  grid-template-columns: 300px 1fr;
  gap: 32px;
}

/* Sidebar & Info Pill (修復重點) */
.profile-card {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 40px 24px;
  text-align: center;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  margin-bottom: 24px;
  transition: all 0.2s ease;
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

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
}
.status-badge.active {
  background: #ecfdf5;
  color: #166534;
}

.status-badge.pause {
  background: #fffbeb;
  color: #92400e;
}

.status-badge.end {
  background: #fef2f2;
  color: #991b1b;
}

.status-badge.season {
  background: #eff6ff;
  color: #1e40af;
}

.resource-name {
  font-size: 28px;
  font-weight: 900;
  color: #3e2723;
  margin-bottom: 14px;
  letter-spacing: -0.5px;
}

.org-name {
  color: #6d4c41;
  font-size: 15px;
  margin-bottom: 30px;
}

.resource-id-tag {
  background: #f5f1ed;
  padding: 12px;
  display: flex;
  flex-direction: column;
  border: 1px solid #eadfd8;
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
}

.info-group {
  margin-top: 20px;
  text-align: left;
}

.info-item {
  margin-bottom: 12px;
  font-size: 13px;
}

.info-item label {
  display: block;
  font-weight: 600;
  color: #8d6e63;
  margin-bottom: 4px;
}

.info-item span {
  font-weight: 700;
  color: #3e2723;
}

.info-item.full p {
  font-size: 12px;
  color: #6d4c41;
  line-height: 1.5;
}

.risk.green { color: #4caf50; }
.risk.yellow { color: #ff9800; }
.risk.red { color: #f44336; }

/* 修正的地點樣式 */
.info-pill {
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  transition: all 0.2s ease;
}
.icon-circle {
  width: 45px;
  height: 45px;
  background: #f5f1ed;
  color: #0ea5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.pill-content label {
  display: block;
  font-size: 12px;
  color: #6d4c41;
  margin-bottom: 2px;
}

.pill-content .val {
  font-weight: 700;
  font-size: 15px;
  color: #3e2723;
}

/* Right Content: Summary Cards */
.summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 32px;
}
.glass-card {
  background: linear-gradient(135deg, #ffffff, #f5f1ed);
  padding: 24px;
  display: flex;
  gap: 20px;
  border: 1px solid #eadfd8;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  transition: all 0.2s ease;
}
.card-icon {
  font-size: 22px;
  color: #4f46e5;
  background: linear-gradient(135deg, #ffffff, #f5f1ed);
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
  transition: all 0.2s ease;
}

.luxury-tag:hover {
  background: #3e2723;
  color: #fff;
  border-color: #3e2723;
}

/* Info Stack (Section Layout) */
.content-section {
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 35px;
  margin-bottom: 24px;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
  transition: all 0.2s ease;
}
.section-title {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #3e2723;
  margin-bottom: 25px;
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

.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.data-row.full {
  grid-column: span 2;
  margin-bottom: 20px;
}

.data-row label {
  display: block;
  font-size: 13px;
  color: #6d4c41;
  font-weight: 600;
  margin-bottom: 8px;
}

.data-row .value {
  font-size: 16px;
  font-weight: 800;
  color: #3e2723;
}

.data-row .value.link {
  color: #6d4c41;
  text-decoration: none;
  border-bottom: 1px dashed #c8a27c;
}

.description-text {
  line-height: 1.8;
  color: #6d4c41;
  background: #f5f1ed;
  padding: 20px;
}

/* Tag Cloud */
.hash-tag {
  display: inline-block;
  color: #6d4c41;
  background: #f5f1ed;
  padding: 8px 18px;
  margin-right: 10px;
  font-weight: 700;
  font-size: 14px;
  border: 1px solid #eadfd8;
  transition: all 0.2s ease;
}

.hash-tag:hover {
  background: #c8a27c;
  color: #ffffff;
}

.review-section {
  margin-top: 30px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  border: 1px solid #efe7dc;
}

.review-section h3 {
  margin-bottom: 15px;
  color: #3e2723;
}

.status-row {
  margin-bottom: 15px;
}

.label {
  font-size: 14px;
  color: #8d6e63;
  margin-right: 10px;
}

.review-section .status-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 0;
}

.review-section .status-badge.approved {
  background: #e8f5e9;
  color: #2e7d32;
}

.review-section .status-badge.pause {
  background: #fff3e0;
  color: #ef6c00;
}

.review-section .status-badge.active {
  background: #e3f2fd;
  color: #1565c0;
}

.review-actions {
  display: flex;
  gap: 10px;
}

.approve-btn {
  background: #2e7d32;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}

.reject-btn {
  background: #d32f2f;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
}

/* Back Button */
.back-btn {
  border: none;
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
  box-shadow: 0 16px 32px rgba(62,39,35,0.18);
}

.profile-card:hover,
.info-pill:hover,
.glass-card:hover,
.content-section:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(62,39,35,0.18);
}

/* Mobile */
@media (max-width: 992px) {
  .main-layout {
    grid-template-columns: 1fr;
  }

  .summary-row {
    grid-template-columns: 1fr;
  }

  .data-grid {
    grid-template-columns: 1fr;
  }
}
</style>