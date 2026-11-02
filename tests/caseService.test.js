import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

let store;
// 資料存在 sessionStorage（storage.js 的 DATA_STORAGE）；localStorage 另外模擬
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => {
    store[key] = String(value);
  },
  removeItem: (key) => {
    delete store[key];
  },
};

const svc = await import("../src/services/caseService.js");
const { FIXTURE_RESOURCES } = await import("./fixtures/resources.js");
const { FOLLOW_UP_START } = await import("../src/config/assessmentRules.js");
const { addMonths, todayString } = await import("../src/utils/date.js");

const WALKING = FIXTURE_RESOURCES.find((r) => r.code === "Res103"); // 黃燈（範例關懷據點歌唱班）
const MEAL = FIXTURE_RESOURCES.find((r) => r.code === "Res102");

const newCase = (patch = {}) => svc.createCase({ person: { name: "測試個案" }, ...patch });

beforeEach(() => {
  store = { resources: JSON.stringify(FIXTURE_RESOURCES) };
});

describe("新增、讀取、修改", () => {
  test("編碼 Case001 起依序產生，預設第 1 階段並寫入建立歷程", () => {
    const a = newCase();
    const b = newCase();
    assert.equal(a.code, "Case001");
    assert.equal(b.code, "Case002");
    assert.equal(a.stage, 1);
    assert.equal(a.history[0].action, "create");
    assert.deepEqual(svc.getCaseById(a.id).linkages, []);
  });

  test("修改為深層合併、陣列整個替換；id、編碼不可改", () => {
    const a = newCase({ consultation: { goals: ["目標一", "目標二"], note: "原本的備註" } });
    const updated = svc.updateCase(a.id, { code: "Case999", consultation: { goals: ["新目標"] } });
    assert.equal(updated.code, "Case001");
    assert.deepEqual(updated.consultation.goals, ["新目標"]);
    assert.equal(updated.consultation.note, "原本的備註");
  });

  test("身分證字號只存後四碼", () => {
    assert.equal(newCase({ person: { name: "x", nationalId: "B223456789" } }).person.nationalId, "6789");
  });

  test("資料損壞時以空陣列處理", () => {
    store.cases = "{壞掉";
    assert.deepEqual(svc.getAllCases(), []);
  });
});

describe("階段推進", () => {
  test("第 1→2 階段需同意轉介", () => {
    const a = newCase();
    assert.deepEqual(svc.advanceStage(a.id).reasons, ["需取得民眾同意轉介"]);
    svc.updateCase(a.id, { referral: { consent: true } });
    assert.equal(svc.advanceStage(a.id).case.stage, 2);
  });

  test("第 2→3 階段需「對我而言什麼最重要」與至少一個目標", () => {
    const a = newCase({ stage: 2 });
    assert.equal(svc.checkAdvance(a).reasons.length, 2);
    svc.updateCase(a.id, { consultation: { whatMatters: "想多出門", goals: ["  "] } });
    assert.deepEqual(svc.checkAdvance(svc.getCaseById(a.id)).reasons, ["需至少設定一個目標"]);
    svc.updateCase(a.id, { consultation: { goals: ["每週參加一次活動"] } });
    assert.equal(svc.advanceStage(a.id).case.stage, 3);
  });

  test("第 3→4 階段需最新一筆連結為成功", () => {
    const a = newCase({ stage: 3 });
    svc.addLinkage(a.id, { resourceId: MEAL.id });
    assert.equal(svc.advanceStage(a.id).ok, false);
    svc.updateLinkageStatus(a.id, { status: "success" });
    assert.equal(svc.advanceStage(a.id).case.stage, 4);
  });

  test("第 4→5 階段沒有條件；結案需原因與再入口說明", () => {
    const a = newCase({ stage: 4 });
    assert.equal(svc.advanceStage(a.id).case.stage, 5);
    assert.deepEqual(svc.closeCase(a.id, { reason: "goal_met" }).reasons, ["需勾選已說明再入口機制"]);
    const closed = svc.closeCase(a.id, { reason: "goal_met", reentryExplained: true, returnedToMedical: true });
    assert.equal(closed.case.stage, "closed");
    assert.equal(closed.case.closure.closedAt, todayString());
    assert.equal(closed.case.closure.returnedToMedical, true);
    assert.equal(svc.advanceStage(a.id).ok, false, "已結案不能再推進");
  });

  test("不在第 5 階段不能結案", () => {
    assert.equal(svc.closeCase(newCase({ stage: 3 }).id, { reason: "other", reentryExplained: true }).ok, false);
  });

  test("推進時寫入歷程", () => {
    const a = newCase({ referral: { consent: true } });
    const advanced = svc.advanceStage(a.id, { actor: "陳管理" }).case;
    assert.deepEqual(
      { stage: advanced.history.at(-1).stage, actor: advanced.history.at(-1).actor, action: advanced.history.at(-1).action },
      { stage: 2, actor: "陳管理", action: "advance" }
    );
  });
});

describe("連結與追蹤", () => {
  test("建立連結：記下資源名稱快照、黃燈資源預設需陪同、自動產生 1、3、6 個月追蹤", () => {
    assert.equal(FOLLOW_UP_START, "linked");
    const a = newCase({ stage: 3 });
    const updated = svc.addLinkage(a.id, { resourceId: WALKING.id, reason: "離家近" });
    const link = updated.linkages[0];
    assert.equal(link.resourceName, WALKING.name);
    assert.equal(link.escortNeeded, true);
    assert.equal(link.status, "pending");
    assert.equal(link.linkedAt, todayString());
    assert.deepEqual(
      updated.followUps.map((f) => [f.round, f.plannedAt]),
      [1, 3, 6].map((m) => [m, addMonths(todayString(), m)])
    );
    assert.match(updated.history.at(-1).note, /需健康管理員陪同/);
  });

  test("連結失敗建議退回諮詢，退回由頁面決定", () => {
    const a = newCase({ stage: 3 });
    svc.addLinkage(a.id, { resourceId: MEAL.id });
    const result = svc.updateLinkageStatus(a.id, { status: "failed", providerNote: "未出席" });
    assert.equal(result.suggestReturnToConsultation, true);
    assert.equal(result.case.stage, 3, "不自動退回");
    assert.equal(svc.returnToConsultation(a.id).stage, 2);
  });

  test("重新連結保留每一次嘗試；已完成的追蹤保留、未完成的重新排程", () => {
    const a = newCase({ stage: 3 });
    svc.addLinkage(a.id, { resourceId: MEAL.id });
    svc.recordFollowUp(a.id, 1, { impact: "same", attendance: "attended" });
    svc.updateLinkageStatus(a.id, { status: "failed" });
    const relinked = svc.addLinkage(a.id, { resourceId: WALKING.id });
    assert.deepEqual(relinked.linkages.map((l) => l.status), ["failed", "pending"]);
    assert.equal(relinked.followUps.filter((f) => f.doneAt).length, 1);
    assert.equal(relinked.followUps.filter((f) => !f.doneAt).length, 3);
  });

  test("記錄追蹤：填入對應的排程；影響為惡化時建議退回", () => {
    const a = newCase({ stage: 3 });
    svc.addLinkage(a.id, { resourceId: MEAL.id });
    const result = svc.recordFollowUp(a.id, 3, {
      doneAt: "2026-12-01",
      attendance: "absent",
      participation: "failed",
      impact: "worse",
      note: "最近沒去",
    });
    const round3 = result.case.followUps.find((f) => f.round === 3);
    assert.equal(round3.doneAt, "2026-12-01");
    assert.equal(round3.impact, "worse");
    assert.equal(result.suggestReturnToConsultation, true);
  });

  test("首次聯繫逾期：開案超過 72 小時且沒有 firstContactAt", () => {
    const a = newCase({ stage: 2 });
    const created = new Date(a.createdAt);
    const after = (hours) => new Date(created.getTime() + hours * 3_600_000);
    assert.equal(svc.isFirstContactOverdue(a, after(71)), false);
    assert.equal(svc.isFirstContactOverdue(a, after(73)), true);
    const contacted = svc.recordFirstContact(a.id);
    assert.equal(svc.isFirstContactOverdue(contacted, after(100)), false);
  });
});

describe("從評估開案的檢核", () => {
  const assessment = (review) => ({ id: "a1", code: "Ast001", person: { name: "王示範" }, answers: { q11: [] }, review });

  test("只有橘燈轉介或退縮且同意轉介才開案", () => {
    assert.equal(svc.openCaseFromAssessment(assessment({ light: "yellow", consent: true })).ok, false);
    assert.equal(svc.openCaseFromAssessment(assessment({ light: "orange", orangeType: "reserved", consent: true })).ok, false);
    assert.equal(svc.openCaseFromAssessment(assessment({ light: "orange", orangeType: "refer", consent: false })).ok, false);
    const ok = svc.openCaseFromAssessment(assessment({ light: "orange", orangeType: "hesitant", consent: true }));
    assert.equal(ok.ok, true);
    assert.equal(ok.case.stage, 2);
    assert.match(ok.case.referral.reason, /橘燈（退縮）/);
  });
});

describe("刪除與追蹤到期狀態", () => {
  test("刪除個案；由評估開案的個案不能刪除", () => {
    const a = newCase();
    assert.equal(svc.deleteCase(a.id).ok, true);
    assert.equal(svc.getCaseById(a.id), null);

    const fromAssessment = newCase({ referral: { assessmentId: "ast-1", assessmentCode: "Ast001" } });
    const result = svc.deleteCase(fromAssessment.id);
    assert.equal(result.ok, false);
    assert.match(result.reason, /Ast001/);
    assert.ok(svc.getCaseById(fromAssessment.id));
  });

  test("追蹤狀態：已完成、已到期（含當天）、尚未到期", () => {
    assert.equal(svc.getFollowUpStatus({ plannedAt: "2026-10-01", doneAt: "2026-10-02" }, "2026-10-14"), "done");
    assert.equal(svc.getFollowUpStatus({ plannedAt: "2026-10-14", doneAt: null }, "2026-10-14"), "due");
    assert.equal(svc.getFollowUpStatus({ plannedAt: "2026-10-01", doneAt: null }, "2026-10-14"), "due");
    assert.equal(svc.getFollowUpStatus({ plannedAt: "2026-11-01", doneAt: null }, "2026-10-14"), "upcoming");
    assert.equal(svc.getFollowUpStatus({ plannedAt: null, doneAt: null }), "unscheduled");
  });

  test("下一筆追蹤：最早一筆未完成的排程；已結案回傳 null", () => {
    const followUps = [
      { round: 1, plannedAt: "2026-10-01", doneAt: "2026-10-01" },
      { round: 6, plannedAt: "2027-03-01", doneAt: null },
      { round: 3, plannedAt: "2026-12-01", doneAt: null },
    ];
    assert.equal(svc.getNextFollowUp({ stage: 4, followUps }).round, 3);
    assert.equal(svc.getNextFollowUp({ stage: "closed", followUps }), null);
    assert.equal(svc.getNextFollowUp({ stage: 2, followUps: [] }), null);
  });
});

describe("刪除限制：只有第 1 階段、沒有連結與追蹤紀錄的個案可以刪除", () => {
  test("第 1 階段、沒有連結與追蹤：可以刪除", () => {
    assert.equal(svc.canDeleteCase(newCase()).ok, true);
  });

  test("個案列表傳入的卡片資料（caseRows）判斷結果與個案本身相同", async () => {
    const { caseRows } = await import("../src/services/listViews.js");
    const deletable = newCase();
    const blocked = newCase({ stage: 2 });
    const [row1, row2] = caseRows([deletable, blocked]);
    assert.equal(row1.deletable, true);
    assert.equal(svc.canDeleteCase(row1).ok, true);
    assert.equal(row2.deletable, false);
    assert.match(svc.canDeleteCase(row2).reason, /結案/);
    assert.equal(svc.deleteCase(row1.id).ok, true);
  });

  test("其他情況一律不能刪除，提示改用結案", () => {
    const cases = [
      newCase({ stage: 2 }),
      newCase({ stage: "closed" }),
      newCase({ linkages: [{ resourceId: "x", status: "failed" }] }),
      newCase({ followUps: [{ round: 1, plannedAt: "2026-11-01", doneAt: null }] }),
    ];
    for (const c of cases) {
      const check = svc.canDeleteCase(c);
      assert.equal(check.ok, false, JSON.stringify({ stage: c.stage }));
      assert.match(check.reason, /結案/);
      assert.equal(svc.deleteCase(c.id).ok, false);
      assert.ok(svc.getCaseById(c.id), "資料仍在");
    }
  });
});

test("完整流程：轉介 → 晤談 → 連結（失敗後重新連結）→ 追蹤 → 結案", () => {
  const actor = { actor: "高示範" };
  const c = newCase();

  // 1 轉介：未同意不能前進
  assert.equal(svc.advanceStage(c.id, actor).ok, false);
  svc.updateCase(c.id, { referral: { referrerType: "watcher", consent: true, consentAt: "2026-10-01T10:00:00+08:00" } });
  assert.equal(svc.advanceStage(c.id, actor).case.stage, 2);

  // 2 晤談
  svc.recordFirstContact(c.id, actor);
  svc.updateCase(c.id, { consultation: { whatMatters: "想多出門", goals: ["每週參加一次活動"], needTags: ["exercise"] } });
  assert.equal(svc.advanceStage(c.id, actor).case.stage, 3);

  // 3 連結：第一次失敗，重新連結後成功
  svc.addLinkage(c.id, { resourceId: MEAL.id, reason: "離家近" }, actor);
  assert.equal(svc.updateLinkageStatus(c.id, { status: "failed", providerNote: "未出席" }, actor).suggestReturnToConsultation, true);
  assert.equal(svc.advanceStage(c.id, actor).ok, false, "最新連結失敗不能前進");
  svc.addLinkage(c.id, { resourceId: WALKING.id }, actor);
  svc.updateLinkageStatus(c.id, { status: "success", attendance: "attended" }, actor);
  const linked = svc.advanceStage(c.id, actor).case;
  assert.equal(linked.stage, 4);
  assert.deepEqual(linked.linkages.map((l) => l.status), ["failed", "success"], "保留每次連結");
  assert.equal(linked.followUps.length, 3, "重新連結後重新排程");

  // 4 追蹤
  svc.recordFollowUp(c.id, 1, { attendance: "attended", participation: "success", impact: "improved" }, actor);
  assert.equal(svc.advanceStage(c.id, actor).case.stage, 5);

  // 5 結案
  assert.equal(svc.closeCase(c.id, { reason: "goal_met" }, actor).ok, false, "未勾再入口說明");
  const closed = svc.closeCase(c.id, { reason: "goal_met", reentryExplained: true }, actor).case;
  assert.equal(closed.stage, "closed");
  assert.ok(closed.history.length >= 10, "每一步都有歷程");
  assert.ok(closed.history.every((h) => h.actor === "高示範" || h.action === "create"));
});

test("追蹤到期只計算第 4 階段的個案", () => {
  const followUps = [{ round: 1, plannedAt: "2026-10-01", doneAt: null }];
  assert.equal(svc.isFollowUpDue({ stage: 4, followUps }, "2026-10-14"), true);
  assert.equal(svc.isFollowUpDue({ stage: 3, followUps }, "2026-10-14"), false, "第 3 階段排程尚未生效");
  assert.equal(svc.isFollowUpDue({ stage: 4, followUps }, "2026-09-30"), false, "尚未到期");
  assert.equal(svc.isFollowUpDue({ stage: "closed", followUps }, "2026-10-14"), false);
});

describe("資源端後台", () => {
  test("同一資源有待回報與已回報的個案：待回報排前面", () => {
    const done = newCase({ stage: 3 });
    svc.addLinkage(done.id, { resourceId: MEAL.id });
    svc.updateLinkageStatus(done.id, { status: "success" });
    const pending = newCase({ stage: 3 });
    svc.addLinkage(pending.id, { resourceId: MEAL.id });
    const rows = svc.getReferralsForResource(MEAL.id);
    assert.deepEqual(rows.map((r) => [r.caseItem.id, r.linkage.status]), [[pending.id, "pending"], [done.id, "success"]]);
  });

  test("個案已改連其他資源：舊資源只在舊連結仍待回報時列出", () => {
    const c = newCase({ stage: 3 });
    svc.addLinkage(c.id, { resourceId: MEAL.id });
    svc.addLinkage(c.id, { resourceId: WALKING.id });
    assert.equal(svc.getReferralsForResource(MEAL.id).length, 1, "舊連結仍待回報");
    svc.updateLinkageStatus(c.id, { index: 0, status: "failed" });
    assert.equal(svc.getReferralsForResource(MEAL.id).length, 0, "舊連結已回報，不再列出");
    assert.equal(svc.getReferralsForResource(WALKING.id).length, 1);
  });

  test("資源點回報失敗：寫入指定的連結與歷程（操作者為資源單位），不自動退回階段", () => {
    const c = newCase({ stage: 3 });
    svc.addLinkage(c.id, { resourceId: MEAL.id });
    const result = svc.updateLinkageStatus(
      c.id,
      { index: 0, status: "failed", providerNote: "家人不同意參加" },
      { actor: "範例食物銀行協會" }
    );
    assert.equal(result.case.stage, 3);
    assert.equal(result.case.linkages[0].status, "failed");
    const last = result.case.history.at(-1);
    assert.equal(last.actor, "範例食物銀行協會");
    assert.equal(last.note, "連結狀態更新：失敗｜家人不同意參加");
    assert.equal(result.suggestReturnToConsultation, true);
  });
});
