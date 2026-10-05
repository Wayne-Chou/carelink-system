import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAddress, formatCapacity, formatSchedule } from "../src/utils/resourceFormat.js";

test("formatSchedule：常態每週", () => {
  assert.equal(
    formatSchedule({ type: "regular", frequency: "weekly", weekdays: [4, 2], monthDays: [], startTime: "07:00", endTime: "08:00" }),
    "常態性｜每週 週二、週四｜07:00–08:00"
  );
});

test("formatSchedule：常態每月", () => {
  assert.equal(
    formatSchedule({ type: "regular", frequency: "monthly", weekdays: [], monthDays: [15, 1], startTime: "", endTime: "" }),
    "常態性｜每月 1 日、15 日"
  );
});

test("formatSchedule：梯次與單次", () => {
  assert.equal(
    formatSchedule({ type: "batch", startDate: "2026-11-01", endDate: "2026-12-20", weekdays: [6], startTime: "09:00", endTime: "11:00" }),
    "梯次性｜2026-11-01 ～ 2026-12-20 週六｜09:00–11:00"
  );
  assert.equal(formatSchedule({ type: "once", date: "2026-12-01", startTime: "14:00", endTime: "" }), "單次性｜2026-12-01｜14:00");
});

test("formatSchedule：沒有類型回傳空字串", () => {
  assert.equal(formatSchedule(null), "");
  assert.equal(formatSchedule({}), "");
});

test("formatAddress 與 formatCapacity", () => {
  assert.equal(
    formatAddress({ zip: "220", city: "新北市", district: "板橋區", detail: "示範路 1 號" }),
    "220 新北市板橋區示範路 1 號"
  );
  assert.equal(formatAddress({ zip: "", city: "", district: "", detail: "" }), "");
  assert.equal(formatCapacity({ type: "limited", limit: 20 }), "上限 20 人");
  assert.equal(formatCapacity({ type: "open", limit: null }), "不限");
  assert.equal(formatCapacity({ type: "", limit: null }), "");
});

test("formatRegion 與 formatAudience", async () => {
  const { formatRegion, formatAudience } = await import("../src/utils/resourceFormat.js");
  assert.equal(formatRegion({ address: { city: "新北市", district: "板橋區" } }), "新北市板橋區");
  assert.equal(formatRegion({ address: { city: "", district: "" } }), "地區待確認");
  assert.equal(formatAudience({ ageGroups: ["senior"], identities: ["caregiver", "living_alone"] }), "長者、照顧者、獨居者");
  assert.equal(formatAudience({ ageGroups: ["all"], identities: ["all"] }), "不限對象");
  assert.equal(formatAudience({ ageGroups: ["all"], identities: ["dementia"] }), "失智者");
  assert.equal(formatAudience({ ageGroups: [], identities: [] }), "");
});
