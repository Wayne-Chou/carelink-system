<template>
  <div class="resource-dashboard-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>資源端管理面板</h2>
        <p v-if="resource">
          目前登入資源：
          <router-link :to="`/resources/${resource.id}`" class="resource-link">{{ resource.name }}</router-link>
          <span v-if="resource.code" class="code">{{ resource.code }}</span>
        </p>
      </div>
      <div class="header-right"><UserMenu /></div>
    </div>

    <div class="container main-content">
      <div v-if="!resource" class="empty-state">
        <template v-if="canPickAny">
          請先到「資源管理」選擇要登入的資源
          <button type="button" class="outline-btn" @click="$router.push('/list')">前往資源管理</button>
        </template>
        <!-- 資源點：綁定的資源不存在（例如示範資料尚未載入或資源已刪除） -->
        <template v-else>
          找不到您帳號綁定的資源，可能尚未建立或已被刪除。請聯絡系統管理員確認。
        </template>
      </div>

      <template v-else>
        <p v-if="isTerminated" class="terminated-notice" role="alert">
          <i class="fa-solid fa-ban" aria-hidden="true"></i>
          此資源已終止，只能查看過去的轉介紀錄，不能回報連結結果。
        </p>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>

        <section class="summary">
          <span>待回報 <strong>{{ pendingCount }}</strong> 筆</span>
          <span>已回報 <strong>{{ rows.length - pendingCount }}</strong> 筆</span>
        </section>

        <div v-if="!rows.length" class="empty-state">目前沒有轉介到此資源的個案</div>

        <article
          v-for="row in rows"
          :key="`${row.caseItem.id}-${row.index}`"
          :class="['case-card', row.linkage.status]"
        >
          <div class="card-head">
            <span class="case-code">{{ row.caseItem.code }}</span>
            <h4>{{ row.caseItem.person.name || "未命名個案" }}</h4>
            <span :class="['status-badge', row.linkage.status]">
              {{ caseLabel(LINKAGE_STATUS_OPTIONS, row.linkage.status) }}
            </span>
            <span v-if="row.linkage.escortNeeded" class="escort-badge">首次需健康管理員陪同</span>
          </div>
          <p class="meta">
            <span>轉介日 {{ row.linkage.linkedAt || "—" }}</span>
            <span>個案階段 {{ stageShort(row.caseItem.stage) }}</span>
            <span v-if="row.caseItem.managerName">健康管理員 {{ row.caseItem.managerName }}</span>
          </p>
          <p v-if="row.linkage.reason" class="text">轉介說明：{{ row.linkage.reason }}</p>

          <!-- 已回報 -->
          <p v-if="row.linkage.status !== 'pending'" class="text reported">
            回報結果：{{ caseLabel(LINKAGE_STATUS_OPTIONS, row.linkage.status) }}
            <template v-if="row.linkage.attendance">｜{{ caseLabel(ATTENDANCE_OPTIONS, row.linkage.attendance) }}</template>
            <template v-if="row.linkage.providerNote">｜{{ row.linkage.providerNote }}</template>
          </p>

          <!-- 待回報：回報表單 -->
          <div v-else-if="!isTerminated" class="report-form">
            <div class="choice-row" role="radiogroup" :aria-label="`${row.caseItem.code} 連結結果`">
              <label :class="['choice', 'success', { selected: formOf(row).status === 'success' }]">
                <input v-model="formOf(row).status" type="radio" :name="`status-${row.key}`" value="success" />
                成功：已開始參加
              </label>
              <label :class="['choice', 'failed', { selected: formOf(row).status === 'failed' }]">
                <input v-model="formOf(row).status" type="radio" :name="`status-${row.key}`" value="failed" />
                失敗：無法參加
              </label>
            </div>
            <div class="row g-2">
              <div class="col-md-4">
                <select v-model="formOf(row).attendance" :aria-label="`${row.caseItem.code} 出席情形`">
                  <option value="">出席情形（選填）</option>
                  <option v-for="o in ATTENDANCE_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
                </select>
              </div>
              <div class="col-md-8">
                <input
                  v-model.trim="formOf(row).providerNote"
                  type="text"
                  :placeholder="formOf(row).status === 'failed' ? '請說明無法參加的原因' : '說明（選填），例：已固定週二出席'"
                  :aria-label="`${row.caseItem.code} 回報說明`"
                />
              </div>
            </div>
            <p v-if="formOf(row).error" class="field-error" role="alert">{{ formOf(row).error }}</p>
            <div class="form-actions">
              <button type="button" class="primary-btn" :disabled="!formOf(row).status" @click="submit(row)">
                送出回報
              </button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>

<script setup>
import UserMenu from "../components/UserMenu.vue";
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ATTENDANCE_OPTIONS,
  LINKAGE_STATUS_OPTIONS,
  caseLabel,
  stageShort,
} from "../config/caseLabels.js";
import { getAllCases, getReferralsForResource, updateLinkageStatus } from "../services/caseService.js";
import { getResourceById } from "../services/resourceService.js";
import { clearCurrentResourceId, getCurrentResourceId, getCurrentUser } from "../utils/auth.js";
import { can, dashboardResourceId } from "../services/accessControl.js";
import { goBack } from "../utils/navigation.js";

const router = useRouter();
// 角色權限（原型階段）：系統管理員可從資源管理選擇任何資源進入；資源點固定為自己綁定的資源
const currentUser = getCurrentUser();
const canPickAny = can(currentUser, "resource.dashboardAny");
const back = () => goBack(router, canPickAny ? "/list" : "/");

// 系統管理員選擇的資源由 auth.js 存放（測試階段為 sessionStorage，關閉瀏覽器即清除）
const resource = ref(getResourceById(dashboardResourceId(currentUser, getCurrentResourceId())));
if (!resource.value && canPickAny) clearCurrentResourceId();

const isTerminated = computed(() => resource.value?.status === "terminated");
const cases = ref(getAllCases());
const notice = ref("");
const forms = reactive({});

// 轉介到此資源的個案（規則見 caseService.getReferralsForResource）
const rows = computed(() =>
  resource.value ? getReferralsForResource(resource.value.id, cases.value) : []
);

const pendingCount = computed(() => rows.value.filter((r) => r.linkage.status === "pending").length);

// 每筆待回報的連結一份表單；列表變動時預先建立，避免在畫面渲染中新增響應式資料
const emptyForm = () => ({ status: "", attendance: "", providerNote: "", error: "" });
watch(
  rows,
  (list) => {
    for (const row of list) {
      if (row.linkage.status === "pending" && !forms[row.key]) forms[row.key] = emptyForm();
    }
  },
  { immediate: true }
);
const formOf = (row) => forms[row.key] ?? emptyForm();

// 回報結果寫入個案的連結與歷程（操作者為資源單位）；
// 失敗時不自動退回第 2 階段，與個案頁相同：由健康管理員在個案頁決定退回或重新選擇資源
const submit = (row) => {
  const form = formOf(row);
  form.error = form.status === "failed" && !form.providerNote ? "回報失敗時請說明原因，方便健康管理員後續處理" : "";
  if (form.error) return;
  updateLinkageStatus(
    row.caseItem.id,
    {
      index: row.index,
      status: form.status,
      attendance: form.attendance || null,
      providerNote: form.providerNote,
    },
    { actor: resource.value.organization || resource.value.name }
  );
  notice.value =
    form.status === "success"
      ? `已回報 ${row.caseItem.code} 連結成功`
      : `已回報 ${row.caseItem.code} 無法參加，健康管理員會在個案頁接續處理`;
  delete forms[row.key];
  cases.value = getAllCases();
};
</script>

<style scoped>
.resource-dashboard-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 40px;
  color: #3e2723;
}

.top-bar {
  background: #5d4037;
  color: white;
  padding: 14px 20px;
  display: flex;
  align-items: center;
}
.header-left,
.header-right {
  flex: 1;
}
.header-center {
  flex: 3;
  text-align: center;
}
.back-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.top-bar h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.top-bar p {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}
.resource-link {
  color: inherit;
  text-decoration: underline;
}

.code {
  font-family: "Courier New", monospace;
  font-size: 12px;
  margin-left: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 1px 6px;
}

.main-content {
  max-width: 860px;
  margin-top: 18px;
  padding: 0 15px;
}
.empty-state {
  text-align: center;
  color: #8d6e63;
  font-size: 15px;
  padding: 50px 20px;
  display: grid;
  gap: 14px;
  justify-items: center;
}
.terminated-notice {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #616161;
  border-radius: 10px;
  padding: 12px 14px;
  font-weight: 600;
}
.notice {
  background: #edf7ee;
  border: 1px solid #b7dfb9;
  color: #1b5e20;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 600;
  font-size: 14px;
}
.summary {
  display: flex;
  gap: 18px;
  font-size: 14px;
  color: #6d4c41;
  margin-bottom: 12px;
}

.case-card {
  background: white;
  border: 1px solid #f0e6e0;
  border-left: 5px solid #bcaaa4;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.05);
}
.case-card.pending {
  border-left-color: #f9a825;
}
.case-card.success {
  border-left-color: #2e7d32;
}
.case-card.failed {
  border-left-color: #c62828;
}
.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.case-code {
  font-family: "Courier New", monospace;
  font-size: 12px;
  font-weight: 700;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 6px;
}
.card-head h4 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 1px 10px;
  border-radius: 999px;
}
.status-badge.pending {
  background: #fff8e1;
  color: #8a5a00;
}
.status-badge.success {
  background: #edf7ee;
  color: #1b5e20;
}
.status-badge.failed {
  background: #fdecea;
  color: #b71c1c;
}
.escort-badge {
  font-size: 12px;
  font-weight: 700;
  color: #8a5a00;
  border: 1px solid #ffe082;
  border-radius: 999px;
  padding: 0 8px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin: 6px 0 0;
  font-size: 13px;
  color: #8d6e63;
}
.text {
  margin: 6px 0 0;
  font-size: 14px;
  color: #5d4037;
}
.text.reported {
  font-weight: 600;
}

.report-form {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #efe7dc;
}
.choice-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.choice {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid #e0d5cb;
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 700;
  cursor: pointer;
}
.choice.success.selected {
  border-color: #2e7d32;
  background: #edf7ee;
}
.choice.failed.selected {
  border-color: #c62828;
  background: #fdecea;
}
.choice input {
  accent-color: #5d4037;
}
input[type="text"],
select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  background: #fdfbf9;
  font-size: 14px;
}
.field-error {
  color: #c62828;
  font-size: 13px;
  margin: 6px 0 0;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.primary-btn {
  background: #2e7d32;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 9px 20px;
  font-weight: 700;
}
.primary-btn:disabled {
  background: #c8c1bb;
}
.outline-btn {
  background: #fff;
  color: #5d4037;
  border: 1px solid #d6ccc2;
  border-radius: 10px;
  padding: 8px 18px;
  font-weight: 600;
}

@media (max-width: 576px) {
  .choice-row {
    flex-direction: column;
  }
}

/* 登入者與登出（UserMenu）靠右 */
.top-bar .header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
</style>
