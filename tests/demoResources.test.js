import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_RESOURCES, DEMO_RESOURCE_IDS, createDemoResources } from "../src/services/demoResources.js";
import { derivePrescriptionTypes } from "../src/config/needTags.js";
import { applyHighRiskRule, computeOverallRisk, getVisibility } from "../src/config/resourceRules.js";
import { DEMO_ACCOUNTS } from "../src/config/roles.js";
import { getZipCode } from "../src/config/districts.js";
import { validateResource } from "../src/services/resourceValidation.js";

// calcNextVerifyAt 不讀寫儲存區，可直接使用
const { calcNextVerifyAt, isVerifyOverdue } = await import("../src/services/resourceService.js");

const byCode = Object.fromEntries(DEMO_RESOURCES.map((r) => [r.code, r]));

// 展示用對照表：每筆示範資料預期在探索頁與轉介選單是否顯示
const EXPECTED_VISIBILITY = {
  Res001: { explore: true, referral: true },
  Res002: { explore: true, referral: true },
  Res003: { explore: true, referral: true },
  Res004: { explore: false, referral: false, reasons: ["paused"] },
};

test("共 4 筆花蓮縣資源、id 與編碼不重複、都有示範標記", () => {
  assert.equal(DEMO_RESOURCES.length, 4);
  assert.deepEqual(DEMO_RESOURCES.map((r) => r.code), ["Res001", "Res002", "Res003", "Res004"]);
  assert.equal(new Set(DEMO_RESOURCES.map((r) => r.id)).size, DEMO_RESOURCES.length);
  assert.ok(DEMO_RESOURCES.every((r) => r.isDemo === true));
  assert.ok(DEMO_RESOURCES.every((r) => r.address.city === "花蓮縣"));
  assert.ok(DEMO_RESOURCES.every((r) => r.id === DEMO_RESOURCE_IDS[r.code]));
});

test("Res001 為示範社區太極班，資源點示範帳號綁定這筆", () => {
  assert.equal(byCode.Res001.name, "示範社區太極班");
  assert.equal(DEMO_ACCOUNTS.find((a) => a.role === "provider").resourceId, byCode.Res001.id);
});

test("機構、人名、電話、網址明顯為虛構", () => {
  for (const r of DEMO_RESOURCES) {
    assert.match(r.organization, /示範|範例/, `${r.code} 機構名稱`);
    const people = [r.publicContact.name, r.verifiedBy.name, ...r.staff.map((s) => s.name)];
    if (!r.adminContact.sameAsPublic) people.push(r.adminContact.name);
    for (const name of people) assert.match(name, /示範|範例|示例|範本/, `${r.code} 人名 ${name}`);
    assert.ok(!people.includes("林示範"), "不與主角同名");
    const phones = [r.publicContact.phone, r.adminContact.phone].filter(Boolean);
    for (const phone of phones) assert.match(phone, /^0\d-0000-\d{4}$/, `${r.code} 電話 ${phone}`);
    for (const link of r.links) assert.match(link, /^https:\/\/example\.com\//, `${r.code} 連結`);
  }
});

test("嚴格模式下每筆都完整填寫，郵遞區號與行政區一致", () => {
  for (const r of DEMO_RESOURCES) {
    assert.deepEqual(validateResource(r, { strict: true }).errors, {}, r.code);
    assert.equal(r.address.zip, getZipCode(r.address.city, r.address.district), r.code);
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

test("日期依載入當天產生：任何一天載入都不會是待驗證", () => {
  for (const today of ["2026-10-22", "2027-03-31", "2028-02-29"]) {
    for (const r of createDemoResources(today)) {
      assert.equal(isVerifyOverdue(r, today), false, `${today} ${r.code}`);
      assert.equal(r.nextVerifyAt, calcNextVerifyAt(r), `${today} ${r.code}`);
    }
  }
});

test("探索頁與轉介選單的顯示結果符合展示對照表：3 筆可轉介（含 1 筆黃燈），1 筆暫停", () => {
  for (const [code, expected] of Object.entries(EXPECTED_VISIBILITY)) {
    const v = getVisibility(byCode[code]);
    assert.equal(v.explore.visible, expected.explore, `${code} explore`);
    assert.equal(v.referral.visible, expected.referral, `${code} referral`);
    if (expected.reasons) assert.deepEqual(v.referral.reasons, expected.reasons, `${code} reasons`);
  }
  assert.equal(byCode.Res003.riskLevel, "yellow");
});

// 各鄉鎮市的保守範圍（取行政區內部、避開邊界），確認示範座標落在各自填寫的行政區內
const DISTRICT_BOUNDS = {
  花蓮縣花蓮市: { lat: [23.95, 24.02], lng: [121.58, 121.63] },
  花蓮縣吉安鄉: { lat: [23.93, 23.99], lng: [121.53, 121.59] },
  花蓮縣新城鄉: { lat: [24.02, 24.1], lng: [121.58, 121.63] },
};

test("示範資源都有座標，且落在各自填寫的行政區內", () => {
  for (const r of DEMO_RESOURCES) {
    const key = `${r.address.city}${r.address.district}`;
    const bounds = DISTRICT_BOUNDS[key];
    assert.ok(bounds, `${r.code} 的行政區 ${key} 需補上範圍`);
    assert.ok(r.geo.lat >= bounds.lat[0] && r.geo.lat <= bounds.lat[1], `${r.code} 緯度 ${r.geo.lat} 不在 ${key}`);
    assert.ok(r.geo.lng >= bounds.lng[0] && r.geo.lng <= bounds.lng[1], `${r.code} 經度 ${r.geo.lng} 不在 ${key}`);
  }
});
