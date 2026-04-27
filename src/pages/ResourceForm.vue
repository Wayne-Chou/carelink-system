<template>
  <div class="surveyor-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="$router.push('/')">← 返回</button>
      </div>
      <div class="header-center">
        <h2>新增社區資源調查</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="progress-container">
      <div
        class="progress-bar"
        :style="{ width: (currentStep / 5) * 100 + '%' }"
      ></div>
      <div class="step-text">
        步驟 {{ currentStep }} / 5: {{ stepTitles[currentStep - 1] }}
      </div>
    </div>

    <div class="container main-content">
      <div class="form-card">
        <div v-if="currentStep === 1" class="step-content">
          <div class="input-group">
            <label>資源名稱 <span class="required">*</span></label>
            <input
              type="text"
              placeholder="例如：社區健康步行團"
              v-model="formData.name"
            />
          </div>
          <div class="input-group">
            <label>所屬單位</label>
            <input
              type="text"
              placeholder="例如：XX服務站"
              v-model="formData.organization"
            />
          </div>
          <div class="row">
            <div class="col-6">
              <label>資源狀態</label>
              <select v-model="formData.status">
                <option value="active">🟢 活躍</option>
                <option value="pause">🟡 暫停</option>
                <option value="end">🔴 終止</option>
                <option value="season">🔵 季節性</option>
              </select>
            </div>
            <div class="col-6">
              <label>最後驗證日期</label>
              <input type="date" v-model="formData.lastVerifyDate" />
            </div>
            <div class="col-6">
              <label>預計驗證日期</label>
              <input type="date" v-model="formData.nextVerifyDate" />
            </div>
          </div>
          <div class="input-group">
            <label>風險等級</label>
            <select v-model="formData.riskLevel">
              <option value="green">🟢 綠燈（可推薦）</option>
              <option value="yellow">🟡 黃燈（需陪同）</option>
              <option value="red">🔴 紅燈（避免推薦）</option>
            </select>
          </div>

          <div class="input-group">
            <label>風險說明（選填）</label>
            <textarea
              rows="2"
              placeholder="例如：尚未實地查核或需陪同"
              v-model="formData.riskNote"
            ></textarea>
          </div>
        </div>

        <div v-if="currentStep === 2" class="step-content">
          <label>處方類型 (多選)</label>
          <div class="type-grid">
            <div
              v-for="type in prescriptionTypes"
              :key="type"
              :class="['type-chip', { active: formData.types.includes(type) }]"
              @click="toggleType(type)"
            >
              {{ type }}
            </div>
          </div>
          <label class="mt-4">需求標籤</label>
          <div class="tag-cloud">
            <div
              v-for="tag in availableTags"
              :key="tag"
              :class="['tag-item', { active: formData.tags.includes(tag) }]"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </div>
          </div>
        </div>

        <div v-if="currentStep === 3" class="step-content">
          <div class="input-group">
            <label>資源內容 (100字以內)</label>
            <textarea
              rows="3"
              placeholder="簡述內容..."
              v-model="formData.content"
            ></textarea>
          </div>
          <div class="row">
            <div class="col-6">
              <label>可容納人數</label>
              <input
                type="text"
                placeholder="上限人數"
                v-model="formData.capacity"
              />
            </div>
            <div class="col-6">
              <label>服務量能</label>
              <select v-model="formData.capacityStatus">
                <option value="available">尚有名額</option>
                <option value="full">額滿預約</option>
                <option value="realtime">需即時確認</option>
              </select>
            </div>
          </div>
          <div class="mt-4">
            <label>服務週期</label>
            <div class="cycle-selector">
              <label :class="{ active: formData.cycle === 'normal' }">
                <input type="radio" value="normal" v-model="formData.cycle" />
                常態
              </label>
              <label :class="{ active: formData.cycle === 'batch' }">
                <input type="radio" value="batch" v-model="formData.cycle" />
                梯次
              </label>
              <label :class="{ active: formData.cycle === 'once' }">
                <input type="radio" value="once" v-model="formData.cycle" />
                單次
              </label>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 4" class="step-content">
          <div class="input-group">
            <label>地點名稱</label>
            <input
              type="text"
              placeholder="XX活動中心 / 某某公園"
              v-model="formData.locationName"
            />
          </div>
          <div class="input-group">
            <label>詳細地址</label>
            <input
              type="text"
              placeholder="請輸入完整地址"
              v-model="formData.address"
            />
            <button class="btn-geo" @click="openMap">🗺️ 在地圖中確認地址</button>
          </div>
          <div class="mt-3">
            <label>無障礙規劃 (多選)</label>
            <div class="tag-cloud">
              <div
                v-for="item in accessibilityOptions"
                :key="item"
                :class="[
                  'tag-item',
                  { active: formData.accessibility.includes(item) },
                ]"
                @click="toggleAccess(item)"
              >
                {{ item }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 5" class="step-content">
          <div class="input-group">
            <label>AI 關鍵字</label>
            <input
              type="text"
              placeholder="運動, 社交, 低費用"
              v-model="formData.keywords"
            />
          </div>
          <div class="input-group">
            <label>對應生活情境 (AI 搜尋優化)</label>
            <textarea
              rows="3"
              placeholder="例如：適合剛出院需要短期復健的長者..."
              v-model="formData.aiContext"
            ></textarea>
          </div>
          <div class="input-group">
            <label>合作狀態</label>
            <select v-model="formData.coopStatus">
              <option value="formal">正式合作</option>
              <option value="oral">口頭確認</option>
              <option value="none">尚未確認</option>
            </select>
          </div>
          <!-- 聯絡資訊 -->
          <div class="input-group">
            <label>聯絡人</label>
            <input v-model="formData.contactName" placeholder="請輸入聯絡人" />
          </div>

          <div class="input-group">
            <label>電話</label>
            <input v-model="formData.contactPhone" placeholder="請輸入電話" />
          </div>

          <!-- 適用對象 -->
          <div class="mt-3">
            <label>適用對象</label>
            <div class="tag-cloud">
              <div
                v-for="item in targetOptions"
                :key="item"
                :class="[
                  'tag-item',
                  { active: formData.targetGroups.includes(item) },
                ]"
                @click="toggleTarget(item)"
              >
                {{ item }}
              </div>
            </div>
          </div>

          <!-- 參與條件 -->
          <div class="input-group">
            <label>參與條件</label>
            <select v-model="formData.participation">
              <option v-for="p in participationOptions" :key="p" :value="p">
                {{ p }}
              </option>
            </select>
          </div>

          <!-- 費用 -->
          <div class="input-group">
            <label>費用</label>
            <select v-model="formData.feeType">
              <option v-for="f in feeOptions" :key="f" :value="f">
                {{ f }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-footer">
          <button
            v-if="currentStep > 1"
            class="btn-outline"
            @click="currentStep--"
          >
            上一步
          </button>
          <button
            v-if="currentStep < 5"
            class="btn-primary"
            @click="currentStep++"
          >
            下一步
          </button>
          <button v-else class="btn-submit" @click="submitForm">
            完成並送審
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();
const currentStep = ref(1);
const stepTitles = ["基本管理", "處方標籤", "服務量能", "空間位置", "合作與AI"];

const formData = reactive({
  name: "",
  organization: "",
  status: "active",
  lastVerifyDate: "",
  nextVerifyDate: "",
  riskLevel: "green",
  riskNote: "",
  types: [],
  tags: [],
  content: "",
  capacity: "",
  capacityStatus: "available",
  cycle: "normal",
  locationName: "",
  address: "",
  lat: null,
  lng: null,
  accessibility: [],
  keywords: "",
  aiContext: "",
  coopStatus: "none",
  contactName: "",
  contactPhone: "",
  targetGroups: [],
  participation: "",
  feeType: "",
});

const prescriptionTypes = [
  "基本生活支持",
  "身心健康促進",
  "社會連結",
  "學習與發展",
];
const availableTags = [
  "經濟援助",
  "法律諮詢",
  "運動健身",
  "心理支持",
  "社交陪伴",
  "教育學習",
  "數位技能",
  "藝術文化",
];
const accessibilityOptions = [
  "無障礙空間",
  "失智者友善",
  "長者友善",
  "兒童友善",
  "性別友善",
];
const targetOptions = ["長者", "成人", "慢性病", "照顧者", "身心障礙"];

const participationOptions = ["自由參加", "須報名", "僅接受轉介"];

const feeOptions = ["免費", "自費", "補助"];

const toggleTarget = (v) => {
  const i = formData.targetGroups.indexOf(v);
  i > -1 ? formData.targetGroups.splice(i, 1) : formData.targetGroups.push(v);
};
const toggleType = (v) => {
  const i = formData.types.indexOf(v);
  i > -1 ? formData.types.splice(i, 1) : formData.types.push(v);
};
const toggleTag = (v) => {
  const i = formData.tags.indexOf(v);
  i > -1 ? formData.tags.splice(i, 1) : formData.tags.push(v);
};
const toggleAccess = (v) => {
  const i = formData.accessibility.indexOf(v);
  i > -1 ? formData.accessibility.splice(i, 1) : formData.accessibility.push(v);
};

const openMap = () => {
  if (!formData.address) {
    alert("請先輸入地址");
    return;
  }

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      formData.address
    )}`,
    "_blank"
  );
};

const submitForm = () => {
  const oldData = JSON.parse(localStorage.getItem("resources") || "[]");

  // 確保既有資料每一筆都有 id
  const resourcesWithId = oldData.map((item, index) => ({
    ...item,
    id: item?.id ?? Date.now() + index,
  }));

  resourcesWithId.push({
    ...formData,
    id: Date.now(),
  });

  localStorage.setItem("resources", JSON.stringify(resourcesWithId));

  alert("資源已成功送出！");

  router.push("/success");
};
</script>

<style scoped>
.surveyor-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 50px;
}

/* 優化後的對稱 Header */
.top-bar {
  background: #5d4037;
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-left,
.header-right {
  flex: 1;
}
.header-center {
  flex: 2;
  text-align: center;
}
.header-center h2 {
  font-size: 20px;
  margin: 0;
  font-weight: 700;
}
.back-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.header-right {
  text-align: right;
}

.progress-container {
  background: #efe7dc;
  padding: 15px 20px;
  text-align: center;
}
.progress-bar {
  height: 6px;
  background: #c2956e;
  transition: 0.3s;
  border-radius: 3px;
  margin-bottom: 8px;
}
.step-text {
  font-size: 13px;
  color: #8d6e63;
  font-weight: 600;
}

.form-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 
  10px 30px rgba(93, 64, 55, 0.05);
  margin-top: 20px;
}
.input-group {
  margin-bottom: 20px;
}
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
  color: #3e2723;
  font-size: 15px;
}
.required {
  color: #d32f2f;
}
input,
textarea,
select {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  background: #fdfbf9;
  font-size: 15px;
}

/* 週期選擇器 */
.cycle-selector {
  display: flex;
  gap: 10px;
}
.cycle-selector label {
  flex: 1;
  border: 1px solid #e0d5cb;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  background: #fdfbf9;
  transition: 0.2s;
  margin-bottom: 0;
  font-weight: 400;
}
.cycle-selector label.active {
  background: #efe7dc;
  border-color: #c2956e;
  color: #5d4037;
  font-weight: 700;
}
.cycle-selector input[type="radio"] {
  display: none;
}

/* 定位按鈕與資訊 */
.btn-geo {
  width: 100%;
  margin-top: 10px;
  background: #f8f4f0;
  border: 1px solid #c2956e;
  padding: 12px;
  border-radius: 10px;
  color: #5d4037;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.geo-info-box {
  background: #f0f7f4;
  border-radius: 8px;
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #d8f3dc;
}
.geo-info-box p {
  font-size: 13px;
  color: #2d6a4f;
  margin: 0;
  font-weight: 600;
}
.geo-info-box small {
  color: #52796f;
  font-size: 11px;
}

.type-grid,
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.type-chip,
.tag-item {
  padding: 8px 16px;
  background: #f5f0ed;
  border-radius: 50px;
  font-size: 13px;
  color: #8d6e63;
  cursor: pointer;
}
.type-chip.active,
.tag-item.active {
  background: #5d4037;
  color: white;
}

.form-footer {
  margin-top: 40px;
  display: flex;
  gap: 15px;
}
.btn-primary,
.btn-submit {
  flex: 1;
  background: #5d4037;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-submit {
  background: #2e7d32;
}
.btn-outline {
  flex: 1;
  background: white;
  border: 1px solid #5d4037;
  color: #5d4037;
  border-radius: 12px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .form-card {
    padding: 20px;
    border-radius: 0;
  }
  .main-content {
    margin-top: 0;
  }
}
</style>