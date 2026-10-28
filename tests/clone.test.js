import { test } from "node:test";
import assert from "node:assert/strict";
import { reactive, ref } from "vue";
import { deepClone } from "../src/utils/clone.js";
import { toPublicResource } from "../src/services/publicResource.js";
import { FIXTURE_RESOURCES } from "./fixtures/resources.js";

test("重現問題：structuredClone 無法複製 Vue 響應式資料", () => {
  const assessment = ref({ review: { light: "", q11Notes: {} } });
  assert.throws(() => structuredClone(assessment.value.review), { name: "DataCloneError" });
});

test("deepClone 可複製響應式資料，且結果與原資料脫鉤", () => {
  const assessment = ref({ review: { light: "orange", q11Notes: { q11_talk: { note: "x", urgent: false } }, redReasons: [] } });
  const copy = deepClone(assessment.value.review);
  assert.deepEqual(copy, { light: "orange", q11Notes: { q11_talk: { note: "x", urgent: false } }, redReasons: [] });
  copy.q11Notes.q11_talk.note = "改過";
  assert.equal(assessment.value.review.q11Notes.q11_talk.note, "x");
});

test("deepClone 處理 undefined 與 null", () => {
  assert.equal(deepClone(undefined), undefined);
  assert.equal(deepClone(null), null);
});

test("民眾端資料轉換可接受響應式的資源物件", () => {
  const resource = reactive(structuredClone(FIXTURE_RESOURCES[1]));
  assert.equal(toPublicResource(resource).name, FIXTURE_RESOURCES[1].name);
});
