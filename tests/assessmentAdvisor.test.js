import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  RED_REMINDER,
  adviseAssessment,
  buildSuggestedTags,
  getOrangeTypeHint,
} from "../src/services/assessmentAdvisor.js";

const ALL_YES = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, "yes"]));
const make = (answers = {}, review = {}) => ({
  answers: { ...ALL_YES, q11: [], q12: "", ...answers },
  review,
});

describe("建議燈號", () => {
  test("綠燈：Q12 空白、Q11 未勾或只勾「目前沒有其他需要」、Q1–Q10 全部答是", () => {
    assert.equal(adviseAssessment(make()).suggestedLight, "green");
    assert.equal(adviseAssessment(make({ q11: ["q11_none"] })).suggestedLight, "green");
  });

  test("答 skip 的題目不算答是，不建議綠燈並提示確認", () => {
    const advice = adviseAssessment(make({ q2: "skip" }));
    assert.notEqual(advice.suggestedLight, "green");
    assert.equal(advice.stats.skipCount, 1);
    assert.ok(advice.prompts.questions.q2.some((p) => p.includes("不回答")));
    assert.ok(advice.prompts.general.some((p) => p.includes("1 題選擇不回答")));
  });

  test("Q12 有寫字就不建議綠燈，並提示先談 Q12", () => {
    const advice = adviseAssessment(make({ q12: "最近睡不好" }));
    assert.notEqual(advice.suggestedLight, "green");
    assert.equal(advice.prompts.q12.length, 1);
  });

  test("黃燈：Q11 只有一項，或 Q11 未勾且 1–2 題答否", () => {
    assert.equal(adviseAssessment(make({ q11: ["q11_legal"] })).suggestedLight, "yellow");
    assert.equal(adviseAssessment(make({ q11: ["q11_legal"], q1: "no", q2: "no" })).suggestedLight, "yellow");
    assert.equal(adviseAssessment(make({ q6: "no" })).suggestedLight, "yellow");
    assert.equal(adviseAssessment(make({ q6: "no", q9: "no" })).suggestedLight, "yellow");
  });

  test("不符合條件時不自動建議：Q11 兩項、或答否 3 題以上", () => {
    assert.equal(adviseAssessment(make({ q11: ["q11_legal", "q11_housing"] })).suggestedLight, null);
    assert.equal(adviseAssessment(make({ q1: "no", q2: "no", q3: "no" })).suggestedLight, null);
    assert.equal(adviseAssessment(make({ q11: ["q11_legal"], q1: "no", q2: "no", q3: "no" })).suggestedLight, null);
  });

  test("橘燈：勾「想找人聊聊」建議橘燈轉介", () => {
    const advice = adviseAssessment(make({ q11: ["q11_talk"] }));
    assert.equal(advice.suggestedLight, "orange");
    assert.equal(advice.suggestedOrangeType, "refer");
  });

  test("紅燈：Q11 任一項標記急迫時建議紅燈，優先於其他建議", () => {
    const advice = adviseAssessment(
      make({ q11: ["q11_talk", "q11_financial"] }, { q11Notes: { q11_financial: { note: "已斷炊", urgent: true } } })
    );
    assert.equal(advice.suggestedLight, "red");
    assert.ok(advice.prompts.q11.some((p) => p.includes("經濟與生活負擔") && p.includes("紅燈")));
  });

  test("Q11 勾 3 項以上提示可能交織", () => {
    const advice = adviseAssessment(make({ q11: ["q11_legal", "q11_housing", "q11_home"] }));
    assert.ok(advice.prompts.q11.some((p) => p.includes("交織")));
  });

  test("每次都提醒可以直接判紅燈", () => {
    assert.ok(adviseAssessment(make()).prompts.general.includes(RED_REMINDER));
  });
});

describe("各題提示", () => {
  test("Q3、Q4 答否提示追問情緒與 BSRS-5／PHQ-9", () => {
    const advice = adviseAssessment(make({ q3: "no", q4: "no" }));
    for (const q of ["q3", "q4"]) assert.ok(advice.prompts.questions[q].some((p) => p.includes("BSRS-5")));
  });

  test("Q8 答否提示 ICOPE，Q10 答否提示優先轉介，Q5 答否提示記錄以前喜歡做的事", () => {
    const advice = adviseAssessment(make({ q5: "no", q8: "no", q10: "no" }));
    assert.ok(advice.prompts.questions.q8.some((p) => p.includes("ICOPE")));
    assert.ok(advice.prompts.questions.q10.some((p) => p.includes("優先轉介")));
    assert.ok(advice.prompts.questions.q5.some((p) => p.includes("以前喜歡做的事")));
  });

  test("黃燈且民眾選擇請專人陪同時提示考慮改判橘燈", () => {
    const advice = adviseAssessment(make({}, { light: "yellow", escortOffered: true }));
    assert.ok(advice.prompts.general.some((p) => p.includes("改判橘燈")));
  });

  test("橘燈類型提示", () => {
    assert.match(getOrangeTypeHint("hesitant"), /封閉提問/);
    assert.match(getOrangeTypeHint("reserved"), /婉拒原因/);
    assert.equal(getOrangeTypeHint("refer"), "");
  });
});

describe("建議標籤", () => {
  test("Q11 的標籤可直接採用，只來自 Q1–Q10 的須確認，相同標籤合併來源", () => {
    const tags = buildSuggestedTags({ ...ALL_YES, q1: "no", q11: ["q11_activity"] });
    const companionship = tags.find((t) => t.tag === "companionship");
    assert.deepEqual(companionship.sources, ["q11_activity", "q1"]);
    assert.equal(companionship.requiresConfirmation, false);
    const mental = tags.find((t) => t.tag === "mental");
    assert.deepEqual(mental.sources, ["q1"]);
    assert.equal(mental.requiresConfirmation, true);
  });

  test("Q4 追問結果為「沒什麼事可做」時改用 Q2 的方向", () => {
    const mood = buildSuggestedTags({ ...ALL_YES, q4: "no" }).map((t) => t.tag);
    const nothing = buildSuggestedTags({ ...ALL_YES, q4: "no" }, { q4NothingToDo: true }).map((t) => t.tag);
    assert.deepEqual(mood, ["mental"]);
    assert.deepEqual(nothing, ["companionship", "arts_culture", "nature", "community"]);
  });

  test("「想找人聊聊」與「目前沒有其他需要」不產生標籤", () => {
    assert.deepEqual(buildSuggestedTags({ ...ALL_YES, q11: ["q11_talk", "q11_none"] }), []);
  });
});
