import { test } from "node:test";
import assert from "node:assert/strict";
import { EXCLUSIVE_Q11_CODES, QUESTIONS, Q11_GROUPS, getQ11Label } from "../src/config/assessmentForm.js";
import { Q11_OPTIONS } from "../src/config/needMapping.js";
import { QUESTION_KEYS } from "../src/config/assessmentRules.js";

test("Q1–Q10 題目齊全且順序與題號一致", () => {
  assert.deepEqual(QUESTIONS.map((q) => q.key), QUESTION_KEYS);
  assert.ok(QUESTIONS.every((q) => q.text.trim()));
});

test("Q11 分組涵蓋 needMapping 的每個選項，且不重複", () => {
  const codes = Q11_GROUPS.flatMap((g) => g.items.map((i) => i.code));
  assert.equal(new Set(codes).size, codes.length);
  assert.deepEqual([...codes].sort(), Q11_OPTIONS.map((o) => o.code).sort());
});

test("「若以上項目皆無需要」組為互斥選項：想找人聊聊、目前沒有其他需要", () => {
  assert.deepEqual(EXCLUSIVE_Q11_CODES, ["q11_talk", "q11_none"]);
});

test("Q11 原文標題", () => {
  assert.equal(getQ11Label("q11_financial"), "經濟與生活負擔");
  assert.equal(getQ11Label("q11_talk"), "但最近總覺得生活少了些什麼，想找人聊聊");
});
