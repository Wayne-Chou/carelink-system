<template>
  <div class="accounts-page">
    <div class="top-bar">
      <div class="header-left">
      </div>
      <div class="header-center">
        <h2>帳號管理</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="container main-content">
      <div class="toolbar" data-tour="accounts-toolbar">
        <button type="button" class="primary-btn" @click="openCreate">
          <i class="fa-solid fa-user-plus" aria-hidden="true"></i> 建立帳號
        </button>
        <router-link to="/mailbox" class="prototype-link">
          <span class="prototype-tag">原型展示用</span> 模擬信箱
        </router-link>
      </div>

      <p v-if="notice" class="notice" role="status">
        {{ notice }}
        <button type="button" class="notice-close" aria-label="關閉提示" @click="notice = ''">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </p>

      <div class="tabs" data-tour="accounts-tabs" role="tablist" aria-label="帳號狀態">
        <button
          v-for="tab in tabs"
          :key="tab.code"
          type="button"
          role="tab"
          :aria-selected="currentTab === tab.code"
          :class="['tab', { active: currentTab === tab.code }]"
          @click="currentTab = tab.code"
        >
          {{ tab.label }} <strong>{{ tab.count }}</strong>
        </button>
      </div>

      <div v-if="!visibleAccounts.length" class="empty-state">此分類目前沒有帳號</div>
      <article
        v-for="(a, index) in visibleAccounts"
        :key="a.id"
        :class="['account-card', a.status]"
        :data-tour="index === 0 ? 'accounts-list' : undefined"
      >
        <div class="card-main">
          <div class="card-head">
            <span :class="['status-badge', a.status]">{{ accountStatusLabel(a.status) }}</span>
            <span class="role">{{ getRoleLabel(a.role) || "未設定角色" }}</span>
            <span v-if="a.isDemo" class="demo-tag">示範帳號</span>
          </div>
          <h4>{{ a.name || "未填姓名" }}</h4>
          <p class="meta">
            <span>{{ a.email }}</span>
            <span v-if="a.organization">{{ a.organization }}</span>
            <span v-if="a.createdAt">{{ a.createdBy ? "建立" : "申請" }}時間 {{ formatDateTime(a.createdAt) }}</span>
            <span v-if="a.statusReason">原因：{{ a.statusReason }}</span>
          </p>
        </div>
        <div class="card-actions">
          <button v-if="a.status === 'pending'" type="button" class="primary-btn small" @click="openAccount(a.id)">審核</button>
          <button v-else type="button" class="outline-btn small" @click="openAccount(a.id)">查看</button>
        </div>
      </article>
    </div>

    <!-- 帳號詳細：申請資料、審核、停用與重新啟用 -->
    <div v-if="selected" class="dialog-backdrop" @click.self="closeAccount">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
        <header class="dialog-head">
          <h3 id="account-dialog-title">
            {{ selected.name || "未填姓名" }}
            <span :class="['status-badge', selected.status]">{{ accountStatusLabel(selected.status) }}</span>
          </h3>
          <button type="button" class="icon-btn" aria-label="關閉" @click="closeAccount">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>

        <div class="dialog-body">
          <p v-if="selected.isDemo" class="hint">示範帳號寫在程式中，只能檢視，不能審核或停用。</p>

          <h4 class="sub-title">{{ selected.createdBy ? "帳號資料" : "申請資料" }}</h4>
          <dl class="info-grid">
            <div><dt>角色</dt><dd>{{ getRoleLabel(selected.role) || "—" }}</dd></div>
            <div v-for="f in APPLICATION_FIELDS" :key="f.key">
              <dt>{{ f.label }}</dt>
              <dd>{{ selected[f.key] || "—" }}</dd>
            </div>
            <div v-for="f in detailFields" :key="f.key">
              <dt>{{ f.label }}</dt>
              <dd>{{ detailText(f) }}</dd>
            </div>
            <div v-if="selected.consentAt"><dt>個資保護與保密同意</dt><dd>已同意（{{ formatDateTime(selected.consentAt) }}）</dd></div>
            <div v-if="selected.createdBy"><dt>建立者</dt><dd>{{ selected.createdBy.name || selected.createdBy.email }}</dd></div>
            <div v-if="selected.role === 'provider' && selected.status === 'active'">
              <dt>目前綁定的資源</dt>
              <dd>{{ boundResourceText }}</dd>
            </div>
            <div v-if="!selected.isDemo && selected.status === 'active'">
              <dt>密碼</dt>
              <dd>{{ selected.hasPassword ? "已設定" : "尚未設定（等待使用者開啟設定密碼信）" }}</dd>
            </div>
          </dl>

          <template v-if="selected.review">
            <h4 class="sub-title">審核紀錄</h4>
            <dl class="info-grid">
              <div><dt>結果</dt><dd>{{ selected.review.decision === "approve" ? "通過" : "退回" }}</dd></div>
              <div><dt>確認方式</dt><dd>{{ methodsText(selected.review) }}</dd></div>
              <div v-if="selected.review.reason"><dt>退回原因</dt><dd>{{ selected.review.reason }}</dd></div>
              <div v-if="selected.review.note"><dt>審核備註</dt><dd>{{ selected.review.note }}</dd></div>
              <div><dt>審核者</dt><dd>{{ selected.review.reviewer?.name || selected.review.reviewer?.email || "—" }}</dd></div>
              <div><dt>審核時間</dt><dd>{{ formatDateTime(selected.review.at) }}</dd></div>
            </dl>
          </template>

          <!-- 審核（待審核） -->
          <form v-if="selected.status === 'pending'" class="action-form" novalidate @submit.prevent="submitReview">
            <h4 class="sub-title">審核</h4>
            <div class="choice-row" role="radiogroup" aria-label="審核結果">
              <label :class="['choice', 'approve', { selected: review.decision === 'approve' }]">
                <input v-model="review.decision" type="radio" name="decision" value="approve" /> 通過
              </label>
              <label :class="['choice', 'reject', { selected: review.decision === 'reject' }]">
                <input v-model="review.decision" type="radio" name="decision" value="reject" /> 退回
              </label>
            </div>
            <p v-if="formErrors.decision" class="field-error">{{ formErrors.decision }}</p>

            <label class="form-label">確認方式（可複選）<span class="required">*</span></label>
            <ChipSelect v-model="review.methods" :options="VERIFY_METHODS" :invalid="!!formErrors.methods" />
            <p v-if="formErrors.methods" class="field-error">{{ formErrors.methods }}</p>
            <template v-if="review.methods.includes('other')">
              <input v-model.trim="review.methodOther" type="text" class="text-input" placeholder="說明其他確認方式" />
              <p v-if="formErrors.methodOther" class="field-error">{{ formErrors.methodOther }}</p>
            </template>

            <template v-if="review.decision === 'approve' && selected.role === 'provider'">
              <label class="form-label" for="review-resource">綁定的資源<span class="required">*</span></label>
              <select id="review-resource" v-model="review.resourceId" class="text-input">
                <option value="">請選擇資源</option>
                <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.code }} {{ r.name }}</option>
              </select>
              <p class="hint">預設為申請時選的資源，通過時完成綁定</p>
              <p v-if="formErrors.resourceId" class="field-error">{{ formErrors.resourceId }}</p>
            </template>

            <template v-if="review.decision === 'reject'">
              <label class="form-label" for="review-reason">退回原因<span class="required">*</span></label>
              <textarea id="review-reason" v-model.trim="review.reason" rows="3" class="text-input" placeholder="會寫在退回通知信中，申請人可依原因修改後重新申請"></textarea>
              <p v-if="formErrors.reason" class="field-error">{{ formErrors.reason }}</p>
            </template>

            <label class="form-label" for="review-note">審核備註（選填，只有系統管理員看得到）</label>
            <textarea id="review-note" v-model.trim="review.note" rows="2" class="text-input" placeholder="例：已電話向主管確認在職"></textarea>

            <p v-if="formErrors.form" class="field-error">{{ formErrors.form }}</p>
            <button type="submit" class="primary-btn">送出審核</button>
          </form>

          <!-- 停用（已啟用） -->
          <form
            v-else-if="selected.status === 'active' && !selected.isDemo"
            class="action-form"
            data-tour="accounts-suspend"
            novalidate
            @submit.prevent="submitSuspend"
          >
            <h4 class="sub-title">停用帳號</h4>
            <p v-if="isSelf" class="hint">不能停用自己的帳號。</p>
            <template v-else>
              <label class="form-label" for="suspend-reason">停用原因<span class="required">*</span></label>
              <textarea id="suspend-reason" v-model.trim="suspendReason" rows="2" class="text-input" placeholder="會寫在停用通知信中，例：已離職"></textarea>
              <p v-if="formErrors.reason" class="field-error">{{ formErrors.reason }}</p>
              <p v-if="formErrors.form" class="field-error">{{ formErrors.form }}</p>
              <button type="submit" class="danger-btn">停用帳號</button>
            </template>
          </form>

          <!-- 重新啟用（已停用） -->
          <form v-else-if="selected.status === 'suspended'" class="action-form" novalidate @submit.prevent="submitReactivate">
            <h4 class="sub-title">重新啟用</h4>
            <label class="form-label" for="reactivate-note">說明（選填）</label>
            <textarea id="reactivate-note" v-model.trim="reactivateNote" rows="2" class="text-input"></textarea>
            <p v-if="formErrors.form" class="field-error">{{ formErrors.form }}</p>
            <button type="submit" class="primary-btn">重新啟用</button>
          </form>

          <template v-if="selected.history?.length">
            <h4 class="sub-title">狀態歷程</h4>
            <ol class="history">
              <li v-for="(h, i) in [...selected.history].reverse()" :key="i">
                <strong>{{ formatDateTime(h.at) }}</strong>
                {{ accountActionLabel(h.action) }}（{{ accountStatusLabel(h.status) }}）
                <span v-if="h.actor?.name || h.actor?.email">｜{{ h.actor.name || h.actor.email }}</span>
                <span v-if="h.reason">｜{{ h.reason }}</span>
              </li>
            </ol>
          </template>
        </div>
      </section>
    </div>

    <!-- 建立帳號 -->
    <div v-if="creating" class="dialog-backdrop" @click.self="creating = false">
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="create-dialog-title">
        <header class="dialog-head">
          <h3 id="create-dialog-title">建立帳號</h3>
          <button type="button" class="icon-btn" aria-label="關閉" @click="creating = false">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <form class="dialog-body action-form" novalidate @submit.prevent="submitCreate">
          <p class="hint">建立後直接為「已啟用」，系統寄出「設定密碼」信，使用者設定密碼後即可登入。資源管理員只能從這裡建立。</p>
          <template v-for="f in createFields" :key="f.key">
            <label class="form-label" :for="`create-${f.key}`">
              {{ f.label }}<span v-if="f.required" class="required">*</span>
            </label>
            <input :id="`create-${f.key}`" v-model.trim="createForm[f.key]" :type="f.type" class="text-input" :class="{ invalid: formErrors[f.key] }" />
            <p v-if="formErrors[f.key]" class="field-error">{{ formErrors[f.key] }}</p>
          </template>

          <label class="form-label" for="create-role">角色<span class="required">*</span></label>
          <select id="create-role" v-model="createForm.role" class="text-input" :class="{ invalid: formErrors.role }">
            <option value="">請選擇角色</option>
            <option v-for="r in ROLES" :key="r.code" :value="r.code">{{ r.label }}</option>
          </select>
          <p v-if="createForm.role === 'admin'" class="hint warning">系統管理員可使用全部功能（含帳號管理），送出前會再確認一次。</p>
          <p v-if="formErrors.role" class="field-error">{{ formErrors.role }}</p>

          <template v-if="createForm.role === 'provider'">
            <label class="form-label" for="create-resource">綁定的資源<span class="required">*</span></label>
            <select id="create-resource" v-model="createForm.resourceId" class="text-input" :class="{ invalid: formErrors.resourceId }">
              <option value="">請選擇資源</option>
              <option v-for="r in resources" :key="r.id" :value="r.id">{{ r.code }} {{ r.name }}</option>
            </select>
            <p v-if="formErrors.resourceId" class="field-error">{{ formErrors.resourceId }}</p>
          </template>
          <template v-if="createForm.role === 'reader'">
            <label class="form-label" for="create-medical">醫事人員類別（選填，帶入判讀頁）</label>
            <select id="create-medical" v-model="createForm.medicalType" class="text-input">
              <option value="">未指定</option>
              <option v-for="o in MEDICAL_TYPES" :key="o.code" :value="o.code">{{ o.label }}</option>
            </select>
          </template>

          <button type="submit" class="primary-btn">建立並寄出設定密碼信</button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import ChipSelect from "../components/ChipSelect.vue";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ROLES, getRoleLabel } from "../config/roles.js";
import {
  ACCOUNT_STATUSES,
  APPLICATION_FIELDS,
  MEDICAL_TYPES,
  ROLE_DETAIL_FIELDS,
  VERIFY_METHODS,
  accountActionLabel,
  accountStatusLabel,
} from "../config/accounts.js";
import {
  countByStatus,
  createAccount,
  createEmptyAccountForm,
  listAccounts,
  reactivateAccount,
  reviewAccount,
  suspendAccount,
} from "../services/accountService.js";
import { getAllResources, getResourceById } from "../services/resourceService.js";
import { getBoundResourceId, getCurrentUser } from "../utils/auth.js";
import { formatDateTime } from "../utils/resourceFormat.js";

const router = useRouter();
const route = useRoute();
const currentUser = getCurrentUser();
const actor = () => ({ name: currentUser?.name ?? "", email: currentUser?.email ?? "" });

const accounts = ref(listAccounts());
const reload = () => {
  accounts.value = listAccounts();
};
const notice = ref("");

// ── 分頁：待審核、已啟用、已退回、已停用、全部（全部的排序為待審核在前）──
const currentTab = ref("pending");
const tabs = computed(() => {
  const counts = countByStatus(accounts.value);
  return [
    ...ACCOUNT_STATUSES.map((s) => ({ code: s.code, label: s.label, count: counts[s.code] ?? 0 })),
    { code: "all", label: "全部", count: accounts.value.length },
  ];
});
const visibleAccounts = computed(() =>
  currentTab.value === "all" ? accounts.value : accounts.value.filter((a) => a.status === currentTab.value)
);
// 沒有待審核時預設看已啟用
if (!accounts.value.some((a) => a.status === "pending")) currentTab.value = "active";

const resources = getAllResources().sort((a, b) => String(a.code).localeCompare(String(b.code)));
const resourceText = (id) => {
  const r = getResourceById(id);
  return r ? [r.code, r.name].filter(Boolean).join(" ") : id ? "已刪除的資源" : "—";
};

// ── 帳號詳細（網址 ?review=帳號 id，待辦與新申請通知信由此開啟）──
const selectedId = ref(typeof route.query.review === "string" ? route.query.review : "");
const selected = computed(() => accounts.value.find((a) => String(a.id) === String(selectedId.value)) ?? null);
const formErrors = ref({});
const review = reactive({ decision: "", methods: [], methodOther: "", note: "", reason: "", resourceId: "" });
const suspendReason = ref("");
const reactivateNote = ref("");

const resetForms = () => {
  formErrors.value = {};
  Object.assign(review, {
    decision: "",
    methods: [],
    methodOther: "",
    note: "",
    reason: "",
    resourceId: selected.value?.details?.resourceId ?? "",
  });
  suspendReason.value = "";
  reactivateNote.value = "";
};
watch(selected, resetForms, { immediate: true });

const openAccount = (id) => {
  selectedId.value = id;
  router.replace({ query: { review: id } });
};
const closeAccount = () => {
  selectedId.value = "";
  router.replace({ query: {} });
};

const isSelf = computed(() => selected.value?.email === currentUser?.email);
const detailFields = computed(() =>
  selected.value && !selected.value.createdBy ? ROLE_DETAIL_FIELDS[selected.value.role] ?? [] : []
);
const detailText = (field) => {
  const value = selected.value?.details?.[field.key];
  if (field.type === "resource") return resourceText(value);
  if (field.type === "select") return field.options.find((o) => o.code === value)?.label ?? (value || "—");
  return value || "—";
};
const boundResourceText = computed(() => resourceText(getBoundResourceId(selected.value.email, selected.value.resourceId)));
const methodsText = (r) =>
  (r.methods ?? [])
    .map((code) => (code === "other" && r.methodOther ? `其他：${r.methodOther}` : VERIFY_METHODS.find((m) => m.code === code)?.label ?? code))
    .join("、") || "—";

const finish = (message) => {
  notice.value = message;
  reload();
  closeAccount();
};

const submitReview = () => {
  const result = reviewAccount(selected.value.id, { ...review }, actor());
  if (!result.ok) {
    formErrors.value = result.errors;
    return;
  }
  const a = result.account;
  finish(
    review.decision === "approve"
      ? `已通過 ${a.name} 的申請${a.role === "provider" ? `並綁定「${resourceText(a.resourceId)}」` : ""}，已寄出設定密碼信`
      : `已退回 ${a.name} 的申請，已寄出含重新申請連結的通知信`
  );
};

const submitSuspend = () => {
  if (!confirm(`確定要停用「${selected.value.name}」的帳號？\n\n停用後無法登入，已登入的也會被登出。`)) return;
  const result = suspendAccount(selected.value.id, { reason: suspendReason.value }, actor());
  if (!result.ok) {
    formErrors.value = result.errors;
    return;
  }
  finish(`已停用 ${result.account.name} 的帳號，已寄出通知信`);
};

const submitReactivate = () => {
  const result = reactivateAccount(selected.value.id, { note: reactivateNote.value }, actor());
  if (!result.ok) {
    formErrors.value = result.errors;
    return;
  }
  finish(`已重新啟用 ${result.account.name} 的帳號，已寄出通知信`);
};

// ── 建立帳號 ──
const creating = ref(false);
const createForm = reactive(createEmptyAccountForm());
const createFields = [
  { key: "name", label: "姓名", type: "text", required: true },
  { key: "email", label: "Email", type: "email", required: true },
  { key: "phone", label: "手機", type: "tel", required: false },
  { key: "organization", label: "目前任職或服務單位", type: "text", required: false },
  { key: "jobTitle", label: "職稱", type: "text", required: false },
];
const openCreate = () => {
  Object.assign(createForm, createEmptyAccountForm());
  formErrors.value = {};
  creating.value = true;
};
const submitCreate = () => {
  if (
    createForm.role === "admin" &&
    !confirm(`確定要建立「系統管理員」帳號？\n\n${createForm.name || "此帳號"}將可使用全部功能，包括審核、停用與建立其他帳號。`)
  ) {
    return;
  }
  const result = createAccount({ ...createForm }, actor());
  if (!result.ok) {
    formErrors.value = result.errors;
    return;
  }
  creating.value = false;
  currentTab.value = "active";
  notice.value = `已建立 ${result.account.name}（${getRoleLabel(result.account.role)}），已寄出設定密碼信到 ${result.account.email}`;
  reload();
};
</script>

<style scoped>
.accounts-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 48px;
}

.top-bar {
  background: #5d4037;
  color: #fff;
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

.header-right {
  display: flex;
  justify-content: flex-end;
}

.header-center {
  flex: 2;
  text-align: center;
}

.header-center h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
}

.back-btn {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.main-content {
  max-width: 960px;
  margin-top: 20px;
  padding: 0 16px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.prototype-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #6d4c41;
  text-decoration: none;
}

.prototype-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px dashed #a1887f;
  color: #6d4c41;
  background: #fff;
}

.notice {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 14px;
  font-weight: 600;
}

.notice-close {
  border: none;
  background: transparent;
  color: inherit;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.tab {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #d6ccc2;
  background: #fff;
  color: #5d4037;
  font-size: 14px;
}

.tab.active {
  background: #5d4037;
  border-color: #5d4037;
  color: #fff;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
  color: #8d6e63;
}

.account-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  border: 1px solid #eadfd8;
  border-left: 4px solid #d6ccc2;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

.account-card.pending {
  border-left-color: #f9a825;
}

.account-card.active {
  border-left-color: #43a047;
}

.account-card.rejected,
.account-card.suspended {
  border-left-color: #9e9e9e;
}

.card-main {
  min-width: 0;
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
  color: #6d4c41;
}

.account-card h4 {
  font-size: 16px;
  font-weight: 700;
  color: #3e2723;
  margin: 0 0 4px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0;
  font-size: 13px;
  color: #8d6e63;
  overflow-wrap: anywhere;
}

.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  background: #eee;
  color: #555;
}

.status-badge.pending {
  background: #fff8e1;
  color: #e65100;
}

.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.rejected {
  background: #fbe9e7;
  color: #bf360c;
}

.status-badge.suspended {
  background: #eceff1;
  color: #455a64;
}

.demo-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px dashed #a1887f;
}

.card-actions {
  flex-shrink: 0;
}

.primary-btn,
.outline-btn,
.danger-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.primary-btn {
  border: none;
  background: #5d4037;
  color: #fff;
}

.primary-btn:hover {
  background: #4e342e;
}

.outline-btn {
  border: 1px solid #5d4037;
  background: #fff;
  color: #5d4037;
}

.danger-btn {
  border: none;
  background: #c62828;
  color: #fff;
}

.small {
  padding: 6px 14px;
}

/* 對話框 */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(33, 22, 18, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px 16px;
  overflow-y: auto;
}

.dialog {
  width: 100%;
  max-width: 640px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1e8e1;
}

.dialog-head h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #3e2723;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  border: none;
  background: transparent;
  font-size: 18px;
  color: #6d4c41;
}

.dialog-body {
  padding: 16px 20px 20px;
}

.sub-title {
  margin: 16px 0 8px;
  font-size: 15px;
  font-weight: 700;
  color: #5d4037;
}

.sub-title:first-child {
  margin-top: 0;
}

.info-grid {
  display: grid;
  gap: 6px;
  margin: 0;
  font-size: 14px;
}

.info-grid div {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 8px;
}

.info-grid dt {
  font-weight: 600;
  color: #8d6e63;
}

.info-grid dd {
  margin: 0;
  color: #3e2723;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.action-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-form .sub-title {
  margin-top: 18px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #5d4037;
  margin-top: 4px;
}

.text-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #d6ccc2;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}

.text-input.invalid {
  border-color: #e57373;
}

.choice-row {
  display: flex;
  gap: 8px;
}

.choice {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #d6ccc2;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.choice.approve.selected {
  border-color: #43a047;
  background: #e8f5e9;
}

.choice.reject.selected {
  border-color: #e64a19;
  background: #fbe9e7;
}

.required {
  color: #c62828;
  margin-left: 2px;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: #8d6e63;
}

.hint.warning {
  color: #e65100;
}

.field-error {
  margin: 0;
  font-size: 13px;
  color: #c62828;
}

.history {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #5d4037;
  display: grid;
  gap: 4px;
}

@media (max-width: 576px) {
  .account-card {
    flex-direction: column;
    align-items: stretch;
  }

  .info-grid div {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
