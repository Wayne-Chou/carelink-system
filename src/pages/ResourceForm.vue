<template>
  <div class="surveyor-page">
    <div class="top-bar">
      <div class="header-left">
        <button class="back-btn" @click="back">← 返回</button>
      </div>
      <div class="header-center">
        <h2>{{ isEdit ? "編輯社區資源" : "新增社區資源" }}</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="container main-content">
      <div v-if="notFound" class="form-card not-found">
        <i class="fa-regular fa-folder-open" aria-hidden="true"></i>
        <p>找不到要編輯的資源，可能已被刪除。</p>
        <button type="button" class="btn-outline" @click="$router.push('/list')">返回清單</button>
      </div>

      <form v-else class="form-card" novalidate @submit.prevent="submitForm">
        <p v-if="isEdit" class="edit-banner">
          <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          正在編輯「{{ original.name || "未命名資源" }}」，最後修改：{{ formatDateTime(original.updatedAt) || "無紀錄" }}
        </p>
        <div v-if="errorCount" class="error-summary" role="alert">
          <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
          還有 {{ errorCount }} 個欄位需要修正
          <button type="button" class="btn-link" @click="scrollToFirstError">前往第一個</button>
        </div>

        <!-- 一、管理欄位 -->
        <section class="form-section">
          <header class="section-header">
            <h3 class="section-title">
              一、管理欄位 <span class="badge-backend">僅後台</span>
            </h3>
            <p class="section-desc">資源的身分、驗證與營運狀態，民眾端不顯示驗證資訊</p>
          </header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label>驗證者類型 <FieldMark /></label>
                <select v-model="form.verifiedBy.type" :class="{ invalid: err('verifiedBy.type') }">
                  <option value="" disabled>請選擇</option>
                  <option v-for="o in VERIFIER_TYPES" :key="o.code" :value="o.code">{{ o.label }}</option>
                </select>
                <p v-if="err('verifiedBy.type')" class="field-error">{{ err("verifiedBy.type") }}</p>
              </div>
              <div class="col-md-6">
                <label>驗證者姓名 <FieldMark /></label>
                <input
                  v-model.trim="form.verifiedBy.name"
                  type="text"
                  placeholder="實際確認資料的人"
                  :class="{ invalid: err('verifiedBy.name') }"
                />
                <p v-if="err('verifiedBy.name')" class="field-error">{{ err("verifiedBy.name") }}</p>
              </div>
              <div class="col-md-6">
                <label>最後驗證日期 <FieldMark /></label>
                <input
                  v-model="form.lastVerifiedAt"
                  type="date"
                  :class="{ invalid: err('lastVerifiedAt') }"
                />
                <p v-if="err('lastVerifiedAt')" class="field-error">{{ err("lastVerifiedAt") }}</p>
              </div>
              <div class="col-md-6">
                <label>預計驗證日期 <FieldMark /></label>
                <input
                  :value="form.nextVerifyAt"
                  type="date"
                  :class="{ invalid: err('nextVerifyAt') }"
                  @input="onNextVerifyInput"
                />
                <p v-if="err('nextVerifyAt')" class="field-error">{{ err("nextVerifyAt") }}</p>
                <p v-else class="hint">
                  <template v-if="nextVerifyManual">
                    已手動調整
                    <button type="button" class="btn-link" @click="resetNextVerify">改回自動計算</button>
                  </template>
                  <template v-else>依最後驗證日期與風險等級自動計算</template>
                </p>
              </div>
              <div class="col-md-6">
                <label>資源狀態 <FieldMark /></label>
                <select v-model="form.status" :class="{ invalid: err('status') }">
                  <option v-for="o in STATUS_OPTIONS" :key="o.code" :value="o.code">{{ o.label }}</option>
                </select>
                <p v-if="err('status')" class="field-error">{{ err("status") }}</p>
              </div>
              <div class="col-md-6">
                <label for="resource-code">資源編碼</label>
                <input id="resource-code" :value="codeDisplay" type="text" readonly class="readonly" />
                <p class="hint">
                  {{ isEdit ? "系統產生，不可修改" : "儲存時由系統自動產生，依實際儲存順序可能不同" }}
                </p>
              </div>

              <template v-if="form.status === 'paused'">
                <div class="col-md-6">
                  <label>暫停原因 <FieldMark /></label>
                  <input
                    v-model.trim="form.pauseReason"
                    type="text"
                    :class="{ invalid: err('pauseReason') }"
                  />
                  <p v-if="err('pauseReason')" class="field-error">{{ err("pauseReason") }}</p>
                </div>
                <div class="col-md-6">
                  <label>預計恢復日期 <FieldMark /></label>
                  <input v-model="form.resumeAt" type="date" :class="{ invalid: err('resumeAt') }" />
                  <p v-if="err('resumeAt')" class="field-error">{{ err("resumeAt") }}</p>
                </div>
              </template>
              <div v-if="form.status === 'seasonal'" class="col-12">
                <label>季節週期說明 <FieldMark /></label>
                <input
                  v-model.trim="form.seasonalNote"
                  type="text"
                  placeholder="例：每年 7–8 月暫停"
                  :class="{ invalid: err('seasonalNote') }"
                />
                <p v-if="err('seasonalNote')" class="field-error">{{ err("seasonalNote") }}</p>
              </div>
            </div>
          </div>
        </section>

        <hr class="section-divider" />

        <!-- 二、資源內容 -->
        <section class="form-section">
          <header class="section-header">
            <h3 class="section-title">二、資源內容</h3>
            <p class="section-desc">民眾端主要看到的資訊</p>
          </header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label>資源名稱 <FieldMark required /></label>
                <input
                  v-model.trim="form.name"
                  type="text"
                  placeholder="服務或活動全名"
                  :class="{ invalid: err('name') }"
                />
                <p v-if="err('name')" class="field-error">{{ err("name") }}</p>
              </div>
              <div class="col-md-6">
                <label>所屬單位 <FieldMark /></label>
                <input
                  v-model.trim="form.organization"
                  type="text"
                  placeholder="機構或團體全名"
                  :class="{ invalid: err('organization') }"
                />
                <p v-if="err('organization')" class="field-error">{{ err("organization") }}</p>
              </div>
              <div class="col-12">
                <label>資源內容 <FieldMark /></label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  placeholder="何人、何時、何地、提供何種服務給何對象"
                  :class="{ invalid: err('description') }"
                ></textarea>
                <div class="field-meta">
                  <p v-if="err('description')" class="field-error">{{ err("description") }}</p>
                  <span :class="['counter', { over: descriptionLength > DESCRIPTION_MAX_LENGTH }]">
                    {{ descriptionLength }} / {{ DESCRIPTION_MAX_LENGTH }}
                  </span>
                </div>
              </div>

              <div class="col-12">
                <label>需求標籤 <FieldMark /></label>
                <div :class="['tag-groups', { invalid: err('needTags') }]">
                  <div v-for="group in tagGroups" :key="group.code" class="tag-group">
                    <p class="tag-group-title">{{ group.label }}</p>
                    <ChipSelect v-model="form.needTags" :options="group.tags" />
                  </div>
                </div>
                <p v-if="err('needTags')" class="field-error">{{ err("needTags") }}</p>
                <p class="hint">
                  處方類型（自動推得）：
                  <template v-if="derivedTypes.length">
                    <span v-for="t in derivedTypes" :key="t" class="derived-chip">
                      {{ getPrescriptionTypeLabel(t) }}
                    </span>
                  </template>
                  <span v-else>尚未選擇標籤</span>
                </p>
              </div>
              <div v-if="form.needTags.includes('other')" class="col-12">
                <label>其他標籤 <FieldMark /></label>
                <input
                  v-model.trim="form.needTagOther"
                  type="text"
                  :class="{ invalid: err('needTagOther') }"
                />
                <p v-if="err('needTagOther')" class="field-error">{{ err("needTagOther") }}</p>
              </div>

              <div class="col-12">
                <label>人力配置</label>
                <div v-for="(person, i) in form.staff" :key="i" class="staff-row">
                  <input v-model.trim="person.name" type="text" placeholder="姓名" />
                  <input v-model.trim="person.role" type="text" placeholder="角色，例：帶班老師" />
                  <input v-model.trim="person.license" type="text" placeholder="證照種類" />
                  <input v-model.trim="person.experience" type="text" placeholder="專業經驗" />
                  <button
                    type="button"
                    class="btn-icon"
                    :aria-label="`移除第 ${i + 1} 位人員`"
                    @click="removeStaff(i)"
                  >
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                  </button>
                </div>
                <button type="button" class="btn-outline" @click="addStaff">
                  <i class="fa-solid fa-plus" aria-hidden="true"></i> 新增人員
                </button>
              </div>

              <div class="col-md-6">
                <label>可容納人數 <FieldMark /></label>
                <select v-model="form.capacity.type" :class="{ invalid: err('capacity.type') }">
                  <option value="" disabled>請選擇</option>
                  <option v-for="o in CAPACITY_TYPES" :key="o.code" :value="o.code">{{ o.label }}</option>
                </select>
                <p v-if="err('capacity.type')" class="field-error">{{ err("capacity.type") }}</p>
              </div>
              <div v-if="form.capacity.type === 'limited'" class="col-md-6">
                <label>人數上限 <FieldMark /></label>
                <input
                  v-model.number="form.capacity.limit"
                  type="number"
                  min="1"
                  :class="{ invalid: err('capacity.limit') }"
                />
                <p v-if="err('capacity.limit')" class="field-error">{{ err("capacity.limit") }}</p>
              </div>

              <div class="col-md-6">
                <label>服務量能 <FieldMark /></label>
                <select
                  v-model="form.availability.type"
                  :class="{ invalid: err('availability.type') }"
                >
                  <option value="" disabled>請選擇</option>
                  <option v-for="o in AVAILABILITY_TYPES" :key="o.code" :value="o.code">
                    {{ o.label }}
                  </option>
                </select>
                <p v-if="err('availability.type')" class="field-error">
                  {{ err("availability.type") }}
                </p>
              </div>
              <div class="col-md-6">
                <label>可用名額</label>
                <input
                  v-model.number="form.availability.slots"
                  type="number"
                  min="0"
                  placeholder="選填"
                  :class="{ invalid: err('availability.slots') }"
                />
                <p v-if="err('availability.slots')" class="field-error">
                  {{ err("availability.slots") }}
                </p>
              </div>
              <div v-if="form.availability.type === 'full'" class="col-12">
                <label>下梯次</label>
                <input
                  v-model.trim="form.availability.nextBatch"
                  type="text"
                  placeholder="例：2027 年 1 月開放報名"
                />
              </div>

              <div class="col-12">
                <label>服務週期 <FieldMark /></label>
                <div class="cycle-selector">
                  <label
                    v-for="o in SCHEDULE_TYPES"
                    :key="o.code"
                    :class="{ active: form.schedule.type === o.code }"
                  >
                    <input
                      type="radio"
                      name="schedule-type"
                      :value="o.code"
                      :checked="form.schedule.type === o.code"
                      @change="changeScheduleType(o.code)"
                    />
                    {{ o.label }}
                  </label>
                </div>
              </div>

              <template v-if="form.schedule.type === 'regular'">
                <div class="col-md-6">
                  <label>頻率 <FieldMark /></label>
                  <select v-model="form.schedule.frequency">
                    <option v-for="o in FREQUENCY_OPTIONS" :key="o.code" :value="o.code">
                      {{ o.label }}
                    </option>
                  </select>
                </div>
                <div class="col-12">
                  <template v-if="form.schedule.frequency === 'weekly'">
                    <label>星期 <FieldMark /></label>
                    <ChipSelect
                      v-model="form.schedule.weekdays"
                      :options="WEEKDAYS"
                      :invalid="!!err('schedule.weekdays')"
                    />
                    <p v-if="err('schedule.weekdays')" class="field-error">
                      {{ err("schedule.weekdays") }}
                    </p>
                  </template>
                  <template v-else>
                    <label>每月日期 <FieldMark /></label>
                    <ChipSelect
                      v-model="form.schedule.monthDays"
                      :options="MONTH_DAYS"
                      :invalid="!!err('schedule.monthDays')"
                    />
                    <p v-if="err('schedule.monthDays')" class="field-error">
                      {{ err("schedule.monthDays") }}
                    </p>
                  </template>
                </div>
              </template>

              <template v-if="form.schedule.type === 'batch'">
                <div class="col-md-6">
                  <label>開始日期 <FieldMark /></label>
                  <input
                    v-model="form.schedule.startDate"
                    type="date"
                    :class="{ invalid: err('schedule.startDate') }"
                  />
                  <p v-if="err('schedule.startDate')" class="field-error">
                    {{ err("schedule.startDate") }}
                  </p>
                </div>
                <div class="col-md-6">
                  <label>結束日期 <FieldMark /></label>
                  <input
                    v-model="form.schedule.endDate"
                    type="date"
                    :class="{ invalid: err('schedule.endDate') }"
                  />
                  <p v-if="err('schedule.endDate')" class="field-error">
                    {{ err("schedule.endDate") }}
                  </p>
                </div>
                <div class="col-12">
                  <label>星期 <FieldMark /></label>
                  <ChipSelect
                    v-model="form.schedule.weekdays"
                    :options="WEEKDAYS"
                    :invalid="!!err('schedule.weekdays')"
                  />
                  <p v-if="err('schedule.weekdays')" class="field-error">
                    {{ err("schedule.weekdays") }}
                  </p>
                </div>
              </template>

              <div v-if="form.schedule.type === 'once'" class="col-md-6">
                <label>日期 <FieldMark /></label>
                <input
                  v-model="form.schedule.date"
                  type="date"
                  :class="{ invalid: err('schedule.date') }"
                />
                <p v-if="err('schedule.date')" class="field-error">{{ err("schedule.date") }}</p>
              </div>

              <div class="col-6 col-md-3">
                <label>開始時間 <FieldMark /></label>
                <input
                  v-model="form.schedule.startTime"
                  type="time"
                  :class="{ invalid: err('schedule.startTime') }"
                />
                <p v-if="err('schedule.startTime')" class="field-error">
                  {{ err("schedule.startTime") }}
                </p>
              </div>
              <div class="col-6 col-md-3">
                <label>結束時間 <FieldMark /></label>
                <input
                  v-model="form.schedule.endTime"
                  type="time"
                  :class="{ invalid: err('schedule.endTime') }"
                />
                <p v-if="err('schedule.endTime')" class="field-error">
                  {{ err("schedule.endTime") }}
                </p>
              </div>

              <div class="col-12">
                <label>地點名稱</label>
                <input v-model.trim="form.placeName" type="text" placeholder="例：XX 社區活動中心" />
              </div>
              <div class="col-md-4">
                <label>縣市 <FieldMark /></label>
                <select v-model="form.address.city" :class="{ invalid: err('address.city') }">
                  <option value="" disabled>請選擇縣市</option>
                  <option v-for="city in cityNames" :key="city" :value="city">{{ city }}</option>
                </select>
                <p v-if="err('address.city')" class="field-error">{{ err("address.city") }}</p>
              </div>
              <div class="col-md-4">
                <label>行政區 <FieldMark /></label>
                <select
                  v-model="form.address.district"
                  :disabled="!form.address.city"
                  :class="{ invalid: err('address.district') }"
                >
                  <option value="" disabled>
                    {{ form.address.city ? "請選擇行政區" : "請先選擇縣市" }}
                  </option>
                  <option v-for="d in districtOptions" :key="d.name" :value="d.name">
                    {{ d.name }}
                  </option>
                </select>
                <p v-if="err('address.district')" class="field-error">
                  {{ err("address.district") }}
                </p>
              </div>
              <div class="col-md-4">
                <label>郵遞區號 <FieldMark /></label>
                <input
                  v-model.trim="form.address.zip"
                  type="text"
                  inputmode="numeric"
                  placeholder="選擇行政區後自動帶入"
                  :class="{ invalid: err('address.zip') }"
                />
                <p v-if="err('address.zip')" class="field-error">{{ err("address.zip") }}</p>
              </div>
              <div class="col-12">
                <label>詳細地址 <FieldMark /></label>
                <input
                  v-model.trim="form.address.detail"
                  type="text"
                  placeholder="含路名、門牌、樓層"
                  :class="{ invalid: err('address.detail') }"
                />
                <p v-if="err('address.detail')" class="field-error">{{ err("address.detail") }}</p>
                <button type="button" class="btn-geo" @click="openMap">🗺️ 在地圖中確認地址</button>
              </div>
            </div>
          </div>
        </section>

        <hr class="section-divider" />

        <!-- 三、安全與風險評級 -->
        <section class="form-section">
          <header class="section-header">
            <h3 class="section-title">
              三、安全與風險評級 <span class="badge-backend">僅後台</span>
            </h3>
            <p class="section-desc">由驗證者填寫，整體等級依五項判斷條件自動計算</p>
          </header>
          <div class="section-body">
            <div class="row g-3">
              <div v-for="c in RISK_CRITERIA" :key="c.key" class="col-md-6">
                <label>{{ c.label }} <FieldMark /></label>
                <select
                  v-model="form.riskCriteria[c.key]"
                  :class="{ invalid: err(`riskCriteria.${c.key}`) }"
                >
                  <option value="" disabled>請選擇</option>
                  <option v-for="o in criteriaOptions(c.key)" :key="o.code" :value="o.code">
                    {{ RISK_ICON[o.code] }} {{ o.label }}
                  </option>
                </select>
                <p v-if="err(`riskCriteria.${c.key}`)" class="field-error">
                  {{ err(`riskCriteria.${c.key}`) }}
                </p>
              </div>

              <div class="col-12">
                <label>是否為高風險情境 <FieldMark /></label>
                <div class="cycle-selector">
                  <label :class="{ active: !form.highRisk.isHighRisk }">
                    <input v-model="form.highRisk.isHighRisk" type="radio" :value="false" />
                    否
                  </label>
                  <label :class="{ active: form.highRisk.isHighRisk }">
                    <input v-model="form.highRisk.isHighRisk" type="radio" :value="true" />
                    是
                  </label>
                </div>
              </div>
              <div v-if="form.highRisk.isHighRisk" class="col-12">
                <label>高風險類型 <FieldMark /></label>
                <ChipSelect
                  v-model="form.highRisk.types"
                  :options="HIGH_RISK_TYPES"
                  :invalid="!!err('highRisk.types')"
                />
                <p v-if="err('highRisk.types')" class="field-error">{{ err("highRisk.types") }}</p>
                <p v-if="highRiskForcesRed" class="warning-box">
                  <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                  高風險情境且人力配置中沒有人填寫證照，人員資格將自動設為紅燈，整體等級也會變為紅燈。
                </p>
              </div>

              <div class="col-12">
                <div :class="['risk-summary', effectiveRiskLevel || 'none']">
                  <template v-if="effectiveRiskLevel">
                    <strong>
                      整體風險：{{ RISK_ICON[effectiveRiskLevel] }}
                      {{ optionLabel(RISK_LEVEL_OPTIONS, effectiveRiskLevel) }}
                    </strong>
                    <span>{{ riskDescription(effectiveRiskLevel) }}</span>
                  </template>
                  <template v-else>
                    <strong>整體風險：尚未判定</strong>
                    <span>請填完五項判斷條件</span>
                  </template>
                </div>
              </div>
              <div v-if="isManualRisk" class="col-md-6">
                <label>整體風險等級 <FieldMark /></label>
                <select v-model="form.riskLevel" :class="{ invalid: err('riskLevel') }">
                  <option value="" disabled>請選擇</option>
                  <option v-for="o in RISK_LEVEL_OPTIONS" :key="o.code" :value="o.code">
                    {{ RISK_ICON[o.code] }} {{ o.label }}
                  </option>
                </select>
                <p v-if="err('riskLevel')" class="field-error">{{ err("riskLevel") }}</p>
              </div>
              <div class="col-12">
                <label>風險調整說明 <FieldMark v-if="riskChanged" required /></label>
                <p v-if="riskChanged" class="hint risk-change-hint">
                  風險等級由 {{ RISK_ICON[original.riskLevel] }}
                  {{ optionLabel(RISK_LEVEL_OPTIONS, original.riskLevel) }} 變更為
                  {{ RISK_ICON[effectiveRiskLevel] || "" }}
                  {{ optionLabel(RISK_LEVEL_OPTIONS, effectiveRiskLevel) || "未評估" }}，請填寫本次調整原因
                  <template v-if="original.riskChangeNote">
                    <br />上一次說明：{{ original.riskChangeNote }}
                  </template>
                </p>
                <textarea
                  v-model.trim="form.riskChangeNote"
                  rows="2"
                  :placeholder="riskChanged ? '例：補足公共意外險' : '選填，例：補足公共意外險'"
                  :class="{ invalid: err('riskChangeNote') }"
                ></textarea>
                <p v-if="err('riskChangeNote')" class="field-error">{{ err("riskChangeNote") }}</p>
              </div>
            </div>
          </div>
        </section>

        <hr class="section-divider" />

        <!-- 四、適用對象與可近性 -->
        <section class="form-section">
          <header class="section-header">
            <h3 class="section-title">四、適用對象與可近性</h3>
            <p class="section-desc">民眾端的篩選條件，也讓判讀人員確認民眾是否適合參加</p>
          </header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-12">
                <label>適合年齡 <FieldMark /></label>
                <ChipSelect
                  v-model="form.ageGroups"
                  :options="AGE_GROUPS"
                  exclusive="all"
                  :invalid="!!err('ageGroups')"
                />
                <p v-if="err('ageGroups')" class="field-error">{{ err("ageGroups") }}</p>
              </div>
              <div class="col-12">
                <label>適合身分 <FieldMark /></label>
                <ChipSelect
                  v-model="form.identities"
                  :options="IDENTITIES"
                  exclusive="all"
                  :invalid="!!err('identities')"
                />
                <p v-if="err('identities')" class="field-error">{{ err("identities") }}</p>
              </div>
              <div v-if="form.identities.includes('other')" class="col-12">
                <label>其他身分</label>
                <input v-model.trim="form.identityOther" type="text" />
              </div>
              <div class="col-12">
                <label>不適合對象</label>
                <input v-model.trim="form.notSuitableFor" type="text" placeholder="例：含堅果無法替換" />
              </div>

              <div class="col-md-6">
                <label>參與條件 <FieldMark /></label>
                <select v-model="form.participation" :class="{ invalid: err('participation') }">
                  <option value="" disabled>請選擇</option>
                  <option v-for="o in PARTICIPATION_OPTIONS" :key="o.code" :value="o.code">
                    {{ o.label }}
                  </option>
                </select>
                <p v-if="err('participation')" class="field-error">{{ err("participation") }}</p>
              </div>
              <div v-if="form.participation === 'other'" class="col-md-6">
                <label>其他參與條件</label>
                <input v-model.trim="form.participationOther" type="text" />
              </div>

              <div class="col-12">
                <label>語言 <FieldMark /></label>
                <ChipSelect
                  v-model="form.languages"
                  :options="LANGUAGES"
                  :invalid="!!err('languages')"
                />
                <p v-if="err('languages')" class="field-error">{{ err("languages") }}</p>
              </div>
              <div v-if="form.languages.includes('indigenous')" class="col-md-6">
                <label>原住民族別 <FieldMark /></label>
                <input
                  v-model.trim="form.indigenousTribe"
                  type="text"
                  :class="{ invalid: err('indigenousTribe') }"
                />
                <p v-if="err('indigenousTribe')" class="field-error">{{ err("indigenousTribe") }}</p>
              </div>
              <div v-if="form.languages.includes('other')" class="col-md-6">
                <label>其他語言</label>
                <input v-model.trim="form.languageOther" type="text" />
              </div>

              <div class="col-12">
                <label>交通可近性</label>
                <ChipSelect v-model="form.transport" :options="TRANSPORT_OPTIONS" />
              </div>
              <div v-if="form.transport.includes('public_transit')" class="col-md-4">
                <label>大眾運輸說明</label>
                <input
                  v-model.trim="form.transportNote.publicTransit"
                  type="text"
                  placeholder="例：捷運站步行 10 分鐘"
                />
              </div>
              <div v-if="form.transport.includes('shuttle')" class="col-md-4">
                <label>專車接駁說明</label>
                <input v-model.trim="form.transportNote.shuttle" type="text" />
              </div>
              <div v-if="form.transport.includes('other')" class="col-md-4">
                <label>其他交通說明</label>
                <input v-model.trim="form.transportNote.other" type="text" />
              </div>

              <div class="col-12">
                <label>無障礙與包容性</label>
                <ChipSelect v-model="form.accessibility" :options="ACCESSIBILITY_OPTIONS" />
              </div>
              <div v-if="form.accessibility.includes('other')" class="col-12">
                <label>其他包容性規劃</label>
                <input v-model.trim="form.accessibilityOther" type="text" />
              </div>

              <div class="col-md-6">
                <label>費用 <FieldMark /></label>
                <select v-model="form.fee.type" :class="{ invalid: err('fee.type') }">
                  <option value="" disabled>請選擇</option>
                  <option v-for="o in FEE_TYPES" :key="o.code" :value="o.code">{{ o.label }}</option>
                </select>
                <p v-if="err('fee.type')" class="field-error">{{ err("fee.type") }}</p>
              </div>
              <div v-if="form.fee.type === 'paid' || form.fee.type === 'subsidized'" class="col-md-6">
                <label>收費標準或補助資格 <FieldMark /></label>
                <input
                  v-model.trim="form.fee.detail"
                  type="text"
                  :class="{ invalid: err('fee.detail') }"
                />
                <p v-if="err('fee.detail')" class="field-error">{{ err("fee.detail") }}</p>
              </div>

              <div class="col-12">
                <label>參與須知</label>
                <textarea
                  v-model.trim="form.notice"
                  rows="2"
                  placeholder="例：穿運動服、帶健保卡"
                ></textarea>
              </div>
            </div>
          </div>
        </section>

        <hr class="section-divider" />

        <!-- 五、協作介面 -->
        <section class="form-section">
          <header class="section-header">
            <h3 class="section-title">五、協作介面</h3>
            <p class="section-desc">合作狀態會影響資源能否出現在探索頁與轉介選單</p>
          </header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label>合作狀態 <FieldMark /></label>
                <select v-model="form.partnership" :class="{ invalid: err('partnership') }">
                  <option v-for="o in PARTNERSHIP_OPTIONS" :key="o.code" :value="o.code">
                    {{ o.label }}
                  </option>
                </select>
                <p v-if="err('partnership')" class="field-error">{{ err("partnership") }}</p>
                <p v-else-if="form.partnership === 'unconfirmed'" class="hint">
                  尚未確認合作的資源不會出現在轉介選單{{ HIDE_UNCONFIRMED_IN_EXPLORE ? "與民眾探索頁" : "" }}
                </p>
              </div>

              <div class="col-12">
                <p class="sub-title">公眾聯絡人 <FieldMark /></p>
              </div>
              <div class="col-md-4">
                <label>姓名 <FieldMark /></label>
                <input
                  v-model.trim="form.publicContact.name"
                  type="text"
                  :class="{ invalid: err('publicContact.name') }"
                />
                <p v-if="err('publicContact.name')" class="field-error">
                  {{ err("publicContact.name") }}
                </p>
              </div>
              <div class="col-md-4">
                <label>電話</label>
                <input
                  v-model.trim="form.publicContact.phone"
                  type="tel"
                  :class="{ invalid: err('publicContact.phone') }"
                />
                <p v-if="err('publicContact.phone')" class="field-error">
                  {{ err("publicContact.phone") }}
                </p>
              </div>
              <div class="col-md-4">
                <label>Email 或 LINE</label>
                <input v-model.trim="form.publicContact.emailOrLine" type="text" />
              </div>

              <div class="col-12">
                <label class="checkbox-label">
                  <input v-model="form.adminContact.sameAsPublic" type="checkbox" />
                  行政聯絡人同公眾聯絡人
                </label>
              </div>
              <template v-if="!form.adminContact.sameAsPublic">
                <div class="col-12">
                  <p class="sub-title">
                    行政聯絡人 <FieldMark />
                    <span class="badge-backend">僅後台</span>
                  </p>
                </div>
                <div class="col-md-4">
                  <label>姓名 <FieldMark /></label>
                  <input
                    v-model.trim="form.adminContact.name"
                    type="text"
                    :class="{ invalid: err('adminContact.name') }"
                  />
                  <p v-if="err('adminContact.name')" class="field-error">
                    {{ err("adminContact.name") }}
                  </p>
                </div>
                <div class="col-md-4">
                  <label>電話</label>
                  <input
                    v-model.trim="form.adminContact.phone"
                    type="tel"
                    :class="{ invalid: err('adminContact.phone') }"
                  />
                  <p v-if="err('adminContact.phone')" class="field-error">
                    {{ err("adminContact.phone") }}
                  </p>
                </div>
                <div class="col-md-4">
                  <label>Email 或 LINE</label>
                  <input v-model.trim="form.adminContact.emailOrLine" type="text" />
                </div>
              </template>

              <div class="col-12">
                <label>追蹤方式 <FieldMark /></label>
                <ChipSelect
                  v-model="form.followUpMethods"
                  :options="FOLLOW_UP_METHODS"
                  :invalid="!!err('followUpMethods')"
                />
                <p v-if="err('followUpMethods')" class="field-error">{{ err("followUpMethods") }}</p>
              </div>
              <div v-if="form.followUpMethods.includes('other')" class="col-12">
                <label>其他追蹤方式</label>
                <input v-model.trim="form.followUpOther" type="text" />
              </div>

              <div class="col-12">
                <label>網站或社群連結</label>
                <textarea
                  v-model="linksText"
                  rows="2"
                  placeholder="官方網頁或粉絲專頁，一行一個"
                  :class="{ invalid: err('links') }"
                ></textarea>
                <p v-if="err('links')" class="field-error">{{ err("links") }}</p>
              </div>
            </div>
          </div>
        </section>

        <hr class="section-divider" />

        <!-- 六、AI 輔助欄位 -->
        <section class="form-section">
          <header class="section-header">
            <h3 class="section-title">六、AI 輔助欄位</h3>
            <p class="section-desc">原型階段用於關鍵字搜尋</p>
          </header>
          <div class="section-body">
            <div class="row g-3">
              <div class="col-12">
                <label>關鍵字（建議）</label>
                <input v-model="keywordsText" type="text" placeholder="以逗號或頓號分隔，例：運動、社交、長者" />
              </div>
              <div class="col-12">
                <label>對應生活情境（建議）</label>
                <textarea
                  v-model.trim="form.scenarios"
                  rows="3"
                  placeholder="例：適合平日白天想找人聊天的獨居者"
                ></textarea>
              </div>
            </div>
          </div>
        </section>

        <div class="form-footer">
          <button type="submit" class="btn-submit">{{ isEdit ? "儲存變更" : "完成並送出" }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChipSelect from "../components/ChipSelect.vue";
import FieldMark from "../components/FieldMark.vue";
import {
  PRESCRIPTION_TYPES,
  derivePrescriptionTypes,
  getNeedTagsByType,
  getPrescriptionTypeLabel,
} from "../config/needTags.js";
import { getCityNames, getDistricts, getZipCode } from "../config/districts.js";
import {
  ACCESSIBILITY_OPTIONS,
  AGE_GROUPS,
  AVAILABILITY_TYPES,
  CAPACITY_TYPES,
  FEE_TYPES,
  FOLLOW_UP_METHODS,
  FREQUENCY_OPTIONS,
  HIGH_RISK_TYPES,
  IDENTITIES,
  LANGUAGES,
  PARTICIPATION_OPTIONS,
  PARTNERSHIP_OPTIONS,
  RISK_CRITERIA,
  RISK_LEVEL_OPTIONS,
  SCHEDULE_TYPES,
  STATUS_OPTIONS,
  TRANSPORT_OPTIONS,
  VERIFIER_TYPES,
  WEEKDAYS,
  optionLabel,
} from "../config/resourceOptions.js";
import {
  HIDE_UNCONFIRMED_IN_EXPLORE,
  OVERALL_RISK_STRATEGY,
  STAFF_QUALIFICATION_ALLOW_YELLOW,
  applyHighRiskRule,
  computeOverallRisk,
} from "../config/resourceRules.js";
import {
  calcNextVerifyAt,
  createEmptyResource,
  createEmptySchedule,
  createResource,
  getNextResourceCode,
  getResourceById,
  updateResource,
} from "../services/resourceService.js";
import { DESCRIPTION_MAX_LENGTH, validateResource } from "../services/resourceValidation.js";
import { setFlash } from "../utils/flash.js";
import { goBack } from "../utils/navigation.js";
import { formatDateTime } from "../utils/resourceFormat.js";

const route = useRoute();
const router = useRouter();

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// /form/:id 為編輯模式；original 是修改前的資料，用於比對風險等級變更
const isEdit = !!route.params.id;
const original = isEdit ? getResourceById(route.params.id) : null;
const notFound = isEdit && !original;

const initialForm = () => {
  if (!original) return { ...createEmptyResource(), lastVerifiedAt: todayString() };
  const data = structuredClone(original);
  data.staff = data.staff.map((s) => ({ name: "", role: "", license: "", experience: "", ...s }));
  return data;
};

const form = reactive(initialForm());

// 資源編碼：新增時預覽下一個編號，編輯時顯示既有編號（舊資料沒有編號時於儲存時補上）
const codeDisplay = isEdit
  ? original?.code || "儲存時自動補上"
  : `${getNextResourceCode()}（預計）`;
const keywordsText = ref(original ? original.keywords.join("、") : "");
const linksText = ref(original ? original.links.join("\n") : "");
const errors = ref({});
const submitted = ref(false);
const nextVerifyManual = ref(false);

const RISK_ICON = { green: "🟢", yellow: "🟡", red: "🔴" };
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({ code: i + 1, label: `${i + 1} 日` }));
const cityNames = getCityNames();
const isManualRisk = OVERALL_RISK_STRATEGY !== "worst";

const tagGroups = PRESCRIPTION_TYPES.map((t) => ({ ...t, tags: getNeedTagsByType(t.code) })).filter(
  (g) => g.tags.length
);

const err = (path) => errors.value[path];
const errorCount = computed(() => Object.keys(errors.value).length);
const descriptionLength = computed(() => [...(form.description || "")].length);
const derivedTypes = computed(() => derivePrescriptionTypes(form.needTags));
const districtOptions = computed(() => getDistricts(form.address.city));

// ── 地址連動 ──
watch(
  () => form.address.city,
  () => {
    if (!districtOptions.value.some((d) => d.name === form.address.district)) {
      form.address.district = "";
      form.address.zip = "";
    }
  }
);
watch(
  () => form.address.district,
  (district) => {
    const zip = getZipCode(form.address.city, district);
    if (zip) form.address.zip = zip;
  }
);

const changeScheduleType = (type) => {
  if (form.schedule.type !== type) form.schedule = createEmptySchedule(type);
};

// ── 人力配置 ──
const addStaff = () => form.staff.push({ name: "", role: "", license: "", experience: "" });
const removeStaff = (index) => form.staff.splice(index, 1);

// ── 風險 ──
const criteriaOptions = (key) =>
  key === "staffQualification" && !STAFF_QUALIFICATION_ALLOW_YELLOW
    ? RISK_LEVEL_OPTIONS.filter((o) => o.code !== "yellow")
    : RISK_LEVEL_OPTIONS;

const riskDescription = (code) => RISK_LEVEL_OPTIONS.find((o) => o.code === code)?.description ?? "";

const highRiskForcesRed = computed(
  () => form.highRisk.isHighRisk && !form.staff.some((s) => String(s.license ?? "").trim())
);

// 與儲存時相同的規則：先套高風險檢核，再取最差一項；設定為人工判定時沿用手選值
const effectiveRiskLevel = computed(
  () => computeOverallRisk(applyHighRiskRule(form).riskCriteria) ?? form.riskLevel ?? ""
);

// ── 預計驗證日期：自動計算，可手動調整 ──
// 編輯時保留原本的日期，直到最後驗證日期或風險等級有變動才重新計算
const recalcNextVerify = () => {
  form.nextVerifyAt = calcNextVerifyAt({
    lastVerifiedAt: form.lastVerifiedAt,
    riskLevel: effectiveRiskLevel.value,
    createdAt: form.createdAt,
  });
};
watch(
  [() => form.lastVerifiedAt, effectiveRiskLevel],
  () => {
    if (!nextVerifyManual.value) recalcNextVerify();
  },
  { immediate: !isEdit || !form.nextVerifyAt }
);

// ── 風險等級變更（僅編輯）──
// 原本沒有風險等級（首次評估）不算變更
const riskChanged = computed(
  () => !!original?.riskLevel && effectiveRiskLevel.value !== original.riskLevel
);
// 等級變更時清空沿用的舊說明，讓填表人寫本次原因（舊說明顯示在提示中）；改回原等級時還原
watch(riskChanged, (changed) => {
  const previous = original?.riskChangeNote ?? null;
  if (changed && (form.riskChangeNote ?? null) === previous) form.riskChangeNote = null;
  if (!changed && !form.riskChangeNote) form.riskChangeNote = previous;
});
const onNextVerifyInput = (event) => {
  form.nextVerifyAt = event.target.value;
  nextVerifyManual.value = true;
};
const resetNextVerify = () => {
  nextVerifyManual.value = false;
  recalcNextVerify();
};

// ── 地圖 ──
const fullAddress = computed(
  () => `${form.address.city}${form.address.district}${form.address.detail}`
);

const openMap = () => {
  if (!form.address.detail) {
    alert("請先輸入詳細地址");
    return;
  }
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress.value)}`,
    "_blank",
    "noopener"
  );
};

// ── 送出 ──
const toNumberOrNull = (v) => (v === "" || v === null || !Number.isFinite(Number(v)) ? null : Number(v));
const textOrNull = (v) => (String(v ?? "").trim() ? String(v).trim() : null);

// 轉成儲存用資料：清掉不適用的條件欄位，避免殘留舊值
const buildPayload = () => {
  const data = JSON.parse(JSON.stringify(form));
  const has = (list, code) => list.includes(code);

  data.riskLevel = effectiveRiskLevel.value;
  data.keywords = keywordsText.value
    .split(/[,，、\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  data.links = linksText.value
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (data.status !== "paused") {
    data.pauseReason = null;
    data.resumeAt = null;
  }
  if (data.status !== "seasonal") data.seasonalNote = null;
  if (!has(data.needTags, "other")) data.needTagOther = null;

  data.staff = data.staff.filter((s) => Object.values(s).some((v) => String(v ?? "").trim()));
  data.capacity.limit = data.capacity.type === "limited" ? toNumberOrNull(data.capacity.limit) : null;
  data.availability.slots = toNumberOrNull(data.availability.slots);
  if (data.availability.type !== "full") data.availability.nextBatch = null;
  data.code = textOrNull(data.code);

  if (!data.highRisk.isHighRisk) data.highRisk.types = [];

  if (!has(data.identities, "other")) data.identityOther = null;
  if (data.participation !== "other") data.participationOther = null;
  if (!has(data.languages, "indigenous")) data.indigenousTribe = null;
  if (!has(data.languages, "other")) data.languageOther = null;
  data.transportNote = {
    publicTransit: has(data.transport, "public_transit") ? textOrNull(data.transportNote.publicTransit) : null,
    shuttle: has(data.transport, "shuttle") ? textOrNull(data.transportNote.shuttle) : null,
    other: has(data.transport, "other") ? textOrNull(data.transportNote.other) : null,
  };
  if (!has(data.accessibility, "other")) data.accessibilityOther = null;
  if (data.fee.type === "free") data.fee.detail = null;
  if (!has(data.followUpMethods, "other")) data.followUpOther = null;

  if (data.adminContact.sameAsPublic) {
    data.adminContact = { sameAsPublic: true, name: null, phone: null, emailOrLine: null };
  }
  return data;
};

const scrollToFirstError = () => {
  document
    .querySelector(".field-error, .invalid")
    ?.closest("[class*='col-']")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
};

const validate = () => validateResource(buildPayload(), { original });

// 第一次送出後即時重新檢核，修正一項就消失一項
watch(
  [form, keywordsText, linksText],
  () => {
    if (submitted.value) errors.value = validate().errors;
  },
  { deep: true }
);

// ── 編輯模式的返回目標 ──
// 進入編輯前的頁面（從列表或詳細頁進來）；直接開啟網址時為 null，改回這筆資源的詳細頁
const previousPath = isEdit ? router.options.history.state?.back ?? null : null;
const detailPath = original ? `/resources/${original.id}` : "/list";
// 只有列表與詳細頁會顯示「已儲存」提示；回到其他頁面時不留提示，避免之後誤顯示
const SAVED_NOTICE_ROUTES = ["list", "resources-list", "resource-detail"];
const previousShowsNotice =
  !!previousPath && SAVED_NOTICE_ROUTES.includes(router.resolve(previousPath).name);

// errors 阻擋送出；missing（非嚴格模式下未填的建議欄位）不阻擋，數量帶到下一頁提醒
// 新增 → 成功頁；編輯 → 回到進入編輯前的頁面
const submitForm = async () => {
  submitted.value = true;
  const payload = buildPayload();
  const result = validateResource(payload, { original });
  errors.value = result.errors;
  if (errorCount.value) {
    await nextTick();
    scrollToFirstError();
    return;
  }
  const missingCount = Object.keys(result.missing).length;

  if (isEdit) {
    const updated = updateResource(original.id, payload);
    if (!previousPath || previousShowsNotice) {
      setFlash({ type: "resource-saved", id: updated.id, name: updated.name, missing: missingCount });
    }
    // 用 back() 回上一頁，瀏覽器歷史不會多一筆；沒有上一頁時以 replace 取代編輯頁
    if (previousPath) router.back();
    else router.replace(detailPath);
  } else {
    const created = createResource(payload);
    router.push({
      path: "/success",
      query: { id: created.id, ...(missingCount ? { missing: missingCount } : {}) },
    });
  }
};

// 「← 返回」：回上一頁；直接開啟網址時，編輯回這筆資源的詳細頁，新增回資源列表
const back = () => goBack(router, isEdit ? detailPath : "/list");
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

.form-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(93, 64, 55, 0.05);
  margin-top: 20px;
}

.form-section {
  padding: 8px 0 4px;
}

.section-divider {
  border: none;
  border-top: 1px solid #eadfd8;
  margin: 36px 0;
  opacity: 1;
}

.section-header {
  margin-bottom: 24px;
}

.section-title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 800;
  color: #3e2723;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-desc {
  margin: 0;
  font-size: 14px;
  color: #8d6e63;
  line-height: 1.5;
}

.badge-backend {
  font-size: 12px;
  font-weight: 600;
  color: #8d6e63;
  background: #f5f0ed;
  border: 1px solid #e0d5cb;
  border-radius: 999px;
  padding: 2px 10px;
}

.sub-title {
  margin: 8px 0 0;
  font-weight: 800;
  color: #5d4037;
  display: flex;
  align-items: center;
  gap: 8px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
  color: #3e2723;
  font-size: 15px;
}
input:not([type="checkbox"]):not([type="radio"]),
textarea,
select {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  background: #fdfbf9;
  font-size: 15px;
}
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #c2956e;
  box-shadow: 0 0 0 3px rgba(194, 149, 110, 0.15);
}
input.readonly {
  background: #f3efeb;
  color: #6d4c41;
  font-family: "Courier New", monospace;
  font-weight: 700;
}
select:disabled {
  background: #f3efeb;
  color: #a1887f;
}
.invalid,
.tag-groups.invalid {
  border-color: #d32f2f !important;
}

.field-error {
  margin: 6px 0 0;
  color: #d32f2f;
  font-size: 13px;
}
.hint {
  margin: 6px 0 0;
  color: #8d6e63;
  font-size: 13px;
}
.field-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.counter {
  margin-left: auto;
  margin-top: 6px;
  font-size: 12px;
  color: #a1887f;
  white-space: nowrap;
}
.counter.over {
  color: #d32f2f;
  font-weight: 700;
}

.btn-link {
  background: none;
  border: none;
  padding: 0 4px;
  color: #b98158;
  font-weight: 700;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
}

.error-summary {
  background: #fdecea;
  color: #b71c1c;
  border: 1px solid #f5c2c0;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 24px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.edit-banner {
  background: #f5f0ed;
  border: 1px solid #e0d5cb;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 24px;
  font-size: 14px;
  color: #5d4037;
}
.risk-change-hint {
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff8e1;
  color: #8a5a00;
  line-height: 1.6;
}
.not-found {
  text-align: center;
  padding: 60px 20px;
  color: #8d6e63;
}
.not-found i {
  font-size: 40px;
  margin-bottom: 12px;
}

/* 需求標籤分組 */
.tag-groups {
  border: 1px solid #eadfd8;
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tag-group-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #8d6e63;
}
.derived-chip {
  display: inline-block;
  margin-right: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #efe7dc;
  color: #5d4037;
  font-weight: 600;
}

/* 人力配置 */
.staff-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}
.btn-icon {
  width: 44px;
  border: 1px solid #e0d5cb;
  border-radius: 10px;
  background: #fdfbf9;
  color: #8d6e63;
  cursor: pointer;
}
.btn-icon:hover {
  color: #d32f2f;
  border-color: #d32f2f;
}
.btn-outline {
  background: #fff;
  border: 1px dashed #c2956e;
  color: #5d4037;
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* 週期選擇器（也用於是／否） */
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
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.cycle-selector label:focus-within {
  box-shadow: 0 0 0 3px rgba(194, 149, 110, 0.25);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
}
.checkbox-label input {
  width: 18px;
  height: 18px;
  accent-color: #5d4037;
}

/* 定位按鈕 */
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

/* 風險 */
.warning-box {
  margin: 12px 0 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff4e5;
  color: #8a4b08;
  font-size: 13px;
  line-height: 1.6;
}
.risk-summary {
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  align-items: baseline;
  border: 1px solid #e0d5cb;
  background: #fdfbf9;
  color: #5d4037;
}
.risk-summary.green {
  background: #edf7ee;
  border-color: #b7dfb9;
  color: #1b5e20;
}
.risk-summary.yellow {
  background: #fff8e1;
  border-color: #ffe082;
  color: #8a5a00;
}
.risk-summary.red {
  background: #fdecea;
  border-color: #f5c2c0;
  color: #b71c1c;
}
.risk-summary span {
  font-size: 14px;
}

.form-footer {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid #eadfd8;
}

.btn-submit {
  width: 100%;
  background: #2e7d32;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-submit:hover {
  background: #256628;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .form-card {
    padding: 20px 16px;
    border-radius: 0;
  }
  .main-content {
    margin-top: 0;
  }
  .section-divider {
    margin: 28px 0;
  }
  .section-header {
    margin-bottom: 18px;
  }
  .section-title {
    font-size: 18px;
  }
  .staff-row {
    grid-template-columns: 1fr 1fr;
    padding-bottom: 8px;
    border-bottom: 1px dashed #eadfd8;
  }
  .staff-row .btn-icon {
    grid-column: 1 / -1;
    height: 40px;
    width: 100%;
  }
  .form-footer {
    margin-top: 36px;
    padding-top: 20px;
  }
}
</style>
