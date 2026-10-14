<template>
  <div class="case-detail-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>個案詳情</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div v-if="!caseItem" class="container main-content">
      <div class="empty-state">
        找不到個案資料
        <button type="button" class="outline-btn" @click="$router.push('/cases')">回個案列表</button>
      </div>
    </div>

    <div v-else class="container main-content">
      <!-- 基本資料與提醒 -->
      <section class="card summary-card">
        <div class="summary-head">
          <span class="case-code">{{ caseItem.code }}</span>
          <span :class="['stage-badge', `stage-${caseItem.stage}`]">{{ stageShort(caseItem.stage) }}</span>
          <span v-if="caseItem.isDemo" class="demo-badge">示範</span>
        </div>
        <h1 class="person-name">{{ caseItem.person.name || "未命名個案" }}</h1>
        <p class="person-meta">
          <span v-if="caseItem.person.phone"><i class="fa-solid fa-phone" aria-hidden="true"></i> {{ caseItem.person.phone }}</span>
          <span v-if="caseItem.person.livingAlone">獨居</span>
          <span v-if="caseItem.person.nationalId">身分證 {{ maskNationalId(caseItem.person.nationalId) }}</span>
          <span v-if="caseItem.managerName">健康管理員 {{ caseItem.managerName }}</span>
          <span>開案 {{ toDateString(caseItem.createdAt) }}</span>
        </p>

        <ol class="stepper" aria-label="個案階段">
          <li
            v-for="s in STEPS"
            :key="s.code"
            :class="{ done: stageIndex(caseItem.stage) > stageIndex(s.code), current: caseItem.stage === s.code }"
            :aria-current="caseItem.stage === s.code ? 'step' : undefined"
          >
            {{ s.label }}
          </li>
        </ol>

        <ul v-if="alerts.length" class="alert-list" role="status">
          <li v-for="a in alerts" :key="a.text" :class="['alert', a.level]">
            <i :class="a.icon" aria-hidden="true"></i> {{ a.text }}
          </li>
        </ul>
      </section>

      <p v-if="notice" class="notice" role="status">{{ notice }}</p>

      <!-- 第 1 階段 轉介 -->
      <section :class="['card', 'stage-card', stageState(1)]">
        <header class="stage-head">
          <h2><span class="step-no">1</span> 轉介</h2>
          <span class="stage-state">{{ stageStateLabel(1) }}</span>
        </header>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="field-label" for="person-name">姓名</label>
            <input id="person-name" v-model.trim="draft.person.name" type="text" :disabled="readonly" />
          </div>
          <div class="col-md-6">
            <label class="field-label" for="person-phone">電話</label>
            <input id="person-phone" v-model.trim="draft.person.phone" type="tel" :disabled="readonly" />
          </div>
          <div class="col-md-6">
            <label class="check-label">
              <input v-model="draft.person.livingAlone" type="checkbox" :disabled="readonly" /> 獨居
            </label>
          </div>
          <div class="col-md-6">
            <label class="field-label" for="manager-name">健康管理員</label>
            <input id="manager-name" v-model.trim="draft.managerName" type="text" :disabled="readonly" />
          </div>

          <div class="col-md-6">
            <label class="field-label" for="referrer-type">轉介來源</label>
            <select id="referrer-type" v-model="draft.referral.referrerType" :disabled="readonly || fromAssessment">
              <option value="">請選擇</option>
              <option v-for="o in REFERRER_TYPE_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="field-label" for="referrer-name">轉介者</label>
            <input id="referrer-name" v-model.trim="draft.referral.referrerName" type="text" :disabled="readonly" />
          </div>
          <div v-if="fromAssessment" class="col-12">
            <p class="assessment-link">
              <i class="fa-solid fa-clipboard-list" aria-hidden="true"></i>
              由生活近況評估開案：
              <router-link :to="`/assessments/${caseItem.referral.assessmentId}`">
                {{ caseItem.referral.assessmentCode || "查看評估" }}（前往判讀頁）
              </router-link>
            </p>
          </div>
          <div class="col-12">
            <label class="field-label" for="referral-reason">轉介原因（篩檢結果摘要）</label>
            <textarea id="referral-reason" v-model="draft.referral.reason" rows="2" :disabled="readonly"></textarea>
          </div>
          <div class="col-12">
            <label class="check-label strong">
              <input v-model="draft.referral.consent" type="checkbox" :disabled="readonly" @change="onConsentChange" />
              民眾同意轉介給健康管理員
            </label>
            <p v-if="draft.referral.consentAt" class="hint">同意時間：{{ formatDisplayTime(draft.referral.consentAt) }}</p>
          </div>
        </div>
        <div v-if="!readonly" class="stage-actions">
          <button type="button" class="outline-btn" @click="saveSection(1)">儲存</button>
          <button v-if="caseItem.stage === 1" type="button" class="primary-btn" @click="advance(1)">
            下一步：進入「諮詢」
          </button>
        </div>
        <ul v-if="advanceErrors[1]" class="error-list" role="alert">
          <li v-for="r in advanceErrors[1]" :key="r">{{ r }}</li>
        </ul>
      </section>

      <!-- 第 2 階段 晤談 -->
      <section :class="['card', 'stage-card', stageState(2)]">
        <header class="stage-head">
          <h2><span class="step-no">2</span> 晤談</h2>
          <span class="stage-state">{{ stageStateLabel(2) }}</span>
        </header>
        <p v-if="stageState(2) === 'future'" class="muted">尚未進入此階段</p>
        <template v-else>
          <div class="row g-3">
            <div class="col-md-8">
              <label class="field-label" for="first-contact">首次聯繫時間</label>
              <div class="inline-field">
                <input id="first-contact" v-model="draft.firstContactLocal" type="datetime-local" :disabled="readonly" />
                <button
                  v-if="!readonly && !caseItem.consultation.firstContactAt"
                  type="button"
                  class="outline-btn small"
                  @click="contactNow"
                >
                  記錄為現在
                </button>
              </div>
            </div>
            <div class="col-12">
              <label class="field-label" for="what-matters">對我而言什麼最重要 <span class="required">*</span></label>
              <textarea
                id="what-matters"
                v-model="draft.consultation.whatMatters"
                rows="2"
                placeholder="用民眾自己的話記錄，例：希望能再自己出門散步"
                :disabled="readonly"
              ></textarea>
            </div>
            <div class="col-12">
              <p class="field-label">需求標籤</p>
              <ChipSelect v-if="!readonly" v-model="draft.consultation.needTags" :options="needTagOptions" />
              <p v-else class="muted">{{ draft.consultation.needTags.map(getNeedTagLabel).join("、") || "未設定" }}</p>
            </div>
            <div class="col-12">
              <p class="field-label">共同目標 <span class="required">*</span></p>
              <div v-for="(goal, i) in draft.consultation.goals" :key="i" class="goal-row">
                <span class="goal-no">{{ i + 1 }}</span>
                <input
                  v-model="draft.consultation.goals[i]"
                  type="text"
                  :aria-label="`目標 ${i + 1}`"
                  placeholder="例：每週參加一次團體運動"
                  :disabled="readonly"
                />
                <button
                  v-if="!readonly"
                  type="button"
                  class="icon-btn"
                  :aria-label="`移除目標 ${i + 1}`"
                  @click="draft.consultation.goals.splice(i, 1)"
                >
                  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>
              <button v-if="!readonly" type="button" class="text-btn" @click="draft.consultation.goals.push('')">
                ＋ 新增目標
              </button>
            </div>
            <div class="col-12">
              <label class="field-label" for="consult-note">晤談紀錄</label>
              <textarea id="consult-note" v-model="draft.consultation.note" rows="3" :disabled="readonly"></textarea>
            </div>
          </div>
          <div v-if="!readonly" class="stage-actions">
            <button type="button" class="outline-btn" @click="saveSection(2)">儲存</button>
            <button v-if="caseItem.stage === 2" type="button" class="primary-btn" @click="advance(2)">
              下一步：進入「連結」
            </button>
          </div>
          <ul v-if="advanceErrors[2]" class="error-list" role="alert">
            <li v-for="r in advanceErrors[2]" :key="r">{{ r }}</li>
          </ul>
        </template>
      </section>

      <!-- 第 3 階段 連結 -->
      <section :class="['card', 'stage-card', stageState(3)]">
        <header class="stage-head">
          <h2><span class="step-no">3</span> 連結</h2>
          <span class="stage-state">{{ stageStateLabel(3) }}</span>
        </header>
        <p v-if="stageState(3) === 'future'" class="muted">尚未進入此階段</p>
        <template v-else>
          <p v-if="!caseItem.linkages.length" class="muted">尚未建立連結</p>
          <ol class="linkage-list">
            <li
              v-for="(l, i) in caseItem.linkages"
              :key="i"
              :class="['linkage-card', l.status, { latest: i === caseItem.linkages.length - 1 }]"
            >
              <div class="linkage-head">
                <span class="linkage-no">第 {{ i + 1 }} 次</span>
                <router-link :to="`/resources/${l.resourceId}`" class="linkage-name">
                  {{ l.resourceName || "未知資源" }}
                </router-link>
                <span :class="['status-badge', l.status]">{{ caseLabel(LINKAGE_STATUS_OPTIONS, l.status) }}</span>
                <span v-if="l.escortNeeded" class="escort-badge">需陪同</span>
              </div>
              <p class="linkage-meta">
                連結日 {{ l.linkedAt || "—" }}
                <template v-if="l.attendance">｜{{ caseLabel(ATTENDANCE_OPTIONS, l.attendance) }}</template>
              </p>
              <p v-if="l.reason" class="linkage-text">連結原因：{{ l.reason }}</p>
              <p v-if="l.providerNote" class="linkage-text">回報：{{ l.providerNote }}</p>
              <p
                v-if="i === caseItem.linkages.length - 1 && l.status !== 'failed' && latestResource && !latestResource.available"
                class="warning-text"
              >
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                {{ latestResource.deleted ? "此資源已從資源清單刪除" : `此資源目前${reasonLabels(latestResource.reasons)}，已不在轉介選單中` }}，請重新選擇資源
              </p>
            </li>
          </ol>

          <!-- 記錄資源點回報（最新一筆待回報、且資源仍可轉介時） -->
          <div v-if="!readonly && latestLinkage?.status === 'pending' && latestResource?.available" class="sub-panel">
            <p class="sub-title">記錄連結結果（資源點回報）</p>
            <div class="row g-2">
              <div class="col-md-4">
                <select v-model="reportForm.status" aria-label="連結結果">
                  <option value="">選擇結果</option>
                  <option value="success">成功</option>
                  <option value="failed">失敗</option>
                </select>
              </div>
              <div class="col-md-4">
                <select v-model="reportForm.attendance" aria-label="出席情形">
                  <option value="">出席情形（選填）</option>
                  <option v-for="o in ATTENDANCE_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
                </select>
              </div>
              <div class="col-md-4">
                <button type="button" class="outline-btn full" :disabled="!reportForm.status" @click="submitReport">
                  儲存結果
                </button>
              </div>
              <div class="col-12">
                <input v-model.trim="reportForm.providerNote" type="text" placeholder="回報說明（選填）" aria-label="回報說明" />
              </div>
            </div>
          </div>

          <!-- 最新一筆連結失敗（含資源點回報）：由健康管理員決定退回第 2 階段或重新選擇資源 -->
          <div v-if="!readonly && caseItem.stage === 3 && latestLinkage?.status === 'failed'" class="failed-panel">
            <p>
              <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
              最新一次連結失敗{{ latestLinkage.providerNote ? `（${latestLinkage.providerNote}）` : "" }}。
              可以在下方重新選擇資源，或退回第 2 階段重新評估。
            </p>
            <button type="button" class="outline-btn small" @click="confirmReturn('連結失敗，退回諮詢重新評估')">
              退回第 2 階段重新評估
            </button>
          </div>

          <!-- 建立新連結 -->
          <div v-if="canAddLinkage" class="sub-panel">
            <p class="sub-title">
              {{ caseItem.linkages.length ? "重新選擇資源" : "選擇資源" }}
              <small>（只列出可推薦的資源，共 {{ referralOptions.length }} 筆）</small>
            </p>
            <p v-if="latestLinkage?.status === 'pending'" class="hint">
              建立新連結時，原本的連結會記錄為「失敗：資源無法提供服務」，保留這次嘗試
            </p>
            <div v-if="!referralOptions.length" class="muted">目前沒有可推薦的資源</div>
            <div class="resource-options">
              <label
                v-for="{ resource, needsEscort } in referralOptions"
                :key="resource.id"
                :class="['resource-option', { selected: linkForm.resourceId === resource.id }]"
              >
                <input v-model="linkForm.resourceId" type="radio" name="link-resource" :value="resource.id" />
                <span>
                  <strong>{{ resource.name }}</strong>
                  <small>{{ resource.organization }}｜{{ formatRegion(resource) }}</small>
                  <small class="tags">{{ resource.needTags.slice(0, 3).map(getNeedTagLabel).join("、") }}</small>
                  <em v-if="needsEscort" class="escort-note">🟡 {{ ESCORT_NOTICE }}</em>
                </span>
              </label>
            </div>
            <label class="field-label" for="link-reason">連結原因</label>
            <input id="link-reason" v-model.trim="linkForm.reason" type="text" placeholder="例：住家附近、免費" />
            <div class="stage-actions">
              <button type="button" class="primary-btn" :disabled="!linkForm.resourceId" @click="submitLinkage">
                建立連結
              </button>
            </div>
          </div>

          <div v-if="!readonly && caseItem.stage === 3" class="stage-actions">
            <button type="button" class="primary-btn" @click="advance(3)">下一步：進入「追蹤」</button>
          </div>
          <ul v-if="advanceErrors[3]" class="error-list" role="alert">
            <li v-for="r in advanceErrors[3]" :key="r">{{ r }}</li>
          </ul>
        </template>
      </section>

      <!-- 第 4 階段 追蹤 -->
      <section :class="['card', 'stage-card', stageState(4)]">
        <header class="stage-head">
          <h2><span class="step-no">4</span> 追蹤</h2>
          <span class="stage-state">{{ stageStateLabel(4) }}</span>
        </header>
        <p v-if="!caseItem.followUps.length" class="muted">建立連結後會自動產生 1、3、6 個月追蹤排程</p>
        <p v-else-if="caseItem.stage === 3" class="hint follow-note">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          以下為預定排程；連結成功、進入追蹤階段後才能填寫
        </p>
        <table v-else class="follow-table">
          <thead>
            <tr>
              <th>追蹤</th>
              <th>排程日</th>
              <th>狀態</th>
              <th>結果</th>
              <th v-if="canRecordFollowUp"><span class="visually-hidden">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="f in caseItem.followUps" :key="`${f.round}-${f.plannedAt}`">
              <tr>
                <td>{{ f.round }} 個月</td>
                <td>{{ f.plannedAt || "—" }}</td>
                <td>
                  <span :class="['fu-badge', followUpStatus(f)]">{{ FOLLOW_UP_STATUS_LABELS[followUpStatus(f)] }}</span>
                </td>
                <td class="fu-result">
                  <template v-if="f.doneAt">
                    {{ f.doneAt }}｜{{ caseLabel(ATTENDANCE_OPTIONS, f.attendance) || "—" }}｜{{
                      caseLabel(PARTICIPATION_OPTIONS, f.participation) || "—"
                    }}｜<strong :class="['impact', f.impact]">{{ caseLabel(IMPACT_OPTIONS, f.impact) || "—" }}</strong>
                    <small v-if="f.note">{{ f.note }}</small>
                  </template>
                </td>
                <td v-if="canRecordFollowUp">
                  <button
                    v-if="!f.doneAt && followForm.round !== f.round"
                    type="button"
                    class="outline-btn small"
                    @click="openFollowForm(f)"
                  >
                    填寫
                  </button>
                </td>
              </tr>
              <tr v-if="followForm.round === f.round" class="follow-form-row">
                <td :colspan="canRecordFollowUp ? 5 : 4">
                  <div class="row g-2">
                    <div class="col-md-3">
                      <label class="field-label small" for="fu-date">追蹤日期</label>
                      <input id="fu-date" v-model="followForm.doneAt" type="date" />
                    </div>
                    <div class="col-md-3">
                      <label class="field-label small" for="fu-attendance">出席</label>
                      <select id="fu-attendance" v-model="followForm.attendance">
                        <option value="">請選擇</option>
                        <option v-for="o in ATTENDANCE_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label class="field-label small" for="fu-participation">參與</label>
                      <select id="fu-participation" v-model="followForm.participation">
                        <option value="">請選擇</option>
                        <option v-for="o in PARTICIPATION_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label class="field-label small" for="fu-impact">影響</label>
                      <select id="fu-impact" v-model="followForm.impact">
                        <option value="">請選擇</option>
                        <option v-for="o in IMPACT_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <input v-model.trim="followForm.note" type="text" placeholder="追蹤說明（選填）" aria-label="追蹤說明" />
                    </div>
                    <div class="col-12 form-buttons">
                      <button type="button" class="outline-btn small" @click="closeFollowForm">取消</button>
                      <button
                        type="button"
                        class="primary-btn small"
                        :disabled="!followForm.attendance || !followForm.participation || !followForm.impact"
                        @click="submitFollowUp"
                      >
                        儲存追蹤
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-if="!readonly && caseItem.stage === 4" class="stage-actions">
          <button type="button" class="primary-btn" @click="advance(4)">下一步：進入「結案」</button>
        </div>
        <ul v-if="advanceErrors[4]" class="error-list" role="alert">
          <li v-for="r in advanceErrors[4]" :key="r">{{ r }}</li>
        </ul>
      </section>

      <!-- 第 5 階段 結案 -->
      <section :class="['card', 'stage-card', stageState(5)]">
        <header class="stage-head">
          <h2><span class="step-no">5</span> 結案</h2>
          <span class="stage-state">{{ stageStateLabel(5) }}</span>
        </header>
        <p v-if="stageState(5) === 'future'" class="muted">尚未進入此階段</p>
        <template v-else>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="field-label" for="closure-reason">結案原因 <span class="required">*</span></label>
              <select id="closure-reason" v-model="draft.closure.reason" :disabled="readonly">
                <option value="">請選擇</option>
                <option v-for="o in CLOSURE_REASON_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
              </select>
            </div>
            <div v-if="caseItem.closure.closedAt" class="col-md-6">
              <p class="field-label">結案日期</p>
              <p>{{ caseItem.closure.closedAt }}</p>
            </div>
            <div class="col-12">
              <label class="field-label" for="closure-note">結案說明</label>
              <textarea id="closure-note" v-model="draft.closure.note" rows="2" :disabled="readonly"></textarea>
            </div>
            <div class="col-12">
              <label class="check-label">
                <input v-model="draft.closure.returnedToMedical" type="checkbox" :disabled="readonly" />
                已轉回醫療端執行結案評估
              </label>
              <label class="check-label strong">
                <input v-model="draft.closure.reentryExplained" type="checkbox" :disabled="readonly" />
                已向民眾說明再入口機制（日後有需要可再回來找我們） <span class="required">*</span>
              </label>
            </div>
          </div>
          <div v-if="!readonly" class="stage-actions">
            <button type="button" class="outline-btn" @click="saveSection(5)">儲存</button>
            <button type="button" class="primary-btn dark" @click="submitClose">結案</button>
          </div>
          <ul v-if="advanceErrors[5]" class="error-list" role="alert">
            <li v-for="r in advanceErrors[5]" :key="r">{{ r }}</li>
          </ul>
        </template>
      </section>

      <!-- 歷程 -->
      <section class="card">
        <h2 class="section-title">歷程紀錄</h2>
        <ol class="history-list">
          <li v-for="(item, i) in historyNewestFirst" :key="i">
            <span class="history-date">{{ item.date }}</span>
            <span class="history-stage">{{ stageLabel(item.stage) }}</span>
            <span class="history-note">{{ item.note }}</span>
            <span v-if="item.actor" class="history-actor">{{ item.actor }}</span>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChipSelect from "../components/ChipSelect.vue";
import {
  ATTENDANCE_OPTIONS,
  CLOSURE_REASON_OPTIONS,
  IMPACT_OPTIONS,
  LINKAGE_STATUS_OPTIONS,
  PARTICIPATION_OPTIONS,
  REFERRER_TYPE_OPTIONS,
  STAGE_OPTIONS,
  caseLabel,
  stageLabel,
  stageShort,
} from "../config/caseLabels.js";
import { NEED_TAGS, getNeedTagLabel } from "../config/needTags.js";
import { VISIBILITY_REASON_LABELS } from "../config/resourceOptions.js";
import {
  addLinkage,
  advanceStage,
  closeCase,
  getCaseById,
  getFollowUpStatus,
  getNextFollowUp,
  isFirstContactOverdue,
  isFollowUpDue,
  recordFirstContact,
  recordFollowUp,
  returnToConsultation,
  updateCase,
  updateLinkageStatus,
} from "../services/caseService.js";
import { ESCORT_NOTICE, getLinkedResourceStatus, getReferralOptions } from "../services/referral.js";
import { getAllResources } from "../services/resourceService.js";
import { getCurrentUser } from "../utils/auth.js";
import { deepClone } from "../utils/clone.js";
import { formatDateTime, toDateString, todayString } from "../utils/date.js";
import { maskNationalId } from "../utils/nationalId.js";
import { goBack } from "../utils/navigation.js";
import { formatDateTime as formatDisplayTime, formatRegion } from "../utils/resourceFormat.js";

const route = useRoute();
const router = useRouter();
const back = () => goBack(router, "/cases");

const STEPS = STAGE_OPTIONS;
const FOLLOW_UP_STATUS_LABELS = { done: "已完成", due: "已到期", upcoming: "未到期", unscheduled: "未排程" };
const needTagOptions = NEED_TAGS.filter((t) => t.code !== "other");
const actor = () => getCurrentUser()?.name ?? "";

const caseItem = ref(null);
const resources = ref([]);
const notice = ref("");
const advanceErrors = ref({});

// ── 草稿（各階段表單）──
// datetime-local 需要 YYYY-MM-DDTHH:mm；儲存時轉回含時區的時間
const toLocalInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : formatDateTime(d).slice(0, 16);
};
const fromLocalInput = (value) => (value ? formatDateTime(new Date(value)) : null);

const draft = reactive({
  person: {},
  managerName: "",
  referral: {},
  consultation: { goals: [], needTags: [] },
  firstContactLocal: "",
  closure: {},
});
const linkForm = reactive({ resourceId: "", reason: "" });
const reportForm = reactive({ status: "", attendance: "", providerNote: "" });
const followForm = reactive({ round: null, doneAt: "", attendance: "", participation: "", impact: "", note: "" });

const fillDraft = (c) => {
  const copy = deepClone(c);
  draft.person = copy.person;
  draft.managerName = copy.managerName;
  draft.referral = copy.referral;
  draft.consultation = copy.consultation;
  draft.firstContactLocal = toLocalInput(copy.consultation.firstContactAt);
  draft.closure = copy.closure;
};

const load = (id) => {
  caseItem.value = getCaseById(id);
  resources.value = getAllResources();
  if (caseItem.value) fillDraft(caseItem.value);
};

watch(
  () => route.params.id,
  (id) => {
    notice.value = "";
    advanceErrors.value = {};
    load(id);
  },
  { immediate: true }
);

// 寫入後重新載入；各表單的草稿以儲存後的資料為準
const refresh = (message) => {
  load(caseItem.value.id);
  if (message) notice.value = message;
};

// ── 階段狀態 ──
const ORDER = STAGE_OPTIONS.map((o) => o.code);
const stageIndex = (stage) => ORDER.indexOf(stage);
const readonly = computed(() => caseItem.value?.stage === "closed");
const fromAssessment = computed(() => !!caseItem.value?.referral.assessmentId);

const stageState = (stage) => {
  const current = stageIndex(caseItem.value.stage);
  const target = stageIndex(stage);
  if (target < current) return "done";
  if (target === current) return "current";
  return "future";
};
const stageStateLabel = (stage) => ({ done: "已完成", current: "目前階段", future: "尚未進入" })[stageState(stage)];

// ── 提醒 ──
const latestLinkage = computed(() => caseItem.value?.linkages.at(-1) ?? null);
const latestResource = computed(() =>
  latestLinkage.value ? getLinkedResourceStatus(latestLinkage.value.resourceId, resources.value) : null
);
const reasonLabels = (codes = []) => codes.map((c) => VISIBILITY_REASON_LABELS[c] ?? c).join("、");
const followUpStatus = (f) => getFollowUpStatus(f);

const alerts = computed(() => {
  const c = caseItem.value;
  if (!c || c.stage === "closed") return [];
  const list = [];
  if (isFirstContactOverdue(c)) {
    list.push({ level: "danger", icon: "fa-solid fa-phone-slash", text: "開案已超過 72 小時，尚未首次聯繫" });
  }
  const next = getNextFollowUp(c);
  if (next && isFollowUpDue(c)) {
    list.push({
      level: "warning",
      icon: "fa-solid fa-calendar-check",
      text: `${next.round} 個月追蹤已到期（排程 ${next.plannedAt}）`,
    });
  }
  const latest = latestLinkage.value;
  if (latest && latest.status !== "failed" && latestResource.value && !latestResource.value.available) {
    list.push({
      level: "danger",
      icon: "fa-solid fa-triangle-exclamation",
      text: latestResource.value.deleted
        ? "連結的資源已被刪除，請重新選擇資源"
        : `連結的資源目前${reasonLabels(latestResource.value.reasons)}，請重新選擇資源`,
    });
  }
  if (latest?.status === "pending" && latestResource.value?.available) {
    list.push({ level: "info", icon: "fa-solid fa-hourglass-half", text: `等待「${latest.resourceName}」回報連結結果` });
  }
  return list;
});

// ── 儲存與推進 ──
const sectionPatch = (stage) => {
  if (stage === 1) return { person: draft.person, managerName: draft.managerName, referral: draft.referral };
  if (stage === 2) {
    return {
      consultation: {
        ...draft.consultation,
        firstContactAt: fromLocalInput(draft.firstContactLocal),
        goals: draft.consultation.goals.map((g) => String(g).trim()).filter(Boolean),
      },
    };
  }
  if (stage === 5) return { closure: draft.closure };
  return {};
};

const saveSection = (stage, { silent = false } = {}) => {
  updateCase(caseItem.value.id, deepClone(sectionPatch(stage)));
  refresh(silent ? "" : "已儲存");
};

// 勾選同意時記錄同意時間，取消勾選則清除
const onConsentChange = () => {
  draft.referral.consentAt = draft.referral.consent ? formatDateTime(new Date()) : null;
};

// 「下一步」：先儲存本階段，再用 caseService 的推進檢查；不符合條件時列出原因
const advance = (stage) => {
  advanceErrors.value = {};
  saveSection(stage, { silent: true });
  const result = advanceStage(caseItem.value.id, { actor: actor() });
  if (!result.ok) {
    advanceErrors.value = { [stage]: result.reasons };
    return;
  }
  refresh(`已進入「${stageLabel(result.case.stage)}」階段`);
};

const contactNow = () => {
  saveSection(2, { silent: true });
  recordFirstContact(caseItem.value.id, { actor: actor() });
  refresh("已記錄首次聯繫");
};

// ── 連結 ──
const referralOptions = computed(() => getReferralOptions(resources.value));

// 第 3 階段可新增連結：尚無連結、最新一筆失敗，或最新一筆的資源已無法轉介（暫停、終止、刪除）
const canAddLinkage = computed(() => {
  if (readonly.value || caseItem.value.stage !== 3) return false;
  const latest = latestLinkage.value;
  return !latest || latest.status === "failed" || (latest.status === "pending" && !latestResource.value?.available);
});

const submitLinkage = () => {
  // 原連結的資源已無法轉介：先記錄為失敗，保留這次嘗試
  if (latestLinkage.value?.status === "pending") {
    updateLinkageStatus(
      caseItem.value.id,
      { status: "failed", providerNote: "資源無法提供服務，改連結其他資源" },
      { actor: actor() }
    );
  }
  const resource = resources.value.find((r) => r.id === linkForm.resourceId);
  addLinkage(caseItem.value.id, { resourceId: linkForm.resourceId, reason: linkForm.reason }, { actor: actor() });
  linkForm.resourceId = "";
  linkForm.reason = "";
  refresh(`已連結「${resource?.name ?? ""}」，並排定 1、3、6 個月追蹤`);
};

// 連結失敗時詢問是否退回第 2 階段（不自動退回）
const submitReport = () => {
  const result = updateLinkageStatus(
    caseItem.value.id,
    { status: reportForm.status, attendance: reportForm.attendance || null, providerNote: reportForm.providerNote },
    { actor: actor() }
  );
  Object.assign(reportForm, { status: "", attendance: "", providerNote: "" });
  refresh("已記錄連結結果");
  if (
    result?.suggestReturnToConsultation &&
    confirm("連結失敗，是否退回第 2 階段重新評估？\n\n選「取消」則留在連結階段，可以直接重新選擇資源。")
  ) {
    returnToConsultation(caseItem.value.id, { actor: actor(), note: "連結失敗，退回諮詢重新評估" });
    refresh("已退回「諮詢」階段");
  }
};

const confirmReturn = (note) => {
  if (!confirm("確定要退回第 2 階段重新評估嗎？")) return;
  returnToConsultation(caseItem.value.id, { actor: actor(), note });
  refresh("已退回「諮詢」階段");
};

// ── 追蹤 ──
// 只有第 4 階段（連結成功、進入追蹤後）才能填寫追蹤；第 3 階段只顯示排程
const canRecordFollowUp = computed(() => !readonly.value && caseItem.value.stage === 4);

const openFollowForm = (f) => {
  Object.assign(followForm, {
    round: f.round,
    doneAt: todayString(),
    attendance: "",
    participation: "",
    impact: "",
    note: "",
  });
};
const closeFollowForm = () => {
  followForm.round = null;
};

// 影響為惡化時詢問是否退回第 2 階段（不自動退回）
const submitFollowUp = () => {
  const { round, ...entry } = followForm;
  const result = recordFollowUp(caseItem.value.id, round, { ...entry }, { actor: actor() });
  closeFollowForm();
  refresh(`已記錄 ${round} 個月追蹤`);
  if (result?.suggestReturnToConsultation && confirm("追蹤結果為「惡化」，是否退回第 2 階段重新評估？")) {
    returnToConsultation(caseItem.value.id, { actor: actor(), note: "追蹤惡化，退回諮詢重新評估" });
    refresh("已退回「諮詢」階段");
  }
};

// ── 結案 ──
const submitClose = () => {
  advanceErrors.value = {};
  const result = closeCase(caseItem.value.id, deepClone(draft.closure), { actor: actor() });
  if (!result.ok) {
    advanceErrors.value = { 5: result.reasons };
    return;
  }
  refresh("已結案");
};

const historyNewestFirst = computed(() => [...(caseItem.value?.history || [])].reverse());
</script>

<style scoped>
.case-detail-page {
  background: #fcfaf8;
  min-height: 100vh;
  padding-bottom: 60px;
  color: #3e2723;
}

/* Top Bar */
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
  font-size: 18px;
  margin: 0;
  font-weight: 700;
}
.back-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.main-content {
  max-width: 960px;
  padding-top: 20px;
}
.card {
  background: #fff;
  border: 1px solid #f0e6e0;
  border-radius: 16px;
  padding: 20px 22px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.05);
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #8d6e63;
  display: grid;
  gap: 14px;
  justify-items: center;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

/* 基本資料 */
.summary-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.case-code {
  font-family: "Courier New", monospace;
  font-size: 13px;
  font-weight: 700;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 8px;
}
.person-name {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 6px;
}
.person-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0 0 14px;
  font-size: 14px;
  color: #8d6e63;
}
.stage-badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  color: #fff;
  font-weight: 600;
  background: #9e9e9e;
}
.stage-2 {
  background: #78909c;
}
.stage-3 {
  background: #c2956e;
}
.stage-4 {
  background: #6f8c72;
}
.stage-5 {
  background: #5d4037;
}
.stage-closed {
  background: #bdbdbd;
}
.demo-badge {
  font-size: 11px;
  font-weight: 700;
  color: #6d4c41;
  border: 1px dashed #a1887f;
  border-radius: 999px;
  padding: 1px 8px;
}

/* 階段進度 */
.stepper {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 4px;
}
.stepper li {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 4px;
  border-radius: 6px;
  background: #f5f0ed;
  color: #a1887f;
}
.stepper li.done {
  background: #efe7dc;
  color: #6d4c41;
}
.stepper li.current {
  background: #5d4037;
  color: #fff;
}

.alert-list {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: grid;
  gap: 6px;
}
.alert {
  font-size: 14px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
}
.alert.danger {
  background: #fdecea;
  color: #b71c1c;
}
.alert.warning {
  background: #fff3e0;
  color: #bf360c;
}
.alert.info {
  background: #f5f0ed;
  color: #5d4037;
}
.notice {
  background: #edf7ee;
  border: 1px solid #b7dfb9;
  color: #1b5e20;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 600;
}

/* 階段卡片 */
.stage-card.current {
  border-color: #c2956e;
  box-shadow: 0 0 0 2px rgba(194, 149, 110, 0.25);
}
.stage-card.future {
  background: #faf8f6;
}
.stage-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.stage-head h2,
.section-title {
  font-size: 18px;
  font-weight: 800;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-title {
  margin-bottom: 12px;
}
.step-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #5d4037;
  color: #fff;
  font-size: 14px;
}
.stage-card.future .step-no {
  background: #bcaaa4;
}
.stage-state {
  font-size: 12px;
  font-weight: 700;
  color: #8d6e63;
}
.stage-card.current .stage-state {
  color: #b98158;
}

.field-label {
  display: block;
  font-weight: 700;
  font-size: 14px;
  margin: 0 0 6px;
}
.field-label.small {
  font-size: 12px;
}
.required {
  color: #d32f2f;
}
input[type="text"],
input[type="tel"],
input[type="date"],
input[type="datetime-local"],
textarea,
select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  background: #fdfbf9;
  font-size: 15px;
}
input:disabled,
textarea:disabled,
select:disabled {
  background: #f5f2ef;
  color: #6d4c41;
}
input[type="checkbox"],
input[type="radio"] {
  accent-color: #5d4037;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  margin: 4px 0;
}
.check-label.strong {
  font-weight: 700;
}
.inline-field {
  display: flex;
  gap: 8px;
}
.hint {
  font-size: 13px;
  color: #8d6e63;
  margin: 6px 0 0;
}
.muted {
  color: #a1887f;
  font-size: 14px;
  margin: 0;
}
.assessment-link {
  margin: 0;
  padding: 10px 12px;
  background: #fdf8f4;
  border-radius: 8px;
  font-size: 14px;
}
.assessment-link a {
  font-weight: 700;
  color: #b98158;
}

/* 目標 */
.goal-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.goal-no {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #efe7dc;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid #e0d5cb;
  border-radius: 8px;
  background: #fff;
  color: #8d6e63;
}

/* 連結 */
.linkage-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
  display: grid;
  gap: 8px;
}
.linkage-card {
  border: 1px solid #efe7dc;
  border-left: 4px solid #bcaaa4;
  border-radius: 10px;
  padding: 10px 14px;
}
.linkage-card.success {
  border-left-color: #2e7d32;
}
.linkage-card.failed {
  border-left-color: #c62828;
  background: #fafafa;
}
.linkage-card.pending {
  border-left-color: #f9a825;
}
.linkage-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.linkage-no {
  font-size: 12px;
  color: #8d6e63;
}
.linkage-name {
  font-weight: 700;
  color: #3e2723;
}
.linkage-meta,
.linkage-text {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6d4c41;
}
.status-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 1px 8px;
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
.warning-text {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: #b71c1c;
}
.failed-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  background: #fdecea;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #b71c1c;
}
.failed-panel p {
  margin: 0;
  flex: 1;
  min-width: 220px;
}
.sub-panel {
  border: 1px dashed #d6ccc2;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 12px;
}
.sub-title {
  font-weight: 700;
  margin: 0 0 8px;
}
.sub-title small {
  font-weight: 400;
  color: #8d6e63;
}
.resource-options {
  display: grid;
  gap: 8px;
  margin: 8px 0 10px;
}
.resource-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
}
.resource-option.selected {
  border-color: #5d4037;
  background: #f5ede6;
}
.resource-option input {
  margin-top: 3px;
}
.resource-option strong,
.resource-option small,
.resource-option em {
  display: block;
}
.resource-option small {
  font-size: 12px;
  color: #8d6e63;
}
.resource-option .tags {
  color: #b98158;
}
.escort-note {
  font-style: normal;
  font-size: 13px;
  font-weight: 600;
  color: #8a5a00;
  margin-top: 4px;
}

/* 追蹤 */
.follow-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.follow-table th {
  text-align: left;
  font-size: 12px;
  color: #8d6e63;
  padding: 6px 8px;
  border-bottom: 2px solid #efe7dc;
}
.follow-table td {
  padding: 8px;
  border-bottom: 1px solid #f3ece6;
  vertical-align: top;
}
.fu-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.fu-badge.done {
  background: #edf7ee;
  color: #1b5e20;
}
.fu-badge.due {
  background: #fff3e0;
  color: #bf360c;
}
.fu-badge.upcoming,
.fu-badge.unscheduled {
  background: #f5f0ed;
  color: #8d6e63;
}
.fu-result small {
  display: block;
  color: #8d6e63;
}
.impact.worse {
  color: #c62828;
}
.impact.improved {
  color: #2e7d32;
}
.follow-note {
  margin: 0 0 10px;
  padding: 8px 12px;
  background: #f5f0ed;
  border-radius: 8px;
}
.follow-form-row td {
  background: #fdf8f4;
}
.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 按鈕 */
.stage-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.primary-btn {
  background: #2e7d32;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 700;
}
.primary-btn.dark {
  background: #5d4037;
}
.primary-btn:disabled {
  background: #c8c1bb;
}
.outline-btn {
  background: #fff;
  color: #5d4037;
  border: 1px solid #d6ccc2;
  border-radius: 10px;
  padding: 9px 18px;
  font-size: 14px;
  font-weight: 600;
}
.outline-btn.full {
  width: 100%;
}
.outline-btn.small,
.primary-btn.small {
  padding: 5px 12px;
  font-size: 13px;
}
.text-btn {
  background: none;
  border: none;
  color: #b98158;
  font-weight: 600;
  padding: 4px 0;
}
.error-list {
  margin: 10px 0 0;
  padding: 10px 14px 10px 30px;
  background: #fdecea;
  border-radius: 8px;
  color: #b71c1c;
  font-size: 14px;
}

/* 歷程 */
.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 14px;
}
.history-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding: 8px 0;
  border-bottom: 1px dashed #efe7dc;
}
.history-date {
  font-family: "Courier New", monospace;
  color: #8d6e63;
}
.history-stage {
  font-size: 12px;
  font-weight: 700;
  background: #f5f0ed;
  border-radius: 4px;
  padding: 1px 6px;
}
.history-note {
  flex: 1;
  min-width: 200px;
}
.history-actor {
  font-size: 12px;
  color: #a1887f;
}

@media (max-width: 576px) {
  .stepper li {
    font-size: 11px;
    padding: 6px 2px;
  }
  .follow-table thead {
    display: none;
  }
  .follow-table td {
    display: block;
    border: none;
    padding: 2px 4px;
  }
  .follow-table tr {
    display: block;
    border-bottom: 1px solid #efe7dc;
    padding: 6px 0;
  }
}
</style>
