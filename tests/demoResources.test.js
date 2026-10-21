import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_RESOURCES } from "../src/services/demoResources.js";
import { derivePrescriptionTypes } from "../src/config/needTags.js";
import {
  applyHighRiskRule,
  computeOverallRisk,
  getVisibility,
} from "../src/config/resourceRules.js";
import { validateResource } from "../src/services/resourceValidation.js";

// calcNextVerifyAt 不讀寫 localStorage，可直接使用
const { calcNextVerifyAt } = await import("../src/services/resourceService.js");

const byCode = Object.fromEntries(DEMO_RESOURCES.map((r) => [r.code, r]));
const visibleInExplore = DEMO_RESOURCES.filter((r) => getVisibility(r).explore.visible);
const hiddenInExplore = DEMO_RESOURCES.filter((r) => !getVisibility(r).explore.visible);

// 展示用對照表：每筆示範資料預期在探索頁與轉介選單是否顯示
const EXPECTED_VISIBILITY = {
  "Res001": { explore: true, referral: true },
  "Res002": { explore: true, referral: true },
  "Res003": { explore: true, referral: true },
  "Res004": { explore: false, referral: false, reasons: ["paused"] },
  "Res005": { explore: false, referral: false, reasons: ["risk_tracking"] },
  "Res006": { explore: false, referral: false, reasons: ["contact_needed"] },
};

test("共 6 筆、id 與編碼不重複、都有示範標記", () => {
  assert.equal(DEMO_RESOURCES.length, 6);
  assert.equal(new Set(DEMO_RESOURCES.map((r) => r.id)).size, DEMO_RESOURCES.length);
  assert.equal(new Set(DEMO_RESOURCES.map((r) => r.code)).size, DEMO_RESOURCES.length);
  assert.ok(DEMO_RESOURCES.every((r) => r.isDemo === true));
});

test("機構、人名、電話、網址明顯為虛構", () => {
  for (const r of DEMO_RESOURCES) {
    assert.match(r.organization, /示範|範例/, `${r.code} 機構名稱`);
    const people = [r.publicContact.name, r.verifiedBy.name, ...r.staff.map((s) => s.name)];
    if (!r.adminContact.sameAsPublic) people.push(r.adminContact.name);
    for (const name of people) {
      assert.match(name, /示範|範例|示例|範本/, `${r.code} 人名 ${name}`);
    }
    const phones = [r.publicContact.phone, r.adminContact.phone].filter(Boolean);
    for (const phone of phones) assert.match(phone, /^02-0000-\d{4}$/, `${r.code} 電話 ${phone}`);
    for (const link of r.links) assert.match(link, /^https:\/\/example\.com\//, `${r.code} 連結`);
  }
});

test("嚴格模式下每筆都完整填寫", () => {
  for (const r of DEMO_RESOURCES) {
    assert.deepEqual(validateResource(r, { strict: true }).errors, {}, r.code);
  }
});

test("資料與系統規則一致：整體風險、處方類型、預計驗證日期", () => {
  for (const r of DEMO_RESOURCES) {
    const computed = computeOverallRisk(applyHighRiskRule(r).riskCriteria) ?? "";
    assert.equal(r.riskLevel, computed, `${r.code} riskLevel`);
    assert.deepEqual(r.prescriptionTypes, derivePrescriptionTypes(r.needTags), `${r.code} prescriptionTypes`);
    assert.equal(r.nextVerifyAt, calcNextVerifyAt(r), `${r.code} nextVerifyAt`);
  }
});

test("探索頁顯示 3 筆：綠燈、黃燈各至少一筆，分屬不同行政區", () => {
  assert.equal(visibleInExplore.length, 3);
  const risks = new Set(visibleInExplore.map((r) => r.riskLevel));
  assert.ok(risks.has("green") && risks.has("yellow"));
  const places = new Set(visibleInExplore.map((r) => `${r.address.city}${r.address.district}`));
  assert.equal(places.size, 3);
});

test("探索頁不顯示 3 筆：暫停、風險紅燈、合作未確認各一筆", () => {
  assert.equal(hiddenInExplore.length, 3);
  const reasons = hiddenInExplore.map((r) => getVisibility(r).explore.reasons).sort();
  assert.deepEqual(reasons, [["contact_needed"], ["paused"], ["risk_tracking"]]);
});

test("探索頁與轉介選單的顯示結果符合展示對照表", () => {
  assert.deepEqual(Object.keys(EXPECTED_VISIBILITY).sort(), Object.keys(byCode).sort());
  for (const [code, expected] of Object.entries(EXPECTED_VISIBILITY)) {
    const v = getVisibility(byCode[code]);
    assert.equal(v.explore.visible, expected.explore, `${code} explore`);
    assert.equal(v.referral.visible, expected.referral, `${code} referral`);
    if (expected.reasons) assert.deepEqual(v.referral.reasons, expected.reasons, `${code} reasons`);
  }
});

test("示範資料的資源編碼為 Res001 起的連續流水號", () => {
  assert.deepEqual(
    DEMO_RESOURCES.map((r) => r.code),
    DEMO_RESOURCES.map((_, i) => `Res${String(i + 1).padStart(3, "0")}`)
  );
});

// 各行政區的保守範圍（取行政區內部、避開邊界），確認示範座標落在各自填寫的行政區內
const DISTRICT_BOUNDS = {
  "新北市板橋區": { lat: [24.995, 25.035], lng: [121.445, 121.475] },
  "新北市中和區": { lat: [24.98, 25.005], lng: [121.48, 121.515] },
  "臺北市大安區": { lat: [25.015, 25.04], lng: [121.53, 121.555] },
  "臺北市文山區": { lat: [24.975, 25.0], lng: [121.55, 121.59] },
};

test("示範資源都有座標，且落在各自填寫的行政區內", () => {
  for (const r of DEMO_RESOURCES) {
    const key = `${r.address.city}${r.address.district}`;
    const bounds = DISTRICT_BOUNDS[key];
    assert.ok(bounds, `${r.code} 的行政區 ${key} 需補上範圍`);
    assert.ok(r.geo, `${r.code} 沒有座標`);
    assert.ok(r.geo.lat >= bounds.lat[0] && r.geo.lat <= bounds.lat[1], `${r.code} 緯度 ${r.geo.lat} 不在 ${key}`);
    assert.ok(r.geo.lng >= bounds.lng[0] && r.geo.lng <= bounds.lng[1], `${r.code} 經度 ${r.geo.lng} 不在 ${key}`);
  }
});
