<template>
  <!-- 角色預覽（原型展示用）：各角色登入後畫面的縮小模擬；點分頁不會切換登入帳號 -->
  <div class="role-preview">
    <!-- 示範資料 -->
    <section class="demo-box" aria-label="示範資料">
      <div class="demo-text">
        <h3>示範資料</h3>
        <p v-if="hasDemo" class="demo-status">
          已載入：資源 {{ demo.resource?.code ?? "—" }}、評估 {{ demo.assessment?.code ?? "—" }}、個案 {{ demo.case?.code ?? "—" }}
          （{{ DEMO_NAMES.person }}）
        </p>
        <p v-else class="demo-status">尚未載入</p>
        <p class="hint">
          一位虛構民眾的一串資料：1 筆綠燈資源（綁定 provider@demo.carelink）、1 筆已判讀為橘燈轉介的評估、
          1 筆已晤談並轉介、等待資源點回報的個案。
        </p>
      </div>
      <button type="button" class="load-btn" @click="loadDemo">
        <i class="fa-solid fa-flask" aria-hidden="true"></i> 載入示範資料
      </button>
    </section>
    <p v-if="message" class="message" role="status">{{ message }}</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <!-- 角色分頁 -->
    <div class="tabs" role="tablist" aria-label="角色">
      <button
        v-for="g in groups"
        :id="`preview-tab-${g.key}`"
        :key="g.key"
        type="button"
        role="tab"
        :aria-selected="selectedKey === g.key"
        :aria-controls="`preview-panel-${g.key}`"
        :class="['tab', { active: selectedKey === g.key }]"
        @click="selectedKey = g.key"
      >
        {{ g.role ? g.label : "民眾" }}
      </button>
    </div>

    <section
      :id="`preview-panel-${preview.key}`"
      class="panel"
      role="tabpanel"
      :aria-labelledby="`preview-tab-${preview.key}`"
    >
      <p class="panel-desc">
        {{ preview.description }}
        <template v-if="preview.account">｜示範帳號 {{ preview.account.email }}</template>
      </p>

      <!-- 登入後畫面的縮小模擬 -->
      <div class="mock-screen" aria-label="畫面模擬">
        <div class="mock-header">
          <span class="mock-brand">CareLink</span>
          <span v-if="preview.header" class="mock-user">{{ preview.header.name }}｜{{ preview.header.roleLabel }}</span>
          <span v-else class="mock-user">未登入</span>
        </div>

        <div class="mock-body">
          <!-- 首頁入口（只顯示，不可點） -->
          <div v-if="preview.user" class="mock-block">
            <p class="mock-title">首頁入口</p>
            <div class="shortcut-row">
              <span v-for="s in preview.shortcuts" :key="s.key" class="shortcut">
                <i :class="['fa-solid', s.icon]" aria-hidden="true"></i> {{ s.label }}
              </span>
              <span v-if="!preview.shortcuts.length" class="muted">沒有快捷入口</span>
            </div>
          </div>

          <!-- 待辦 -->
          <div v-if="preview.user" class="mock-block">
            <p class="mock-title">
              待辦
              <span v-if="preview.todos" class="count">共 {{ preview.todos.total }} 筆</span>
            </p>
            <p v-if="!preview.todos" class="muted">此角色沒有待辦頁</p>
            <p v-else-if="!preview.todos.items.length" class="muted">目前沒有待辦</p>
            <ul v-else class="todo-list">
              <li v-for="(t, i) in preview.todos.items" :key="i">
                <span class="type-badge">{{ t.typeLabel }}</span>
                {{ t.name }}<span v-if="t.code" class="code">{{ t.code }}</span>
                <span class="muted">{{ t.dateText || `到期日 ${t.dueDate || "下次來院時"}` }}</span>
              </li>
            </ul>
          </div>

          <!-- 示範資料在此角色畫面的樣子 -->
          <div class="mock-block">
            <p class="mock-title">示範資料在此畫面的樣子</p>
            <p v-if="!content" class="muted">載入示範資料後可看到此角色的畫面內容</p>

            <!-- 民眾：探索頁的資源卡片 -->
            <template v-else-if="content.kind === 'explore'">
              <p class="where">探索頁</p>
              <div v-if="content.card" class="mini-card">
                <span v-if="content.card.badge" class="badge">{{ content.card.badge }}</span>
                <strong>{{ content.card.title }}</strong>
                <p>{{ content.card.description }}</p>
                <p class="muted">
                  {{ content.card.region }}<template v-if="content.card.place">｜{{ content.card.place }}</template>
                  <template v-if="content.card.audience">｜適用：{{ content.card.audience }}</template>
                </p>
              </div>
              <p v-else class="muted">示範資源目前不會出現在探索頁</p>
            </template>

            <!-- 資源管理員：資源列表的卡片 -->
            <template v-else-if="content.kind === 'resourceList'">
              <p class="where">資源管理</p>
              <div v-if="content.row" class="mini-card">
                <p class="card-head">
                  <span class="code">{{ content.row.code }}</span>
                  <span>{{ content.row.organization }}</span>
                  <span>{{ content.row.address.district }}</span>
                  <span class="badge">{{ content.row.statusText }}</span>
                  <span v-if="content.row.overdue" class="badge warn">待驗證</span>
                </p>
                <strong>{{ content.row.name }}</strong>
                <p class="chips">
                  <span class="badge">{{ content.row.riskText }}</span>
                  <span class="badge">{{ content.row.partnershipText }}</span>
                  <span class="badge">{{ content.row.exploreText }}</span>
                </p>
                <p class="muted">{{ content.row.tagTexts.join(" ") }}</p>
              </div>
            </template>

            <!-- 判讀人員：評估列表的卡片 -->
            <template v-else-if="content.kind === 'assessmentList'">
              <p class="where">評估列表</p>
              <div v-if="content.row" class="mini-card">
                <p class="card-head">
                  <span class="code">{{ content.row.code }}</span>
                  <span class="badge">{{ content.row.statusText }}</span>
                  <span v-if="content.row.lightText" class="badge">{{ content.row.lightText }}</span>
                  <span v-if="content.row.pendingCase" class="badge warn">待開案</span>
                  <span v-if="content.row.caseCode" class="badge">已開案 {{ content.row.caseCode }}</span>
                </p>
                <strong>{{ content.row.person.name || "未填姓名" }}</strong>
                <p class="muted">
                  填表日期 {{ content.row.filledAt || "—" }}
                  <template v-if="content.row.review.readerName">｜判讀 {{ content.row.review.readerName }}</template>
                  <template v-if="content.row.nextCheckAt">｜下次確認 {{ content.row.nextCheckAt }}</template>
                </p>
              </div>
            </template>

            <!-- 健康管理員：個案列表的卡片 -->
            <template v-else-if="content.kind === 'caseList'">
              <p class="where">個案管理</p>
              <div v-if="content.row" class="mini-card">
                <p class="card-head">
                  <span class="code">{{ content.row.code }}</span>
                  <span class="badge">{{ content.row.stageText }}</span>
                  <span v-if="content.row.overdue" class="badge warn">首次聯繫逾期（開案 {{ content.row.daysOpen }} 天）</span>
                  <span v-if="content.row.followUpDue" class="badge warn">追蹤到期</span>
                </p>
                <strong>{{ content.row.person.name || "未命名個案" }}</strong>
                <p class="muted">
                  <template v-if="content.row.referral.assessmentCode">評估 {{ content.row.referral.assessmentCode }}｜</template>
                  <template v-if="content.row.latestLinkage">連結：{{ content.row.linkageText }}｜</template>
                  <template v-if="content.row.nextFollowUp">
                    下次追蹤 {{ content.row.nextFollowUp.plannedAt }}（{{ content.row.nextFollowUp.round }} 個月）｜
                  </template>
                  <template v-if="content.row.managerName">健康管理員 {{ content.row.managerName }}</template>
                </p>
              </div>
            </template>

            <!-- 資源點：資源端後台的轉介紀錄 -->
            <template v-else-if="content.kind === 'referrals'">
              <p class="where">資源端後台</p>
              <p v-if="!preview.user?.resourceId" class="muted">此帳號尚未綁定資源</p>
              <p v-else-if="!content.rows.length" class="muted">目前沒有轉介到此資源的個案</p>
              <div v-for="row in content.rows" :key="`${row.caseItem.id}-${row.index}`" class="mini-card">
                <p class="card-head">
                  <span class="code">{{ row.caseItem.code }}</span>
                  <span class="badge">{{ row.statusText }}</span>
                  <span v-if="row.linkage.escortNeeded" class="badge warn">首次需健康管理員陪同</span>
                </p>
                <strong>{{ row.caseItem.person.name || "未命名個案" }}</strong>
                <p class="muted">
                  轉介日 {{ row.linkage.linkedAt || "—" }}｜個案階段 {{ row.stageText }}
                  <template v-if="row.caseItem.managerName">｜健康管理員 {{ row.caseItem.managerName }}</template>
                </p>
                <p v-if="row.linkage.reason" class="muted">轉介說明：{{ row.linkage.reason }}</p>
              </div>
            </template>

            <!-- 系統管理員：待審核帳號數與各列表筆數 -->
            <template v-else-if="content.kind === 'adminSummary'">
              <p class="count-row">
                <span class="count-item"><strong>{{ content.pendingAccounts }}</strong> 待審核帳號</span>
                <span v-for="c in content.counts" :key="c.key" class="count-item">
                  <strong>{{ c.count }}</strong> {{ c.label }}
                </span>
              </p>
            </template>
          </div>
        </div>
      </div>

      <!-- 能進入的頁面（可收合） -->
      <details class="pages" open>
        <summary>能進入的頁面（{{ preview.pages.length }}）</summary>
        <ul>
          <li v-for="p in preview.pages" :key="p.route">
            <strong>{{ p.label }}</strong>
            <code>{{ p.target.path }}</code>
            <span class="muted">{{ p.description }}</span>
            <span v-if="p.target.source === 'demo'" class="note demo">示範資料 {{ p.target.code }}</span>
            <span v-else-if="p.target.source === 'fallback'" class="note">尚無示範資料，改開列表頁</span>
          </li>
        </ul>
      </details>

      <div class="enter-row">
        <button type="button" class="enter-btn" @click="enterAsRole">
          <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
          {{ preview.account ? "實際以此角色進入" : "以民眾身分開啟首頁（會登出）" }}
        </button>
        <span class="muted">
          <template v-if="preview.account">以 {{ preview.account.email }} 登入，前往 {{ preview.homePath }}</template>
          <template v-else>清除目前的登入狀態</template>
        </span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { DEMO_NAMES, countData, findDemoData, loadDemoData } from "../services/demoData.js";
import { buildRolePreview, getPreviewGroups, hasDemoData } from "../services/rolePreview.js";
import { clearCurrentUser, login } from "../utils/auth.js";

// loaded：載入示範資料後；session-changed：以某角色進入後（首頁需重新讀取登入者與資料）
const emit = defineEmits(["loaded", "session-changed"]);

const router = useRouter();
const groups = getPreviewGroups();
const selectedKey = ref(groups[0].key);
const demo = ref(findDemoData());
// 資料都存在瀏覽器儲存區，不是響應式；載入示範資料後遞增版本號讓預覽重新計算
const version = ref(0);
const hasDemo = computed(() => hasDemoData(demo.value));
const preview = computed(() => {
  version.value;
  return buildRolePreview(groups.find((g) => g.key === selectedKey.value), { demo: demo.value });
});
const content = computed(() => preview.value.content);
const message = ref("");
const error = ref("");

// 載入示範資料：清空所有資源、評估、個案後重新建立
const loadDemo = () => {
  const counts = countData();
  const ok = confirm(
    `確定要載入示範資料？\n\n會清空目前全部 ${counts.resources} 筆資源、${counts.assessments} 筆評估、${counts.cases} 筆個案（含自建資料），只保留示範資料。此動作無法復原。\n\n帳號不受影響；資源點示範帳號會改綁到示範資源。`
  );
  if (!ok) return;
  error.value = "";
  try {
    demo.value = loadDemoData();
    version.value += 1;
    message.value = `已載入示範資料：資源 ${demo.value.resource.code}、評估 ${demo.value.assessment.code}、個案 ${demo.value.case.code}`;
    emit("loaded", demo.value);
  } catch (e) {
    message.value = "";
    error.value = `載入失敗：${e.message}`;
  }
};

// 實際以此角色進入：以示範帳號登入後前往該角色的首頁；民眾則登出後回首頁
const enterAsRole = () => {
  const { account, homePath } = preview.value;
  if (account) {
    const result = login({ email: account.email, password: account.password });
    if (!result.ok) {
      error.value = `無法以 ${account.email} 登入：${result.error}`;
      return;
    }
  } else {
    clearCurrentUser();
  }
  emit("session-changed");
  router.push(homePath);
};
</script>

<style scoped>
.role-preview {
  color: #263238;
}

.demo-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #cfd8dc;
}

.demo-text {
  flex: 1 1 360px;
  min-width: 0;
}

.demo-box h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
}

.demo-status {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.hint,
.muted {
  margin: 0;
  font-size: 12px;
  color: #607d8b;
  line-height: 1.6;
}

.load-btn,
.enter-btn {
  flex-shrink: 0;
  padding: 9px 16px;
  border: none;
  border-radius: 8px;
  background: #37474f;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.load-btn:hover,
.enter-btn:hover {
  background: #263238;
}

.message,
.error {
  margin: 10px 0 0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
}

.message {
  background: #e8f5e9;
  color: #2e7d32;
}

.error {
  background: #fbe9e7;
  color: #bf360c;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 16px 0 0;
}

.tab {
  padding: 7px 14px;
  border: 1px solid #b0bec5;
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  background: #eceff1;
  color: #37474f;
  font-size: 14px;
  font-weight: 600;
}

.tab.active {
  background: #fff;
  color: #263238;
}

.panel {
  padding: 14px;
  background: #fff;
  border: 1px solid #b0bec5;
  border-radius: 0 12px 12px 12px;
}

.panel-desc {
  margin: 0 0 10px;
  font-size: 13px;
  color: #455a64;
  overflow-wrap: anywhere;
}

/* 縮小模擬的畫面 */
.mock-screen {
  border: 1px solid #cfd8dc;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(38, 50, 56, 0.1);
}

.mock-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 12px;
  background: #5d4037;
  color: #fff;
  font-size: 13px;
}

.mock-brand {
  font-weight: 700;
}

.mock-user {
  overflow-wrap: anywhere;
}

.mock-body {
  display: grid;
  gap: 12px;
  padding: 12px;
  background: #fcfaf8;
}

.mock-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #5d4037;
}

.count {
  margin-left: 6px;
  font-weight: 400;
  color: #8d6e63;
}

.shortcut-row,
.chips,
.count-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.shortcut {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #eadfd8;
  background: #fff;
  font-size: 12px;
  color: #5d4037;
  cursor: default;
}

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
  font-size: 13px;
}

.type-badge,
.badge {
  display: inline-block;
  margin-right: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #f5ece5;
  color: #5d4037;
  font-size: 11px;
  font-weight: 600;
}

.badge.warn {
  background: #fff3e0;
  color: #e65100;
}

.code {
  margin: 0 4px;
  font-size: 12px;
  color: #8d6e63;
}

.where {
  margin: 0 0 4px;
  font-size: 11px;
  color: #8d6e63;
}

.mini-card {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #eadfd8;
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
}

.mini-card + .mini-card {
  margin-top: 6px;
}

.mini-card p {
  margin: 0;
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  font-size: 12px;
  color: #6d4c41;
}

.count-item {
  padding: 8px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #eadfd8;
  font-size: 12px;
}

.count-item strong {
  display: block;
  font-size: 18px;
  color: #3e2723;
}

/* 能進入的頁面 */
.pages {
  margin-top: 12px;
}

.pages summary {
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: #37474f;
}

.pages ul {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.pages li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  font-size: 13px;
}

.pages code {
  font-size: 12px;
  color: #607d8b;
  overflow-wrap: anywhere;
}

.note {
  font-size: 12px;
  color: #78909c;
}

.note.demo {
  color: #2e7d32;
}

.enter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-top: 14px;
}
</style>
