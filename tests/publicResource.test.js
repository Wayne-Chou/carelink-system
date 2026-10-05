import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_RESOURCES } from "../src/services/demoResources.js";
import { SHOW_SCENARIOS_TO_PUBLIC, SHOW_STAFF_TO_PUBLIC } from "../src/config/resourceRules.js";
import { getPublicAvailability, toPublicResource } from "../src/services/publicResource.js";

const visible = () => structuredClone(DEMO_RESOURCES.find((r) => r.code === "Res002"));

const BACKEND_ONLY = [
  "code",
  "verifiedBy",
  "lastVerifiedAt",
  "nextVerifyAt",
  "status",
  "pauseReason",
  "resumeAt",
  "seasonalNote",
  "createdAt",
  "updatedAt",
  "isDemo",
  "riskLevel",
  "riskCriteria",
  "highRisk",
  "riskChangeNote",
  "partnership",
  "adminContact",
  "followUpMethods",
  "followUpOther",
  "keywords",
  "geo",
];

test("民眾端資料不含任何後台欄位", () => {
  const pub = toPublicResource(visible());
  for (const key of BACKEND_ONLY) assert.equal(key in pub, false, `不應包含 ${key}`);
  // 序列化後也找不到風險與行政聯絡人的內容
  const text = JSON.stringify(pub);
  assert.equal(text.includes("張範本"), false, "行政聯絡人姓名");
  assert.equal(text.includes("admin02@example.com"), false, "行政聯絡人 Email");
});

test("民眾端保留公眾聯絡人與參與資訊", () => {
  const pub = toPublicResource(visible());
  assert.equal(pub.publicContact.name, "陳範例");
  assert.equal(pub.fee.type, "subsidized");
  assert.ok(pub.schedule.type);
  assert.ok(pub.address.district);
});

test("人力配置依 SHOW_STAFF_TO_PUBLIC 決定是否公開", () => {
  const pub = toPublicResource(visible());
  assert.equal(pub.staff.length > 0, SHOW_STAFF_TO_PUBLIC);
});

test("回傳的是複本，修改不影響原資料", () => {
  const original = visible();
  const pub = toPublicResource(original);
  pub.address.district = "改掉";
  assert.equal(original.address.district, "中和區");
});

test("探索頁不顯示的資源，民眾端不提供內容，說明不透露後台原因", () => {
  for (const code of ["Res004", "Res005", "Res006"]) {
    const r = DEMO_RESOURCES.find((x) => x.code === code);
    assert.equal(toPublicResource(r), null, code);
    const { available, message } = getPublicAvailability(r);
    assert.equal(available, false);
    assert.doesNotMatch(message, /風險|紅燈|合作|評估/, `${code}：${message}`);
  }
});

test("暫停、季節性、終止有對應說明，其他原因用通用說明", () => {
  const base = visible();
  assert.match(getPublicAvailability({ ...base, status: "paused", resumeAt: "2027-01-05" }).message, /2027-01-05 恢復/);
  assert.match(getPublicAvailability({ ...base, status: "seasonal", seasonalNote: "7–8 月休息" }).message, /7–8 月休息/);
  assert.match(getPublicAvailability({ ...base, status: "terminated" }).message, /停止提供/);
  assert.equal(getPublicAvailability({ ...base, riskLevel: "red" }).message, "這個資源目前未開放查詢。");
  assert.equal(getPublicAvailability(null).available, false);
});

test("生活情境依 SHOW_SCENARIOS_TO_PUBLIC 決定是否公開，AI 關鍵字一律不公開", () => {
  const original = visible();
  const pub = toPublicResource(original);
  assert.equal(pub.scenarios, SHOW_SCENARIOS_TO_PUBLIC ? original.scenarios : null);
  assert.equal("keywords" in pub, false);
});
