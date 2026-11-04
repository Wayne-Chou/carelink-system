<template>
  <div class="referral-page">
    <div class="top-bar">
      <div class="header-left">
        <router-link v-if="canOpen(listPath)" :to="listPath" class="back-link">← 守望員轉介</router-link>
      </div>
      <div class="header-center">
        <h2>轉介單</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="main-content">
      <div v-if="!referral" class="empty-state">找不到這張轉介單</div>

      <template v-else>
        <p v-if="notice" class="notice" role="status">{{ notice }}</p>

        <section class="card" data-tour="referral-detail-content">
          <div class="row-head mb-2">
            <span class="code">{{ referral.code }}</span>
            <span :class="['status-badge', referral.status]">{{ label(REFERRAL_STATUSES, referral.status) }}</span>
            <span class="hint">送出時間 {{ formatDisplayTime(referral.createdAt) }}</span>
          </div>
          <h3>被轉介人</h3>
          <dl class="info-grid">
            <div><dt>姓名</dt><dd>{{ referral.person.name || "—" }}</dd></div>
            <div><dt>聯絡電話</dt><dd>{{ referral.person.phone || "—" }}</dd></div>
            <div><dt>縣市與行政區</dt><dd>{{ region || "未填" }}</dd></div>
            <div><dt>年齡層</dt><dd>{{ label(AGE_GROUPS, referral.person.ageGroup) || "未填" }}</dd></div>
            <div class="wide"><dt>發現的狀況</dt><dd>{{ situationText || "—" }}</dd></div>
            <div class="wide"><dt>狀況說明</dt><dd>{{ referral.description || "—" }}</dd></div>
            <div><dt>是否已告知當事人會有人聯繫</dt><dd>{{ label(INFORMED_OPTIONS, referral.informed) || "未填" }}</dd></div>
          </dl>
        </section>

        <section class="card" data-tour="referral-detail-watcher">
          <h3>轉介的守望員</h3>
          <dl class="info-grid">
            <div><dt>姓名</dt><dd>{{ referral.watcher.name || "—" }}</dd></div>
            <div><dt>所屬單位或社區</dt><dd>{{ referral.watcher.unit || "—" }}</dd></div>
            <div><dt>身分類別</dt><dd>{{ referral.watcher.identity || "—" }}</dd></div>
            <div><dt>電話</dt><dd>{{ referral.watcher.phone || "未提供" }}</dd></div>
            <div><dt>Email</dt><dd>{{ referral.watcher.email || "—" }}</dd></div>
          </dl>
        </section>

        <!-- 處理：開案或不開案 -->
        <section v-if="isPending" class="card" data-tour="referral-detail-actions">
          <h3>處理這張轉介單</h3>
          <p class="hint mb-3">
            守望員轉介時沒有先取得當事人同意。開案後個案從第 1 階段開始，第一次聯繫時向本人說明並取得同意。
          </p>
          <div class="actions mb-3">
            <button type="button" class="primary-btn" @click="openCase">開案</button>
            <button type="button" class="danger-btn" @click="declining = !declining">不開案</button>
          </div>

          <form v-if="declining" novalidate @submit.prevent="submitDecline">
            <div class="field">
              <span class="field-label">不開案原因<span class="required">*</span></span>
              <div class="radio-row" role="radiogroup" aria-label="不開案原因">
                <label v-for="o in DECLINE_REASONS" :key="o.code">
                  <input v-model="decline.reason" type="radio" name="decline-reason" :value="o.code" /> {{ o.label }}
                </label>
              </div>
              <p v-if="declineErrors.reason" class="field-error">{{ declineErrors.reason }}</p>
            </div>
            <label class="field">
              <span class="field-label">說明（選填，守望員看不到）</span>
              <textarea v-model.trim="decline.note" rows="2" class="text-input" placeholder="例：電話三次未接，已請守望員協助轉達"></textarea>
            </label>
            <button type="submit" class="danger-btn">確定不開案</button>
          </form>
          <p v-if="actionError" class="field-error" role="alert">{{ actionError }}</p>
        </section>

        <!-- 已決定 -->
        <section v-else class="card">
          <h3>處理結果</h3>
          <p v-if="referral.status === 'opened'">
            已開案：
            <router-link v-if="canOpen(casePath)" :to="casePath">{{ referral.caseCode }}（前往個案）</router-link>
            <span v-else>{{ referral.caseCode }}</span>
          </p>
          <p v-else-if="referral.status === 'closed'">
            已結案：
            <router-link v-if="canOpen(casePath)" :to="casePath">{{ referral.caseCode }}</router-link>
            <span v-else>{{ referral.caseCode }}</span>
            （結案日期 {{ referral.closedAt || "—" }}）
          </p>
          <dl v-else class="info-grid">
            <div><dt>未開案原因</dt><dd>{{ label(DECLINE_REASONS, referral.decision?.reason) || "—" }}</dd></div>
            <div v-if="referral.decision?.note" class="wide"><dt>說明</dt><dd>{{ referral.decision.note }}</dd></div>
          </dl>
          <p v-if="referral.decision" class="hint">
            {{ referral.decision.actor || "—" }}｜{{ formatDisplayTime(referral.decision.at) }}
          </p>
        </section>

        <section v-if="referral.history?.length" class="card">
          <h3>歷程</h3>
          <ol class="history">
            <li v-for="(h, i) in [...referral.history].reverse()" :key="i">
              <strong>{{ formatDisplayTime(h.at) }}</strong>
              {{ label(REFERRAL_ACTIONS, h.action) }}（{{ label(REFERRAL_STATUSES, h.status) }}）
              <span v-if="h.actor">｜{{ h.actor }}</span>
              <span v-if="h.note">｜{{ h.note }}</span>
            </li>
          </ol>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { useCanOpen } from "../composables/useCanOpen.js";
import {
  AGE_GROUPS,
  DECLINE_REASONS,
  INFORMED_OPTIONS,
  PENDING_STATUSES,
  REFERRAL_ACTIONS,
  REFERRAL_STATUSES,
  SITUATIONS,
  referralLabel as label,
} from "../config/referralLabels.js";
import { confirmDialog } from "../services/dialogService.js";
import { declineReferral, getReferralById, markProcessing, openCaseForReferral } from "../services/referralService.js";
import { pathOf } from "../router/routes.js";
import { getCurrentUser } from "../utils/auth.js";
import { formatDateTime } from "../utils/resourceFormat.js";

const route = useRoute();
const canOpen = useCanOpen();
const listPath = pathOf("referrals");
const currentUser = getCurrentUser();
const actor = currentUser?.name ?? "";

// 打開轉介單：「已送出」改為「處理中」（守望員的我的轉介跟著顯示處理中）
const referral = ref(getReferralById(route.params.id));
if (referral.value) referral.value = markProcessing(referral.value.id, { actor }).referral ?? referral.value;

const notice = ref("");
const actionError = ref("");
const isPending = computed(() => PENDING_STATUSES.includes(referral.value?.status));
const region = computed(() => [referral.value?.person.city, referral.value?.person.district].filter(Boolean).join(" "));
const situationText = computed(() => (referral.value?.situations ?? []).map((c) => label(SITUATIONS, c)).join("、"));
const casePath = computed(() => (referral.value?.caseId ? pathOf("case-detail", { id: referral.value.caseId }) : ""));
const formatDisplayTime = (value) => (value ? formatDateTime(value) : "—");

const openCase = async () => {
  const ok = await confirmDialog({
    id: "referral-open-case",
    title: `確定要為「${referral.value.person.name}」開案？`,
    message: "會建立一筆個案（來源「守望員轉介」），從第 1 階段開始；第一次聯繫時需取得民眾同意。",
    confirmText: "開案",
  });
  if (!ok) return;
  const managerName = currentUser?.role === "manager" ? actor : "";
  const result = openCaseForReferral(referral.value.id, { actor, managerName });
  if (!result.ok) {
    actionError.value = result.error;
    return;
  }
  actionError.value = "";
  referral.value = result.referral;
  notice.value = `已開案 ${result.case.code}，個案從第 1 階段開始；第一次聯繫時請取得民眾同意`;
};

const declining = ref(false);
const decline = reactive({ reason: "", note: "" });
const declineErrors = ref({});
const submitDecline = () => {
  const result = declineReferral(referral.value.id, { ...decline }, { actor });
  if (!result.ok) {
    declineErrors.value = result.errors ?? {};
    actionError.value = result.error ?? "";
    return;
  }
  declineErrors.value = {};
  actionError.value = "";
  referral.value = result.referral;
  notice.value = `已記錄 ${result.referral.code} 不開案`;
};
</script>

<style scoped src="../styles/referralPage.css"></style>
<style scoped>
.history {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #5d4037;
}
.history li {
  margin-bottom: 4px;
}
</style>
