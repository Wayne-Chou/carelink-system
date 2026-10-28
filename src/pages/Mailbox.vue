<template>
  <div class="mailbox-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>模擬信箱 <span class="prototype-tag">原型展示用</span></h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="container main-content">
      <p class="intro">
        系統的通知信（註冊申請、審核結果、帳號停用與重新啟用、帳號建立、重設密碼）都寫在這裡，不會實際寄出。
        資料存在瀏覽器，關閉分頁後清除。正式版改由後端寄送 Email。
      </p>

      <div v-if="!mailboxes.length" class="empty-state">
        <i class="fa-regular fa-envelope-open" aria-hidden="true"></i>
        <p>目前沒有任何信件</p>
      </div>

      <div v-else class="mailbox-layout">
        <!-- 收件人 -->
        <nav class="recipients" aria-label="收件人">
          <label class="visually-hidden" for="recipient-select">收件人</label>
          <select id="recipient-select" v-model="selectedTo" class="recipient-select">
            <option v-for="box in mailboxes" :key="box.to" :value="box.to">{{ box.to }}（{{ box.mails.length }}）</option>
          </select>
          <ul class="recipient-list">
            <li v-for="box in mailboxes" :key="box.to">
              <button
                type="button"
                :class="['recipient-btn', { active: box.to === selectedTo }]"
                :aria-current="box.to === selectedTo ? 'true' : undefined"
                @click="selectRecipient(box.to)"
              >
                <span class="recipient-email">{{ box.to }}</span>
                <span class="count">{{ box.mails.length }}</span>
              </button>
            </li>
          </ul>
        </nav>

        <section class="mail-area">
          <!-- 信件列表（新的在前） -->
          <ul class="mail-list">
            <li v-for="mail in currentMails" :key="mail.id">
              <button
                type="button"
                :class="['mail-item', { active: mail.id === openedId }]"
                @click="openedId = mail.id"
              >
                <span class="mail-subject">{{ mail.subject }}</span>
                <span class="mail-time">{{ formatDateTime(mail.sentAt) }}</span>
              </button>
            </li>
          </ul>

          <!-- 信件內容 -->
          <article v-if="openedMail" class="mail-view">
            <h3>{{ openedMail.subject }}</h3>
            <dl class="mail-meta">
              <div><dt>收件人</dt><dd>{{ openedMail.to }}</dd></div>
              <div><dt>寄出時間</dt><dd>{{ formatDateTime(openedMail.sentAt) }}</dd></div>
              <div><dt>類型</dt><dd>{{ typeLabel(openedMail.type) }}</dd></div>
            </dl>
            <p v-for="(para, i) in paragraphs(openedMail.body)" :key="i" class="mail-body">{{ para }}</p>
            <div v-if="openedMail.links?.length" class="mail-links">
              <router-link v-for="link in openedMail.links" :key="link.path" :to="link.path" class="mail-link">
                {{ link.label }} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </router-link>
            </div>
          </article>
          <p v-else class="muted">請選擇一封信</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MAIL_TYPES, getMailboxes } from "../services/mailService.js";
import { formatDateTime } from "../utils/resourceFormat.js";
import { goBack } from "../utils/navigation.js";

const router = useRouter();
const route = useRoute();
const back = () => goBack(router, "/login");

const mailboxes = getMailboxes();
// ?to=Email 可直接開啟某位收件人的信件
const initialTo = typeof route.query.to === "string" ? route.query.to.toLowerCase() : "";
const selectedTo = ref(mailboxes.some((b) => b.to === initialTo) ? initialTo : mailboxes[0]?.to ?? "");
const currentMails = computed(() => mailboxes.find((b) => b.to === selectedTo.value)?.mails ?? []);
const openedId = ref(currentMails.value[0]?.id ?? "");
const openedMail = computed(() => currentMails.value.find((m) => m.id === openedId.value) ?? null);

const selectRecipient = (to) => {
  selectedTo.value = to;
};
// 換收件人時打開最新的一封
watch(selectedTo, () => {
  openedId.value = currentMails.value[0]?.id ?? "";
});

const typeLabel = (code) => MAIL_TYPES.find((t) => t.code === code)?.label ?? code;
const paragraphs = (body) => String(body ?? "").split(/\n{2,}/);
</script>

<style scoped>
.mailbox-page {
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

.header-center {
  flex: 2;
  text-align: center;
}

.header-center h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.back-btn {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 14px;
}

.prototype-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px dashed #d7c2ad;
  color: #6d4c41;
  background: #fff;
}

.main-content {
  max-width: 1100px;
  margin-top: 20px;
  padding: 0 16px;
}

.intro {
  font-size: 14px;
  color: #6d4c41;
  line-height: 1.7;
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #8d6e63;
}

.empty-state i {
  font-size: 40px;
  margin-bottom: 12px;
}

.mailbox-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  align-items: start;
}

.recipient-select {
  display: none;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d6ccc2;
  background: #fff;
}

.recipient-list,
.mail-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recipient-list {
  background: #fff;
  border: 1px solid #eadfd8;
  border-radius: 12px;
  overflow: hidden;
}

.recipient-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid #f1e8e1;
  background: #fff;
  text-align: left;
  font-size: 14px;
  color: #3e2723;
}

.recipient-btn.active {
  background: #f5ece5;
  font-weight: 700;
}

.recipient-email {
  min-width: 0;
  overflow-wrap: anywhere;
}

.count {
  flex-shrink: 0;
  color: #8d6e63;
}

.mail-area {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.mail-list {
  background: #fff;
  border: 1px solid #eadfd8;
  border-radius: 12px;
  overflow: hidden;
}

.mail-item {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 10px 14px;
  border: none;
  border-bottom: 1px solid #f1e8e1;
  background: #fff;
  text-align: left;
}

.mail-item.active {
  background: #f5ece5;
}

.mail-subject {
  font-size: 14px;
  font-weight: 600;
  color: #3e2723;
  min-width: 0;
  overflow-wrap: anywhere;
}

.mail-time {
  font-size: 12px;
  color: #8d6e63;
}

.mail-view {
  background: #fff;
  border: 1px solid #eadfd8;
  border-radius: 12px;
  padding: 18px 20px;
}

.mail-view h3 {
  font-size: 17px;
  font-weight: 700;
  color: #3e2723;
  margin-bottom: 10px;
}

.mail-meta {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
  font-size: 13px;
  color: #6d4c41;
}

.mail-meta div {
  display: flex;
  gap: 8px;
}

.mail-meta dt {
  font-weight: 600;
  min-width: 64px;
}

.mail-meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.mail-body {
  white-space: pre-line;
  font-size: 15px;
  color: #3e2723;
  line-height: 1.8;
}

.mail-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mail-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #b98158;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
}

.mail-link:hover {
  background: #a06f4a;
  color: #fff;
}

.muted {
  color: #8d6e63;
}

@media (max-width: 768px) {
  .mailbox-layout {
    grid-template-columns: 1fr;
  }

  .recipient-select {
    display: block;
  }

  .recipient-list {
    display: none;
  }
}
</style>
