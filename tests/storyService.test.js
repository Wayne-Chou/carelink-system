import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
const local = memoryStorage();
globalThis.localStorage = local;
globalThis.sessionStorage = session;

const { PROTAGONIST, STORY_FAILURE_NOTE, STORY_GOAL, STORY_STEPS, UNBOUND_NOTE, SKIPPED_FAILURE_NOTE, exampleTitle } =
  await import("../src/config/demoStory.js");
const { buildScenario, STORY_CASE_ID } = await import("../src/services/demoScenario.js");
const { loadScenario, autoLoadDemoIfEmpty, countData } = await import("../src/services/demoService.js");
const story = await import("../src/services/storyService.js");
const A = await import("../src/services/assessmentService.js");
const C = await import("../src/services/caseService.js");
const { adviseAssessment } = await import("../src/services/assessmentAdvisor.js");
const { computeTodos } = await import("../src/services/todoService.js");
const { createResource, getAllResources } = await import("../src/services/resourceService.js");
const { DEMO_ACCOUNTS } = await import("../src/config/roles.js");
const { saveUsers } = await import("../src/utils/auth.js");
const { todayString } = await import("../src/utils/date.js");

const user = (role) => DEMO_ACCOUNTS.find((a) => a.role === role);
const account = (email) => DEMO_ACCOUNTS.find((a) => a.email === email);
const state = () => story.getStoryState();
const position = (s = state()) => (s.done ? "done" : s.offTrack ? `off:${s.offTrack.restartStep}` : `${s.step}:${s.task}`);
const caseNow = () => C.getCaseById(STORY_CASE_ID);
const caseId = () => state().caseItem.id;
const resourceOf = (code) => getAllResources().find((r) => r.code === code);
const FOLLOW_UP = { attendance: "attended", participation: "success", impact: "improved" };

// 沒有綁定資源點帳號的資源（三個可推薦的示範資源都有帳號，另建一筆）
const UNBOUND_NAME = "自建社區活動";
const createUnbound = () => createResource({ name: UNBOUND_NAME }).id;

// 頁面上的操作（與各頁呼叫的 service 相同）
const link = (code) => C.addLinkage(caseId(), { resourceId: resourceOf(code).id, reason: "示範" });
const linkUnbound = () => C.addLinkage(caseId(), { resourceId: createUnbound(), reason: "示範" });
const record = (status, providerNote = "") => C.updateLinkageStatus(caseId(), { status, providerNote });
const ACTIONS = {
  fill: () =>
    A.createAssessment({ person: { name: PROTAGONIST.name }, answers: PROTAGONIST.answers, fillMode: "oral" }),
  review: () => {
    const result = A.reviewAssessment(
      state().assessment.id,
      { readerName: "郭範例", readerType: "doctor", light: "orange", orangeType: "refer", consent: true },
      { managerName: "高示範" }
    );
    assert.equal(result.ok, true);
    assert.ok(result.case, "自動開案");
  },
  firstContact: () => C.recordFirstContact(caseId()),
  consult: () => C.updateCase(caseId(), { consultation: { whatMatters: "有人可以說說話", goals: [STORY_GOAL] } }),
  advanceToLink: () => assert.equal(C.advanceStage(caseId()).ok, true),
  link: () => link("Res003"), // 故事範例：歌唱班（provider3 綁定）
  // 歌唱班的資源點在資源端後台回報失敗
  providerReportFirst: () => assert.equal(record("failed", STORY_FAILURE_NOTE).suggestReturnToConsultation, true),
  returnToConsultation: () => C.returnToConsultation(caseId(), { note: "連結失敗，退回諮詢重新評估" }),
  supplement: () => {
    C.updateCase(caseId(), { consultation: { note: "週三下午固定回診", goals: [STORY_GOAL, "選擇早上時段的活動"] } });
    assert.equal(C.advanceStage(caseId()).ok, true);
  },
  relink: () => link("Res001"), // 故事範例：太極班（provider 綁定）
  providerReport: () => record("success"),
  advanceToFollowUp: () => assert.equal(C.advanceStage(caseId()).ok, true),
  followUp1: () => C.recordFollowUp(caseId(), 1, FOLLOW_UP),
  followUp3: () => C.recordFollowUp(caseId(), 3, FOLLOW_UP),
  followUp6: () => C.recordFollowUp(caseId(), 6, FOLLOW_UP),
  advanceToClosure: () => assert.equal(C.advanceStage(caseId()).ok, true),
  close: () =>
    assert.equal(C.closeCase(caseId(), { reason: "goal_met", reentryExplained: true, returnedToMedical: true }).ok, true),
};

// 故事範例：歌唱班的資源點回報失敗 → 回到諮詢 → 改轉介太極班，資源點回報成功 → 追蹤 → 結案
const STORY_PATH = [
  "1:fill",
  "2:review",
  "3:firstContact",
  "3:consult",
  "4:advanceToLink",
  "4:link",
  "5:providerReportFirst",
  "6:returnToConsultation",
  "6:supplement",
  "7:relink",
  "8:providerReport",
  "9:advanceToFollowUp",
  "9:followUp1",
  "10:followUp3",
  "10:followUp6",
  "11:advanceToClosure",
  "11:close",
  "done",
];

// 載入第 N 步時的起點
const START_OF_STEP = {
  1: "1:fill",
  2: "2:review",
  3: "3:firstContact",
  4: "4:advanceToLink",
  5: "5:providerReportFirst",
  6: "6:returnToConsultation",
  7: "7:relink",
  8: "8:providerReport",
  9: "9:advanceToFollowUp",
  10: "10:followUp3",
  11: "11:advanceToClosure",
};

// 從目前位置依序執行操作，每一步都要到達預期位置
function walk(steps) {
  for (const [action, expected] of steps) {
    action();
    assert.equal(position(), expected, `完成操作後應為 ${expected}`);
  }
}

beforeEach(() => {
  session.data = {};
  local.data = {};
});

test("11 個步驟：預設操作角色與簡報階段，第 5、6 步為回到諮詢的迴圈", () => {
  assert.deepEqual(
    STORY_STEPS.map((s) => `${s.step}${s.phase}${s.role}`),
    [
      "1辨識reader",
      "2辨識reader",
      "3諮詢manager",
      "4連結manager",
      "5連結provider",
      "6諮詢manager",
      "7連結manager",
      "8連結provider",
      "9追蹤manager",
      "10追蹤manager",
      "11結案manager",
    ]
  );
  for (const step of [5, 6]) {
    assert.match(STORY_STEPS[step - 1].note, /簡報第 3 階段「若資源不合適，回到諮詢重新評估」的迴圈/);
  }
  assert.match(STORY_STEPS[9].note, /3、6 個月追蹤安排在同一天/);
  assert.equal(exampleTitle(STORY_STEPS[4]), "回報「示範關懷據點歌唱班」的連結結果", "載入選單以故事範例帶入資源");
  assert.ok(STORY_STEPS.every((s) => !exampleTitle(s).includes("{resource}")));
});

test("三個可推薦的示範資源各有一個資源點示範帳號，暫停中的 Res004 沒有", () => {
  const providers = DEMO_ACCOUNTS.filter((a) => a.role === "provider");
  assert.deepEqual(
    providers.map((a) => [a.email, a.resourceLabel.split(" ")[0]]),
    [
      ["provider@demo.carelink", "Res001"],
      ["provider2@demo.carelink", "Res002"],
      ["provider3@demo.carelink", "Res003"],
    ]
  );
  loadScenario(1);
  for (const a of providers) {
    const r = getAllResources().find((x) => x.id === a.resourceId);
    assert.equal(a.resourceLabel, `${r.code} ${r.name}`);
    assert.match(a.name, /示範|範例|示例|範本/, "姓名為虛構的機構窗口");
    assert.equal(a.password, "demo1234");
  }
  assert.equal(story.providerAccountFor(resourceOf("Res004").id, DEMO_ACCOUNTS), null);
});

test("主角的答案：Q1、Q2 答否、Q11 想找人聊聊，系統建議橘燈轉介", () => {
  const advice = adviseAssessment({ answers: PROTAGONIST.answers, review: {} });
  assert.equal(advice.suggestedLight, "orange");
  assert.equal(advice.suggestedOrangeType, "refer");
  assert.deepEqual(
    Object.entries(PROTAGONIST.answers).filter(([k, v]) => /^q([3-9]|10)$/.test(k) && v !== "yes"),
    [],
    "Q3～Q10 答是"
  );
});

for (const [step, expected] of Object.entries(START_OF_STEP)) {
  test(`載入第 ${step} 步：判斷為第 ${step} 步的起點`, () => {
    loadScenario(Number(step));
    const s = state();
    assert.equal(s.active, true);
    assert.equal(position(s), expected);
  });
}

test("故事範例：任一步開始，依頁面操作一路做到結案，每一步都判斷正確", () => {
  for (let start = 1; start <= 11; start += 1) {
    session.data = {};
    loadScenario(start);
    let index = STORY_PATH.indexOf(START_OF_STEP[start]);
    while (STORY_PATH[index] !== "done") {
      const [, task] = STORY_PATH[index].split(":");
      ACTIONS[task]();
      index += 1;
      assert.equal(position(), STORY_PATH[index], `從第 ${start} 步開始，完成 ${task} 後`);
    }
  }
});

test("第 4 步選不同資源：說明列帶入實際選擇的資源，提示改用對應的資源點帳號", () => {
  const EXPECTED = { Res001: "provider@demo.carelink", Res002: "provider2@demo.carelink", Res003: "provider3@demo.carelink" };
  for (const [code, email] of Object.entries(EXPECTED)) {
    loadScenario(4);
    ACTIONS.advanceToLink();
    link(code);
    const s = state();
    assert.equal(position(s), "5:providerReportFirst", code);
    const { name } = resourceOf(code);
    const info = story.storyStepInfo(s);
    assert.equal(info.title, `回報「${name}」的連結結果`);
    assert.equal(info.page, "resource-dashboard");
    assert.match(info.note, new RegExp(email.replace(".", "\\.")));
    const asManager = story.describeStory(s, user("manager"));
    assert.deepEqual(asManager.operator, { role: "provider", roleLabel: "資源點", label: `${name}的資源點`, email, password: "demo1234" });
    assert.equal(asManager.isOperator, false);
    // 只有綁定這個資源的帳號是操作者
    for (const [otherCode, otherEmail] of Object.entries(EXPECTED)) {
      assert.equal(story.describeStory(s, account(otherEmail)).isOperator, otherCode === code, `${code} / ${otherEmail}`);
    }
    assert.deepEqual(story.describeStory(s, account(email)).link, { path: "/resource-dashboard", label: "前往資源端後台" });
  }
});

test("沒有綁定帳號的資源：由健康管理員確認後代為記錄（第 5、8 步）", () => {
  loadScenario(4);
  walk([
    [ACTIONS.advanceToLink, "4:link"],
    [linkUnbound, "5:managerRecordFirst"],
  ]);
  let s = state();
  let info = story.storyStepInfo(s);
  assert.equal(info.role, "manager");
  assert.equal(info.title, `回報「${UNBOUND_NAME}」的連結結果`);
  assert.match(info.note, new RegExp(UNBOUND_NOTE));
  assert.equal(story.describeStory(s, user("manager")).link.path, `/case/${STORY_CASE_ID}`);

  // 第 7 步改選沒有帳號的資源，第 8 步也由健康管理員記錄
  loadScenario(7);
  walk([[linkUnbound, "8:managerRecord"]]);
  s = state();
  info = story.storyStepInfo(s);
  assert.equal(info.title, `記錄林示範已開始參加「${UNBOUND_NAME}」`);
  assert.equal(info.role, "manager");
  assert.match(info.note, new RegExp(UNBOUND_NOTE));
  walk([[() => record("success"), "9:advanceToFollowUp"]]);
});

test("第一次轉介就成功：略過連結失敗的示範，直接接到追蹤", () => {
  loadScenario(4);
  walk([
    [ACTIONS.advanceToLink, "4:link"],
    [() => link("Res001"), "5:providerReportFirst"],
    [() => record("success"), "9:advanceToFollowUp"],
    [ACTIONS.advanceToFollowUp, "9:followUp1"],
  ]);
  const s = state();
  assert.equal(s.skippedFailure, true);
  assert.match(story.storyStepInfo(s).note, new RegExp(SKIPPED_FAILURE_NOTE));
  walk([
    [ACTIONS.followUp1, "10:followUp3"],
    [ACTIONS.followUp3, "10:followUp6"],
    [ACTIONS.followUp6, "11:advanceToClosure"],
    [ACTIONS.advanceToClosure, "11:close"],
    [ACTIONS.close, "done"],
  ]);

  // 歌唱班的資源點回報成功，也一樣略過
  loadScenario(5);
  walk([[() => record("success"), "9:advanceToFollowUp"]]);
  assert.equal(state().skippedFailure, true);

  // 沒有帳號的資源由健康管理員記錄成功，也一樣略過
  loadScenario(4);
  walk([
    [ACTIONS.advanceToLink, "4:link"],
    [linkUnbound, "5:managerRecordFirst"],
    [() => record("success"), "9:advanceToFollowUp"],
  ]);
  assert.equal(state().skippedFailure, true);
});

test("第 7 步改選其他資源、或失敗後不退回直接重新轉介，都能接下去", () => {
  loadScenario(7);
  walk([[() => link("Res002"), "8:providerReport"]]);
  const detail = story.describeStory(state(), account("provider2@demo.carelink"));
  assert.equal(detail.isOperator, true, "共餐食堂由 provider2 回報");
  assert.equal(detail.info.title, "記錄林示範已開始參加「範例長青共餐食堂」");
  walk([[() => record("success"), "9:advanceToFollowUp"]]);

  // 第 6 步不退回諮詢，直接在連結階段重新選資源
  loadScenario(6);
  walk([[() => link("Res001"), "8:providerReport"]]);
});

test("第二次轉介又失敗：再次回到諮詢的迴圈", () => {
  loadScenario(8);
  walk([
    [() => record("failed", "身體不適"), "6:returnToConsultation"],
    [ACTIONS.returnToConsultation, "6:supplement"],
    [ACTIONS.supplement, "7:relink"],
  ]);
});

test("第 5 步回報失敗後直接在確認視窗退回諮詢，也判斷為第 6 步（補充晤談）", () => {
  loadScenario(5);
  ACTIONS.providerReportFirst();
  ACTIONS.returnToConsultation();
  assert.equal(position(), "6:supplement");
});

test("資源綁定了註冊的資源點帳號：由該帳號回報，不顯示密碼", () => {
  loadScenario(4);
  const id = createUnbound();
  saveUsers([{ id: 1, name: "活動窗口", email: "event@example.com", password: "x", role: "provider", resourceId: id }]);
  ACTIONS.advanceToLink();
  C.addLinkage(caseId(), { resourceId: id });
  const s = state();
  assert.equal(position(s), "5:providerReportFirst");
  const asDemoProvider = story.describeStory(s, user("provider"));
  assert.equal(asDemoProvider.operator.email, "event@example.com");
  assert.equal(asDemoProvider.operator.password, "", "非示範帳號不顯示密碼");
  assert.equal(asDemoProvider.isOperator, false, "示範帳號綁定的是太極班");
  assert.equal(story.describeStory(s, { role: "provider", resourceId: id }).isOperator, true);
});

test("故事無法繼續時才顯示「目前資料與故事不符」：判讀不是橘燈轉介", () => {
  loadScenario(2);
  A.reviewAssessment(state().assessment.id, { readerName: "郭範例", light: "yellow" });
  assert.equal(position(), "off:2");
  assert.match(state().offTrack.message, /黃燈/);
});

test("各步的日期安排：該步可以直接操作", () => {
  const today = todayString();
  const now = new Date(`${today}T09:00:00+08:00`);
  const todosOf = () => computeTodos({ today, now });

  loadScenario(3);
  assert.equal(C.isFirstContactOverdue(caseNow(), now), false, "第 3 步：昨天開案，尚未超過 72 小時");

  for (const step of [5, 8]) {
    loadScenario(step);
    assert.equal(todosOf().some((t) => t.type === "provider_unreported"), false, `第 ${step} 步：3 天前轉介，還不到 14 天`);
  }

  loadScenario(6);
  const failed = caseNow();
  assert.equal(failed.linkages[0].providerNote, STORY_FAILURE_NOTE);
  assert.equal(
    failed.history.find((h) => h.action === "linkage_status").actor,
    "示範關懷據點歌唱班",
    "由歌唱班的資源點回報（操作者為資源單位）"
  );

  loadScenario(9);
  const f1 = caseNow().followUps.find((f) => f.round === 1);
  assert.ok(f1.plannedAt <= today, "第 9 步：1 個月追蹤已到期");

  loadScenario(10);
  const statuses = caseNow().followUps.map((f) => C.getFollowUpStatus(f, today));
  assert.deepEqual(statuses, ["done", "due", "due"], "第 10 步：1 個月完成，3、6 個月都已到期");

  loadScenario(11);
  assert.ok(caseNow().followUps.every((f) => f.doneAt && f.doneAt <= today), "第 11 步：追蹤都已完成");
});

test("各步的個案資料：連結紀錄、推進規則與歷程順序", () => {
  const today = todayString();
  const resources = buildScenario(1).resources;
  const codeOf = (id) => resources.find((r) => r.id === id)?.code;
  const EXPECTED_LINKS = {
    4: [],
    5: ["Res003:pending"],
    6: ["Res003:failed"],
    7: ["Res003:failed"],
    8: ["Res003:failed", "Res001:pending"],
    9: ["Res003:failed", "Res001:success"],
    11: ["Res003:failed", "Res001:success"],
  };
  for (let step = 3; step <= 11; step += 1) {
    const c = buildScenario(step).cases[0];
    const dates = c.history.map((h) => h.at);
    assert.deepEqual(dates, [...dates].sort(), `第 ${step} 步歷程依時間排序`);
    assert.ok(c.history.every((h) => h.date <= today), `第 ${step} 步沒有未來的歷程`);
    if (EXPECTED_LINKS[step]) {
      assert.deepEqual(c.linkages.map((l) => `${codeOf(l.resourceId)}:${l.status}`), EXPECTED_LINKS[step], `第 ${step} 步連結`);
    }
    const previous = { 3: 2, 4: 3 }[c.stage];
    if (previous) {
      const check = C.checkAdvance({ ...c, stage: previous });
      assert.equal(check.ok, true, `第 ${step} 步：${check.reasons.join("、")}`);
    }
  }
});

test("認出主角：只認姓名「林示範」（忽略空白），作廢的評估不算", () => {
  loadScenario(1);
  A.createAssessment({ person: { name: "其他民眾" }, answers: PROTAGONIST.answers });
  assert.equal(position(), "1:fill", "別人的評估不影響");
  const mine = A.createAssessment({ person: { name: "林 示範" }, answers: PROTAGONIST.answers });
  assert.equal(position(), "2:review");
  A.voidAssessment(mine.id, { reason: "填錯", actor: "郭範例" });
  assert.equal(position(), "1:fill");
});

test("沒有示範情境資料時不顯示說明列", () => {
  assert.equal(story.getStoryState().active, false);
  loadScenario(1);
  assert.equal(story.getStoryState().active, true);
});

test("說明列：操作者看到要做什麼與前往連結，其他角色提示改用哪個帳號", () => {
  loadScenario(2);
  const s = state();
  const asReader = story.describeStory(s, user("reader"));
  assert.equal(asReader.isOperator, true);
  assert.equal(asReader.link.path, `/assessments/${s.assessment.id}`);
  const asManager = story.describeStory(s, user("manager"));
  assert.equal(asManager.isOperator, false);
  assert.equal(asManager.link, null);
  assert.deepEqual(asManager.operator, {
    role: "reader",
    roleLabel: "判讀人員",
    label: "判讀人員",
    email: "reader@demo.carelink",
    password: "demo1234",
  });

  // 第 5 步：歌唱班的資源點（provider3）在資源端後台回報
  loadScenario(5);
  const asProvider3 = story.describeStory(state(), account("provider3@demo.carelink"));
  assert.equal(asProvider3.isOperator, true);
  assert.equal(asProvider3.info.title, "回報「示範關懷據點歌唱班」的連結結果");
  assert.match(asProvider3.task, new RegExp(STORY_FAILURE_NOTE));
  const hint = story.describeStory(state(), user("manager")).operator;
  assert.equal(`請改用${hint.label}帳號登入（${hint.email}／${hint.password}）`, "請改用示範關懷據點歌唱班的資源點帳號登入（provider3@demo.carelink／demo1234）");
  assert.equal(story.describeStory(state(), user("provider")).isOperator, false, "太極班的資源點不是操作者");

  // 第 8 步：太極班的資源點（provider）回報
  loadScenario(8);
  assert.deepEqual(story.describeStory(state(), user("provider")).link, { path: "/resource-dashboard", label: "前往資源端後台" });
  assert.equal(story.describeStory(state(), account("provider3@demo.carelink")).isOperator, false);
  assert.equal(story.describeStory(state(), user("admin")).isOperator, false, "系統管理員也請改用該角色帳號");
});

test("各角色現在看得到什麼：依實際選擇的資源與綁定的帳號", () => {
  const items = (role) => story.describeVisibility(state()).find((v) => v.role === role).items.join("\n");

  loadScenario(1);
  assert.match(items("reader"), /還沒有 林示範 的評估/);
  assert.match(items("provider"), /看不到 林示範（尚未轉介）/);

  loadScenario(3);
  assert.match(items("reader"), /只顯示編碼/);
  assert.match(items("manager"), /Case001（諮詢）/);

  loadScenario(5);
  assert.match(items("manager"), /連結「示範關懷據點歌唱班」待回報，等資源點回報/);
  assert.match(items("provider"), /provider3@demo\.carelink 的資源端後台：林示範 轉介到「示範關懷據點歌唱班」（待回報）/);
  assert.match(items("provider"), /其他資源點帳號看不到/);

  loadScenario(6);
  assert.match(items("manager"), new RegExp(`失敗（${STORY_FAILURE_NOTE}）`));
  assert.match(items("provider"), /provider3@demo\.carelink.*已回報失敗/);

  loadScenario(8);
  assert.match(items("provider"), /provider@demo\.carelink 的資源端後台：林示範 轉介到「示範社區太極班」（待回報）/);

  loadScenario(9);
  assert.match(items("provider"), /已回報成功/);

  // 改選沒有帳號的資源
  loadScenario(7);
  linkUnbound();
  assert.match(items("provider"), new RegExp(`「${UNBOUND_NAME}」沒有資源點帳號，這筆轉介只在健康管理員的個案頁`));
  assert.match(items("manager"), new RegExp(`連結「${UNBOUND_NAME}」待回報，沒有資源點帳號，由健康管理員代為記錄`));

  loadScenario(10);
  assert.match(items("manager"), /待辦：追蹤到期/);
  assert.match(items("admin"), /全部頁面/);
});

test("載入示範情境：清空既有資料，只留示範情境；沒有資料時自動載入第 1 步", () => {
  A.createAssessment({ person: { name: "自建" } });
  assert.equal(countData().assessments, 1);
  assert.deepEqual(loadScenario(4), { step: 4, resources: 4, assessments: 1, cases: 1 });
  assert.ok(getAllResources().every((r) => r.isDemo));
  assert.deepEqual(A.getAllAssessments().map((a) => a.person.name), ["林示範"]);
  assert.equal(loadScenario(99).step, 11, "超出範圍時取最接近的步驟");

  session.data = {};
  assert.equal(autoLoadDemoIfEmpty({ enabled: true }), true);
  assert.equal(position(), "1:fill");
  assert.equal(autoLoadDemoIfEmpty({ enabled: true }), false, "已有資料時不重複載入");
});
