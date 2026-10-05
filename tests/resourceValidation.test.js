import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateResource } from "../src/services/resourceValidation.js";
import { STRICT_VALIDATION } from "../src/config/resourceRules.js";
import { DEMO_RESOURCES } from "../src/services/demoResources.js";

const valid = () => structuredClone(DEMO_RESOURCES[0]);
const strict = (patch, options = {}) =>
  validateResource({ ...valid(), ...patch }, { strict: true, ...options }).errors;
const loose = (resource) => validateResource(resource, { strict: false });

const REQUIRED_PATHS = [
  "verifiedBy.type",
  "verifiedBy.name",
  "lastVerifiedAt",
  "nextVerifyAt",
  "organization",
  "description",
  "needTags",
  "capacity.type",
  "availability.type",
  "schedule.type",
  "address.city",
  "address.district",
  "address.zip",
  "address.detail",
  "riskCriteria.management",
  "riskCriteria.staffQualification",
  "ageGroups",
  "identities",
  "participation",
  "languages",
  "fee.type",
  "partnership",
  "publicContact.name",
  "publicContact.phone",
  "followUpMethods",
];

test("預設模式跟隨 STRICT_VALIDATION 設定", () => {
  const byDefault = validateResource({ name: "只有名稱" });
  const explicit = validateResource({ name: "只有名稱" }, { strict: STRICT_VALIDATION });
  assert.deepEqual(byDefault, explicit);
});

test("兩種模式下，文件第十節範例資料都沒有錯誤也沒有未填", () => {
  for (const mode of [true, false]) {
    assert.deepEqual(validateResource(valid(), { strict: mode }), { errors: {}, missing: {} });
  }
});

describe("嚴格模式（STRICT_VALIDATION = true）", () => {
  test("空資料：所有必填都是阻擋錯誤，missing 為空", () => {
    const { errors, missing } = validateResource({}, { strict: true });
    for (const key of ["name", ...REQUIRED_PATHS]) assert.ok(errors[key], `應阻擋 ${key}`);
    assert.deepEqual(missing, {});
  });

  test("暫停時須填原因與恢復日期，季節性須填說明", () => {
    const paused = strict({ status: "paused" });
    assert.ok(paused.pauseReason && paused.resumeAt);
    assert.ok(strict({ status: "seasonal" }).seasonalNote);
    assert.deepEqual(strict({ status: "paused", pauseReason: "整修", resumeAt: "2027-01-01" }), {});
  });

  test("條件式必填：其他標籤、人數上限、高風險類型、族別、收費說明", () => {
    assert.ok(strict({ needTags: ["other"] }).needTagOther);
    assert.ok(strict({ capacity: { type: "limited", limit: null } })["capacity.limit"]);
    assert.ok(strict({ highRisk: { isHighRisk: true, types: [] } })["highRisk.types"]);
    assert.ok(strict({ languages: ["indigenous"] }).indigenousTribe);
    assert.ok(strict({ fee: { type: "paid", detail: null } })["fee.detail"]);
  });

  test("服務週期依類型檢查必填", () => {
    assert.ok(
      strict({ schedule: { type: "regular", frequency: "weekly", weekdays: [], startTime: "09:00", endTime: "10:00" } })[
        "schedule.weekdays"
      ]
    );
    assert.ok(strict({ schedule: { type: "once", date: "", startTime: "09:00", endTime: "10:00" } })["schedule.date"]);
  });

  test("編輯時風險等級變更須附說明", () => {
    const original = valid();
    assert.ok(strict({ riskLevel: "green" }, { original }).riskChangeNote);
    assert.equal(strict({ riskLevel: "green", riskChangeNote: "已改善" }, { original }).riskChangeNote, undefined);
  });

  test("聯絡人電話與 Email／LINE 至少一項；行政聯絡人不同上時須填", () => {
    assert.ok(strict({ publicContact: { name: "林", phone: "", emailOrLine: null } })["publicContact.phone"]);
    assert.deepEqual(strict({ publicContact: { name: "林", phone: "", emailOrLine: "line" } }), {});
    assert.ok(strict({ adminContact: { sameAsPublic: false } })["adminContact.name"]);
  });
});

describe("非嚴格模式（STRICT_VALIDATION = false）", () => {
  test("只填資源名稱即可送出，其他必填列為建議", () => {
    const { errors, missing } = loose({ name: "社區共餐" });
    assert.deepEqual(errors, {});
    for (const key of REQUIRED_PATHS) assert.ok(missing[key], `應列為建議 ${key}`);
  });

  test("資源名稱在非嚴格模式仍然阻擋", () => {
    const { errors, missing } = loose({});
    assert.deepEqual(Object.keys(errors), ["name"]);
    assert.equal(missing.name, undefined);
  });

  test("空白字串的名稱視為未填", () => {
    assert.ok(loose({ name: "   " }).errors.name);
  });

  test("條件式必填也只列為建議", () => {
    const { errors, missing } = loose({
      ...valid(),
      status: "paused",
      needTags: ["other"],
      capacity: { type: "limited", limit: null },
      languages: ["indigenous"],
    });
    assert.deepEqual(errors, {});
    for (const key of ["pauseReason", "resumeAt", "needTagOther", "capacity.limit", "indigenousTribe"]) {
      assert.ok(missing[key], `應列為建議 ${key}`);
    }
  });
});

describe("格式錯誤在兩種模式都阻擋", () => {
  const cases = [
    ["日期格式錯誤", { lastVerifiedAt: "2026/10/01" }, "lastVerifiedAt"],
    ["不存在的日期", { lastVerifiedAt: "2026-02-30" }, "lastVerifiedAt"],
    ["預計驗證日期早於最後驗證日期", { nextVerifyAt: "2026-09-01" }, "nextVerifyAt"],
    ["恢復日期格式錯誤", { resumeAt: "明年" }, "resumeAt"],
    ["時間格式錯誤", { schedule: { type: "once", date: "2026-12-01", startTime: "25:00", endTime: "26:00" } }, "schedule.startTime"],
    ["結束時間早於開始時間", { schedule: { type: "once", date: "2026-12-01", startTime: "09:00", endTime: "08:00" } }, "schedule.endTime"],
    ["梯次結束日期早於開始日期", { schedule: { type: "batch", startDate: "2026-12-01", endDate: "2026-11-01", weekdays: [1], startTime: "09:00", endTime: "10:00" } }, "schedule.endDate"],
    ["資源內容超過 100 字", { description: "字".repeat(101) }, "description"],
    ["人數上限不是正整數", { capacity: { type: "limited", limit: 2.5 } }, "capacity.limit"],
    ["人數上限為 0", { capacity: { type: "limited", limit: 0 } }, "capacity.limit"],
    ["可用名額為負數", { availability: { type: "available", slots: -1, nextBatch: null } }, "availability.slots"],
    ["郵遞區號格式錯誤", { address: { zip: "22", city: "新北市", district: "板橋區", detail: "x" } }, "address.zip"],
    ["社群連結不是網址", { links: ["https://ok.example", "fb/abc"] }, "links"],
  ];

  for (const mode of [true, false]) {
    for (const [name, patch, path] of cases) {
      test(`${mode ? "嚴格" : "非嚴格"}：${name}`, () => {
        const { errors, missing } = validateResource({ ...valid(), ...patch }, { strict: mode });
        assert.ok(errors[path], `應阻擋 ${path}`);
        assert.equal(missing[path], undefined);
      });
    }
  }

  test("合法格式不報錯：100 字內容、5 碼郵遞區號、0 名額", () => {
    for (const mode of [true, false]) {
      const { errors } = validateResource(
        {
          ...valid(),
          description: "字".repeat(100),
          address: { zip: "22041", city: "新北市", district: "板橋區", detail: "x" },
          availability: { type: "full", slots: 0, nextBatch: null },
        },
        { strict: mode }
      );
      assert.deepEqual(errors, {});
    }
  });
});

test("經緯度不在表單中，任何值都不檢核", () => {
  for (const mode of [true, false]) {
    const { errors, missing } = validateResource({ ...valid(), geo: null }, { strict: mode });
    assert.deepEqual(errors, {});
    assert.deepEqual(missing, {});
  }
});

describe("編輯時風險等級變更（兩種模式都必填）", () => {
  const original = () => ({ ...valid(), riskLevel: "yellow", riskChangeNote: "環境需改善" });

  for (const mode of [true, false]) {
    const label = mode ? "嚴格" : "非嚴格";

    test(`${label}：等級變更且未填說明 → 阻擋`, () => {
      const { errors, missing } = validateResource(
        { ...original(), riskLevel: "green", riskChangeNote: "" },
        { original: original(), strict: mode }
      );
      assert.ok(errors.riskChangeNote);
      assert.equal(missing.riskChangeNote, undefined);
    });

    test(`${label}：沿用上一次的說明 → 阻擋`, () => {
      const { errors } = validateResource(
        { ...original(), riskLevel: "green" },
        { original: original(), strict: mode }
      );
      assert.match(errors.riskChangeNote, /不可沿用/);
    });

    test(`${label}：填寫新說明 → 通過`, () => {
      const { errors } = validateResource(
        { ...original(), riskLevel: "green", riskChangeNote: "已加裝扶手" },
        { original: original(), strict: mode }
      );
      assert.equal(errors.riskChangeNote, undefined);
    });

    test(`${label}：等級沒變不需要說明`, () => {
      const { errors, missing } = validateResource(
        { ...original(), riskChangeNote: "" },
        { original: original(), strict: mode }
      );
      assert.equal(errors.riskChangeNote, undefined);
      assert.equal(missing.riskChangeNote, undefined);
    });

    test(`${label}：原本沒有風險等級（首次評估）不算變更`, () => {
      const { errors } = validateResource(
        { ...original(), riskLevel: "green", riskChangeNote: "" },
        { original: { ...original(), riskLevel: "" }, strict: mode }
      );
      assert.equal(errors.riskChangeNote, undefined);
    });
  }

  test("新增時（沒有 original）不檢查", () => {
    assert.equal(validateResource({ ...valid(), riskChangeNote: "" }).errors.riskChangeNote, undefined);
  });
});

test("資源編碼：空白可通過（尚未產生），有值時格式須為 Res 加三位數", () => {
  for (const mode of [true, false]) {
    assert.equal(validateResource({ ...valid(), code: null }, { strict: mode }).errors.code, undefined);
    assert.equal(validateResource({ ...valid(), code: "Res1000" }, { strict: mode }).errors.code, undefined);
    for (const bad of ["RES001", "Res01", "R001", "Res-001"]) {
      assert.ok(validateResource({ ...valid(), code: bad }, { strict: mode }).errors.code, bad);
    }
  }
});
