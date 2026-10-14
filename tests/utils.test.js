import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { addDays, addMonths, hoursBetween, toDateString } from "../src/utils/date.js";
import { formatCode, isValidCode, nextCode } from "../src/utils/sequenceCode.js";
import { maskNationalId, storeNationalId } from "../src/utils/nationalId.js";
import { deepMerge, fillDefaults } from "../src/utils/object.js";

describe("日期", () => {
  test("加月數遇月底取該月最後一天", () => {
    assert.equal(addMonths("2026-08-31", 6), "2027-02-28");
    assert.equal(addMonths("2026-10-05", 1), "2026-11-05");
    assert.equal(addMonths("", 1), "");
  });

  test("加天數、取日期部分、相差小時", () => {
    assert.equal(addDays("2026-12-30", 3), "2027-01-02");
    assert.equal(toDateString("2026-10-01T09:00:00+08:00"), "2026-10-01");
    assert.equal(hoursBetween("2026-10-01T09:00:00+08:00", "2026-10-04T09:00:00+08:00"), 72);
    assert.equal(hoursBetween("不是日期", "2026-10-01"), null);
  });
});

describe("流水號編碼", () => {
  test("各種前綴共用", () => {
    assert.equal(formatCode("Ast", 1), "Ast001");
    assert.equal(formatCode("Case", 1234), "Case1234");
    assert.equal(nextCode("Case", [{ code: "Case002" }, { code: "Res009" }, { code: null }]), "Case003");
    assert.equal(nextCode("Ast", []), "Ast001");
  });

  test("只認得相同前綴且至少三位數", () => {
    assert.equal(isValidCode("Case", "Case001"), true);
    assert.equal(isValidCode("Case", "Case01"), false);
    assert.equal(isValidCode("Case", "case001"), false);
    assert.equal(isValidCode("Ast", "Res001"), false);
  });
});

describe("身分證字號", () => {
  test("依儲存模式轉換", () => {
    assert.equal(storeNationalId(" a123456789 ", "full"), "A123456789");
    assert.equal(storeNationalId("A123456789", "last4"), "6789");
    assert.equal(storeNationalId("A123456789", "none"), "");
    assert.equal(storeNationalId("", "full"), "");
  });

  test("後四碼重複儲存結果不變", () => {
    assert.equal(storeNationalId(storeNationalId("A123456789", "last4"), "last4"), "6789");
  });

  test("遮罩：完整字號保留前後三碼，後四碼補星號", () => {
    assert.equal(maskNationalId("A123456789"), "A12****789");
    assert.equal(maskNationalId("6789"), "******6789");
    assert.equal(maskNationalId(""), "");
  });
});

describe("物件合併", () => {
  test("deepMerge 物件逐層合併、陣列整個替換、undefined 忽略", () => {
    const merged = deepMerge({ a: { x: 1, y: 2 }, list: [1, 2] }, { a: { y: 3, z: undefined }, list: [9] });
    assert.deepEqual(merged, { a: { x: 1, y: 3 }, list: [9] });
  });

  test("fillDefaults 補齊缺漏、修正型別不符", () => {
    const filled = fillDefaults({ a: { x: 1 }, list: "壞掉", extra: true }, { a: { x: 0, y: 0 }, list: [], b: "" });
    assert.deepEqual(filled, { a: { x: 1, y: 0 }, list: [], b: "", extra: true });
  });
});
