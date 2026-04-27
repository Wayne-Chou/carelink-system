<template>
  <div class="detail-page">
    <div class="container py-5">
      <button class="back-btn" @click="$router.back()">← 返回</button>

      <div v-if="resource" class="content">
        <h1 class="title">{{ resource.name }}</h1>
        <p class="org">{{ resource.organization }}</p>

        <div class="section">
          <h3>資源介紹</h3>
          <p>{{ resource.content || "暫無說明" }}</p>
        </div>

        <div class="section">
          <h3>適用對象</h3>
          <div class="tags">
            <span v-for="t in resource.targetGroups" :key="t">#{{ t }}</span>
          </div>
        </div>

        <div class="section">
          <h3>服務類型</h3>
          <div class="tags">
            <span v-for="t in resource.types" :key="t">#{{ t }}</span>
          </div>
        </div>

        <div class="section">
          <h3>地點</h3>
          <p>{{ resource.locationName }}</p>
          <p class="addr">{{ resource.address }}</p>
        </div>

        <div class="section">
          <h3>參與方式</h3>
          <p>{{ resource.participation || "未提供" }}</p>
        </div>

        <div class="section">
          <h3>費用</h3>
          <p>{{ resource.feeType || "未提供" }}</p>
        </div>

        <div class="section">
          <h3>聯絡方式</h3>
          <p>{{ resource.contactName }}</p>
          <a :href="'tel:' + resource.contactPhone">
            {{ resource.contactPhone }}
          </a>
        </div>
      </div>

      <div v-else>找不到資源</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const resource = ref(null);

onMounted(() => {
  const stored = JSON.parse(localStorage.getItem("resources") || "[]");
  resource.value = stored.find((r) => String(r.id) === String(route.params.id));
});
</script>

<style scoped>
.detail-page {
  background: #f5f1ed;
  min-height: 100vh;
  padding-bottom: 40px;
  font-family: "Inter", "Noto Sans TC", sans-serif;
}

/* 返回按鈕 */
.back-btn {
  border: none;
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
  box-shadow: 0 16px 32px rgba(62,39,35,0.18);
}

/* 主卡片 */
.content {
  background: #ffffff;
  border: 1px solid #eadfd8;
  padding: 35px;
  margin-top: 20px;
  box-shadow: 0 8px 16px rgba(62, 39, 35, 0.08);
}

/* 標題 */
.title {
  font-size: 28px;
  font-weight: 900;
  color: #3e2723;
  margin-bottom: 8px;
}

.org {
  color: #6d4c41;
  font-size: 14px;
  margin-bottom: 25px;
}

/* 區塊 */
.section {
  margin-bottom: 30px;
}

.section h3 {
  font-size: 16px;
  font-weight: 800;
  color: #3e2723;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 4px solid #c8a27c;
}

/* 文字 */
.section p {
  font-size: 14px;
  color: #6d4c41;
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
  transition: all 0.2s ease;
}

.tags span:hover {
  background: #3e2723;
  color: #ffffff;
}

/* 地址 */
.addr {
  font-size: 13px;
  color: #8d6e63;
}

/* 電話 */
a {
  color: #6d4c41;
  text-decoration: none;
  border-bottom: 1px dashed #c8a27c;
}

a:hover {
  color: #3e2723;
}

/* 手機 */
@media (max-width: 768px) {
  .content {
    padding: 20px;
  }

  .title {
    font-size: 22px;
  }
}

</style>
