import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LIGHT_SCRIPTS,
  QUESTION_FOLLOW_UPS,
  getLightScript,
  getQ11Ask,
} from "../src/config/dialogueGuide.js";
import { QUESTION_KEYS } from "../src/config/assessmentRules.js";

test("Q1–Q10 每題都有 1–2 項建議追問", () => {
  assert.deepEqual(Object.keys(QUESTION_FOLLOW_UPS), QUESTION_KEYS);
  for (const [q, guide] of Object.entries(QUESTION_FOLLOW_UPS)) {
    assert.ok(guide.asks.length >= 1 && guide.asks.length <= 2, q);
  }
});

test("Q7、Q10 有注意事項", () => {
  assert.match(QUESTION_FOLLOW_UPS.q7.caution, /照顧者負荷/);
  assert.match(QUESTION_FOLLOW_UPS.q10.caution, /優先轉介/);
});

test("依燈號取得說法：橘燈依類型，未選類型時沒有", () => {
  assert.equal(getLightScript("orange", "refer"), LIGHT_SCRIPTS.refer);
  assert.equal(getLightScript("orange", "hesitant"), LIGHT_SCRIPTS.hesitant);
  assert.equal(getLightScript("orange", ""), null);
  assert.equal(getLightScript("yellow").closing, "如果過一陣子發現不太方便去，隨時可以回來跟我們說。");
  assert.match(getLightScript("red").note, /院內既有通報/);
  assert.equal(getLightScript(""), null);
});

test("Q11 追問帶入項目名稱", () => {
  assert.equal(getQ11Ask("法律權益諮詢"), "您勾了「法律權益諮詢」，這部分現在最讓您困擾的是什麼？");
});
