<template>
  <div class="referral-page">
    <div class="top-bar">
      <div class="header-left"></div>
      <div class="header-center">
        <h2>轉介民眾</h2>
      </div>
      <div class="header-right"></div>
    </div>

    <div class="main-content">
      <!-- 固定提醒：緊急狀況不經過轉介單 -->
      <p class="emergency" role="note" data-tour="referral-emergency">
        <i class="fa-solid fa-phone-volume" aria-hidden="true"></i>
        {{ EMERGENCY_NOTICE }}
      </p>

      <!-- 送出後：轉介編碼與後續說明 -->
      <section v-if="submitted" class="card" role="status" data-tour="referral-done">
        <h3>已送出轉介</h3>
        <p>
          轉介編碼 <span class="code">{{ submitted.code }}</span>（{{ submitted.person.name }}）
        </p>
        <p>{{ SUBMITTED_MESSAGE }}。處理進度可以在「我的轉介」查看。</p>
        <div class="actions">
          <router-link v-if="canOpen(myReferralsPath)" :to="myReferralsPath" class="outline-btn">查看我的轉介</router-link>
          <button type="button" class="primary-btn" @click="startNew">再轉介一位</button>
        </div>
      </section>

      <form v-else class="card" novalidate @submit.prevent="handleSubmit">
        <p class="hint mb-3">
          標示 <span class="required">*</span> 的欄位必填。轉介前不需要先取得當事人同意，健康管理員第一次聯繫時會向本人說明並取得同意。
        </p>

        <div class="row g-3" data-tour="referral-person">
          <div class="col-md-6">
            <label class="field-label" for="ref-name">被轉介人姓名<span class="required">*</span></label>
            <input id="ref-name" v-model="form.person.name" type="text" class="text-input" :class="{ invalid: err('person.name') }" />
            <p v-if="err('person.name')" class="field-error">{{ err("person.name") }}</p>
          </div>
          <div class="col-md-6">
            <label class="field-label" for="ref-phone">聯絡電話<span class="required">*</span></label>
            <input
              id="ref-phone"
              v-model="form.person.phone"
              type="tel"
              class="text-input"
              placeholder="例：0900-000-001"
              :class="{ invalid: err('person.phone') }"
            />
            <p v-if="err('person.phone')" class="field-error">{{ err("person.phone") }}</p>
          </div>
          <div class="col-md-4">
            <label class="field-label" for="ref-city">縣市</label>
            <select id="ref-city" v-model="form.person.city" class="text-input">
              <option value="">請選擇縣市</option>
              <optgroup v-for="group in cityGroups" :key="group.type" :label="group.type">
                <option v-for="city in group.cities" :key="city" :value="city">{{ city }}</option>
              </optgroup>
            </select>
          </div>
          <div class="col-md-4">
            <label class="field-label" for="ref-district">行政區</label>
            <select
              id="ref-district"
              v-model="form.person.district"
              class="text-input"
              :disabled="!form.person.city"
              :class="{ invalid: err('person.district') }"
            >
              <option value="">{{ form.person.city ? "請選擇行政區" : "請先選擇縣市" }}</option>
              <option v-for="d in districtOptions" :key="d.name" :value="d.name">{{ d.name }}</option>
            </select>
            <p v-if="err('person.district')" class="field-error">{{ err("person.district") }}</p>
          </div>
          <div class="col-md-4">
            <label class="field-label" for="ref-age">年齡層</label>
            <select id="ref-age" v-model="form.person.ageGroup" class="text-input">
              <option value="">請選擇</option>
              <option v-for="o in AGE_GROUPS" :key="o.code" :value="o.code">{{ o.label }}</option>
            </select>
          </div>
        </div>

        <div class="field mt-3" data-tour="referral-situation">
          <span class="field-label">發現的狀況（可複選）<span class="required">*</span></span>
          <ChipSelect v-model="form.situations" :options="SITUATIONS" :invalid="!!err('situations')" />
          <p v-if="err('situations')" class="field-error">{{ err("situations") }}</p>
        </div>

        <label class="field">
          <span class="field-label">狀況說明<span class="required">*</span></span>
          <textarea
            v-model="form.description"
            rows="4"
            class="text-input"
            placeholder="例：最近一個月很少出門，鄰居說他常一個人坐在門口"
            :class="{ invalid: err('description') }"
          ></textarea>
          <p v-if="err('description')" class="field-error">{{ err("description") }}</p>
        </label>

        <div class="field">
          <span class="field-label">是否已告知當事人會有人聯繫</span>
          <div class="radio-row" role="radiogroup" aria-label="是否已告知當事人會有人聯繫">
            <label v-for="o in INFORMED_OPTIONS" :key="o.code">
              <input v-model="form.informed" type="radio" name="informed" :value="o.code" /> {{ o.label }}
            </label>
          </div>
        </div>

        <p v-if="errorCount" class="field-error" role="alert">還有 {{ errorCount }} 個欄位需要修正</p>
        <div class="actions">
          <button type="submit" class="primary-btn" data-tour="referral-submit">送出轉介</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import ChipSelect from "../components/ChipSelect.vue";
import { useCanOpen } from "../composables/useCanOpen.js";
import { getCityGroups, getDistricts } from "../config/districts.js";
import { AGE_GROUPS, EMERGENCY_NOTICE, INFORMED_OPTIONS, SITUATIONS, SUBMITTED_MESSAGE } from "../config/referralLabels.js";
import { createEmptyReferralForm, submitReferral } from "../services/referralService.js";
import { pathOf } from "../router/routes.js";
import { getCurrentUser } from "../utils/auth.js";

const canOpen = useCanOpen();
const myReferralsPath = pathOf("my-referrals");

const form = reactive(createEmptyReferralForm());
const errors = ref({});
const err = (path) => errors.value[path];
const errorCount = computed(() => Object.keys(errors.value).length);
const submitted = ref(null);

const cityGroups = getCityGroups();
const districtOptions = computed(() => getDistricts(form.person.city));
// 換縣市時清除不屬於該縣市的行政區
watch(
  () => form.person.city,
  () => {
    if (!districtOptions.value.some((d) => d.name === form.person.district)) form.person.district = "";
  }
);

const handleSubmit = () => {
  const result = submitReferral(form, getCurrentUser() ?? {});
  if (!result.ok) {
    errors.value = result.errors;
    return;
  }
  errors.value = {};
  submitted.value = result.referral;
  window.scrollTo({ top: 0 });
};

const startNew = () => {
  Object.assign(form, createEmptyReferralForm());
  submitted.value = null;
};
</script>

<style scoped src="../styles/referralPage.css"></style>
