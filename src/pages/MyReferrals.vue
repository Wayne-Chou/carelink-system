<template>
  <div class="referral-page">
    <div class="top-bar">
      <div class="header-left"></div>
      <div class="header-center">
        <h2>我的轉介</h2>
      </div>
      <div class="header-right">
        <router-link v-if="canOpen(newPath)" :to="newPath" class="top-btn" data-tour="my-referrals-new">＋轉介民眾</router-link>
      </div>
    </div>

    <div class="main-content">
      <p class="hint mb-3" data-tour="my-referrals-status">
        狀態：已送出 → 處理中（健康管理員已開始處理）→ 已開案 → 已結案；或未開案。為保護當事人隱私，這裡只顯示處理狀態，不顯示後續的服務內容。如果已結案的民眾又需要幫忙，請再送出一張新的轉介單。
      </p>

      <div v-if="!rows.length" class="empty-state">目前沒有送出的轉介</div>
      <div v-else data-tour="my-referrals-list">
        <article v-for="row in rows" :key="row.id" :class="['row-card', row.status]">
          <div>
            <div class="row-head">
              <span class="code">{{ row.code }}</span>
              <span :class="['status-badge', row.status]">{{ row.statusText }}</span>
            </div>
            <h4>{{ row.personName || "未填姓名" }}</h4>
            <p class="meta">
              <span>送出日期 {{ row.submittedDate || "—" }}</span>
              <span v-if="row.declineReasonText">未開案原因：{{ row.declineReasonText }}</span>
              <span v-if="row.closedDate">結案日期 {{ row.closedDate }}</span>
            </p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCanOpen } from "../composables/useCanOpen.js";
import { myReferralRows } from "../services/referralService.js";
import { pathOf } from "../router/routes.js";
import { getCurrentUser } from "../utils/auth.js";

const canOpen = useCanOpen();
const newPath = pathOf("referral-new");

// 只列出自己送出的轉介單；只有編碼、姓名、送出日期、狀態（未開案時加上原因類別，已結案時加上結案日期）
const rows = myReferralRows(getCurrentUser()?.email);
</script>

<style scoped src="../styles/referralPage.css"></style>
