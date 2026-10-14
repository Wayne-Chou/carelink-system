import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

let store;
// 資料存在 sessionStorage（storage.js 的 DATA_STORAGE）；localStorage 另外模擬，供清除舊資料使用
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

const svc = await import("../src/services/assessmentService.js");
const { getCaseById } = await import("../src/services/caseService.js");
const rules = await import("../src/config/assessmentRules.js");

const ALL_YES = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`q${i + 1}`, "yes"]));
const fill = (patch = {}) =>
  svc.createAssessment({
    person: { name: "李示範", nationalId: "A123456789" },
    filledAt: "2026-10-01",
    answers: { ...ALL_YES, q11: [], q12: "" },
    ...patch,
  });
const reviewedAt = "2026-10-01T10:00:00+08:00";

beforeEach(() => {
  store = {};
});

describe("新增、讀取、修改", () => {
  test("編碼 Ast001 起依序產生，狀態為已填未判讀", () => {
    const a = fill();
    const b = fill();
    assert.equal(a.code, "Ast001");
    assert.equal(b.code, "Ast002");
    assert.equal(a.status, "filled");
    assert.deepEqual(svc.getAssessmentById(a.id).answers.q11, []);
  });

  test("身分證字號依 NATIONAL_ID_STORAGE 儲存（預設只存後四碼），畫面用遮罩", () => {
    assert.equal(rules.NATIONAL_ID_STORAGE, "last4");
    const a = fill();
    assert.equal(a.person.nationalId, "6789");
    assert.equal(JSON.stringify(store).includes("A123456789"), false, "localStorage 不含完整字號");
    assert.equal(svc.maskNationalId(a.person.nationalId), "******6789");
  });

  test("修改為深層合併、陣列整個替換，編碼不可改", () => {
    const a = fill({ answers: { ...ALL_YES, q11: ["q11_legal", "q11_housing"] } });
    const updated = svc.updateAssessment(a.id, { code: "Ast999", answers: { q1: "no", q11: ["q11_home"] } });
    assert.equal(updated.code, "Ast001");
    assert.equal(updated.answers.q1, "no");
    assert.equal(updated.answers.q2, "yes");
    assert.deepEqual(updated.answers.q11, ["q11_home"]);
  });

  test("資料損壞時以空陣列處理", () => {
    store.assessments = "{壞掉";
    assert.deepEqual(svc.getAllAssessments(), []);
  });
});

describe("判讀檢核", () => {
  test("必填：燈號、紅燈原因、橘燈類型、轉介或退縮的同意、保留的婉拒原因", () => {
    assert.ok(svc.validateReview({}).light);
    assert.ok(svc.validateReview({ light: "red" }).redReasons);
    assert.ok(svc.validateReview({ light: "orange" }).orangeType);
    assert.ok(svc.validateReview({ light: "orange", orangeType: "refer" }).consent);
    assert.ok(svc.validateReview({ light: "orange", orangeType: "hesitant", consent: false }).consent);
    assert.ok(svc.validateReview({ light: "orange", orangeType: "reserved" }).declineReason);
    assert.deepEqual(svc.validateReview({ light: "green" }), {});
  });

  test("檢核不通過時不儲存", () => {
    const a = fill();
    const result = svc.reviewAssessment(a.id, { light: "red" });
    assert.equal(result.ok, false);
    assert.equal(svc.getAssessmentById(a.id).status, "filled");
  });
});

describe("下次確認日期與後續處置", () => {
  test("黃燈 3 個月、綠燈 12 個月，以判讀日起算", () => {
    const y = svc.reviewAssessment(fill().id, { light: "yellow", reviewedAt }).assessment;
    const g = svc.reviewAssessment(fill().id, { light: "green", reviewedAt }).assessment;
    assert.equal(y.nextCheckAt, "2027-01-01");
    assert.equal(g.nextCheckAt, "2027-10-01");
    assert.equal(y.status, "reviewed");
  });

  test("紅燈不開案、沒有下次確認日期", () => {
    const r = svc.reviewAssessment(fill().id, {
      light: "red",
      redReasons: ["suicide"],
      redReferredTo: "精神科",
      reviewedAt,
    });
    assert.equal(r.ok, true);
    assert.equal(r.case, null);
    assert.equal(r.assessment.nextCheckAt, null);
    assert.equal(r.assessment.caseId, null);
  });

  test("橘燈保留：下次來院時再確認；連續婉拒 3 次後延長為 6 個月", () => {
    const reserved = { light: "orange", orangeType: "reserved", declineReason: "想先自己試試", reviewedAt };
    let previous = null;
    const results = [];
    for (let i = 0; i < 3; i++) {
      const a = fill({ previousAssessmentId: previous });
      const r = svc.reviewAssessment(a.id, reserved).assessment;
      results.push(r);
      previous = r.id;
    }
    assert.deepEqual(results.map((r) => r.declineCount), [1, 2, 3]);
    assert.deepEqual(results.map((r) => r.nextCheckAt), [null, null, "2027-04-01"]);
    assert.ok(results.every((r) => r.caseId === null), "保留不開案");
  });

  test("婉拒中斷後重新計算：前一筆不是保留就從 1 開始", () => {
    const green = svc.reviewAssessment(fill().id, { light: "green", reviewedAt }).assessment;
    const a = fill({ previousAssessmentId: green.id });
    const r = svc.reviewAssessment(a.id, { light: "orange", orangeType: "reserved", declineReason: "x" });
    assert.equal(r.assessment.declineCount, 1);
  });

  test("評估歷程沿 previousAssessmentId 由新到舊", () => {
    const first = fill();
    const second = fill({ previousAssessmentId: first.id });
    assert.deepEqual(svc.getAssessmentChain(second).map((a) => a.code), ["Ast002", "Ast001"]);
  });
});

describe("橘燈轉介與退縮自動開案", () => {
  for (const orangeType of ["refer", "hesitant"]) {
    test(`橘燈${orangeType === "refer" ? "轉介" : "退縮"}：開案並回寫 caseId、狀態改為已完成後續`, () => {
      const a = fill({ answers: { ...ALL_YES, q11: ["q11_talk", "q11_financial"], q12: "家裡開銷很吃緊" } });
      const r = svc.reviewAssessment(
        a.id,
        {
          light: "orange",
          orangeType,
          consent: true,
          readerName: "王示範醫師",
          q12Note: "先生住院後收入減少",
          confirmedTags: ["financial_aid", "food"],
          reviewedAt,
        },
        { managerName: "陳管理", openCase: true }
      );
      assert.equal(r.ok, true);
      assert.equal(r.assessment.status, "closed");
      assert.equal(r.assessment.caseId, r.case.id);

      const c = getCaseById(r.case.id);
      assert.equal(c.code, "Case001");
      assert.equal(c.stage, 2, "直接進入第 2 階段");
      assert.equal(c.managerName, "陳管理");
      assert.equal(c.referral.assessmentId, a.id);
      assert.equal(c.referral.assessmentCode, "Ast001");
      assert.equal(c.referral.referrerName, "王示範醫師");
      assert.equal(c.referral.consent, true);
      assert.equal(c.referral.consentAt, reviewedAt);
      assert.match(c.referral.reason, /Ast001/);
      assert.deepEqual(c.consultation.needTags, ["financial_aid", "food"]);
      assert.match(c.consultation.note, /家裡開銷很吃緊/);
      assert.match(c.consultation.note, /先生住院後收入減少/);
      assert.equal(c.person.nationalId, "6789");
      assert.ok(c.history.some((h) => h.action === "open_from_assessment"));
    });
  }

  test("已開過案時不重複建立", () => {
    const a = fill();
    const review = { light: "orange", orangeType: "refer", consent: true, reviewedAt };
    const first = svc.reviewAssessment(a.id, review, { openCase: true });
    const again = svc.openCaseForAssessment(a.id);
    assert.equal(again.case.id, first.case.id);
    assert.equal(JSON.parse(store.cases).length, 1);
  });

  test("黃燈、綠燈、橘燈保留不開案", () => {
    svc.reviewAssessment(fill().id, { light: "yellow" });
    svc.reviewAssessment(fill().id, { light: "green" });
    svc.reviewAssessment(fill().id, { light: "orange", orangeType: "reserved", declineReason: "x" });
    assert.equal(store.cases, undefined);
  });
});

describe("AUTO_OPEN_CASE：自動開案與補開案", () => {
  const refer = { light: "orange", orangeType: "refer", consent: true, reviewedAt };

  test("目前設定為 true：判讀橘燈轉介時直接開案", () => {
    assert.equal(rules.AUTO_OPEN_CASE, true);
    const r = svc.reviewAssessment(fill().id, refer);
    assert.equal(r.caseDeferred, false);
    assert.equal(r.case.code, "Case001");
    assert.equal(r.assessment.caseId, r.case.id);
  });

  test("關閉時（openCase: false）：儲存判讀但不開案，狀態維持已判讀", () => {
    const r = svc.reviewAssessment(fill().id, refer, { openCase: false });
    assert.equal(r.case, null);
    assert.equal(r.caseDeferred, true);
    assert.equal(r.assessment.status, "reviewed");
    assert.equal(store.cases, undefined, "不寫入個案資料");
  });

  test("待開案清單：只列出橘燈轉介或退縮、已同意且尚未開案的評估", () => {
    const opts = { openCase: false };
    const a = fill();
    const b = fill();
    svc.reviewAssessment(a.id, refer, opts);
    svc.reviewAssessment(b.id, { light: "orange", orangeType: "hesitant", consent: true }, opts);
    svc.reviewAssessment(fill().id, { light: "orange", orangeType: "reserved", declineReason: "x" }, opts);
    svc.reviewAssessment(fill().id, { light: "yellow" }, opts);
    assert.deepEqual(svc.getPendingCaseOpenings().map((x) => x.code), ["Ast001", "Ast002"]);
    svc.openCaseForAssessment(a.id);
    assert.deepEqual(svc.getPendingCaseOpenings().map((x) => x.code), ["Ast002"]);
  });

  test("補開案：替先前尚未開案的評估開案，帶入評估編碼並進入第 2 階段；重複執行不會重複開案", async () => {
    const { getAllCases } = await import("../src/services/caseService.js");
    const a = fill();
    const b = fill();
    svc.reviewAssessment(a.id, refer, { openCase: false });
    svc.reviewAssessment(b.id, { light: "orange", orangeType: "hesitant", consent: true }, { openCase: false });

    const result = svc.openPendingCases();
    assert.deepEqual(result.opened, [
      { assessmentCode: "Ast001", caseCode: "Case001" },
      { assessmentCode: "Ast002", caseCode: "Case002" },
    ]);
    assert.deepEqual(result.failed, []);
    const cases = getAllCases();
    assert.deepEqual(cases.map((c) => [c.referral.assessmentCode, c.stage]), [["Ast001", 2], ["Ast002", 2]]);
    assert.equal(cases[0].history.at(-1).actor, "系統補開案");
    assert.equal(svc.getAssessmentById(a.id).status, "closed");

    assert.deepEqual(svc.openPendingCases(), { opened: [], failed: [] }, "第二次執行沒有待開案");
    assert.equal(getAllCases().length, 2);
  });

  test("補開案跳過已作廢的評估；設定關閉時不執行", () => {
    const a = fill();
    svc.reviewAssessment(a.id, refer, { openCase: false });
    assert.deepEqual(svc.openPendingCases({ enabled: false }), { opened: [], failed: [] });
    svc.voidAssessment(a.id, { reason: "誤判" });
    assert.deepEqual(svc.openPendingCases(), { opened: [], failed: [] });
    assert.equal(store.cases, undefined);
  });

  test("其他燈號不開案也不標示延後開案", () => {
    const r = svc.reviewAssessment(fill().id, { light: "green" });
    assert.equal(r.case, null);
    assert.equal(r.caseDeferred, false);
  });
});

describe("評估列表排序與顯示", () => {
  const item = (code, status, filledAt, reviewedAt = null) => ({
    code,
    status,
    filledAt,
    createdAt: `${filledAt}T09:00:00+08:00`,
    review: { reviewedAt },
  });

  test("未判讀的排最前面且等最久的在上，其餘依判讀時間由新到舊", () => {
    const sorted = svc.sortForList([
      item("Ast001", "reviewed", "2026-09-01", "2026-09-02T10:00:00+08:00"),
      item("Ast002", "filled", "2026-10-03"),
      item("Ast003", "closed", "2026-09-20", "2026-09-21T10:00:00+08:00"),
      item("Ast004", "filled", "2026-10-01"),
    ]);
    assert.deepEqual(sorted.map((a) => a.code), ["Ast004", "Ast002", "Ast003", "Ast001"]);
  });

  test("不修改傳入的陣列", () => {
    const list = [item("Ast001", "reviewed", "2026-09-01"), item("Ast002", "filled", "2026-10-01")];
    svc.sortForList(list);
    assert.deepEqual(list.map((a) => a.code), ["Ast001", "Ast002"]);
  });

  test("待開案標記", () => {
    const a = fill();
    svc.reviewAssessment(a.id, { light: "orange", orangeType: "refer", consent: true }, { openCase: false });
    assert.equal(svc.isPendingCaseOpening(svc.getAssessmentById(a.id)), true);
  });

  test("燈號顯示文字", async () => {
    const { formatLight } = await import("../src/config/assessmentLabels.js");
    assert.equal(formatLight("orange", "hesitant"), "🟠 橘燈（退縮）");
    assert.equal(formatLight("green"), "🟢 綠燈");
    assert.equal(formatLight(""), "");
  });
});

describe("作廢", () => {
  test("必須填寫原因；記錄作廢時間、操作者，清除下次確認日期", () => {
    const a = svc.reviewAssessment(fill().id, { light: "yellow", reviewedAt }).assessment;
    assert.equal(a.nextCheckAt, "2027-01-01");
    assert.deepEqual(svc.voidAssessment(a.id, { reason: "  " }).errors, { voidReason: "請填寫作廢原因" });

    const r = svc.voidAssessment(a.id, { reason: "重複填寫", actor: "王示範醫師" });
    assert.equal(r.ok, true);
    assert.equal(r.assessment.status, "voided");
    assert.equal(r.assessment.voidReason, "重複填寫");
    assert.equal(r.assessment.voidedBy, "王示範醫師");
    assert.ok(r.assessment.voidedAt);
    assert.equal(r.assessment.nextCheckAt, null);
    assert.equal(svc.calcNextCheckAt(r.assessment), null);
    assert.equal(svc.getAllAssessments().length, 1, "不刪除資料");
  });

  test("已開案的評估不能作廢，已作廢的不能再作廢", () => {
    const a = fill();
    svc.reviewAssessment(a.id, { light: "orange", orangeType: "refer", consent: true }, { openCase: true });
    const opened = svc.getAssessmentById(a.id);
    assert.equal(svc.canVoid(opened).ok, false);
    assert.match(svc.canVoid(opened).reason, /已經開案/);
    assert.equal(svc.voidAssessment(a.id, { reason: "x" }).ok, false);

    const b = fill();
    svc.voidAssessment(b.id, { reason: "誤建" });
    assert.match(svc.canVoid(svc.getAssessmentById(b.id)).reason, /已經作廢/);
  });

  test("已作廢的評估不能判讀，也不能開案", () => {
    const a = fill();
    svc.voidAssessment(a.id, { reason: "填錯對象" });
    assert.equal(svc.reviewAssessment(a.id, { light: "green" }).ok, false);
    assert.equal(svc.openCaseForAssessment(a.id).ok, false);
  });

  test("待開案清單不含已作廢的評估", () => {
    const a = fill();
    svc.reviewAssessment(a.id, { light: "orange", orangeType: "refer", consent: true }, { openCase: false });
    assert.equal(svc.getPendingCaseOpenings().length, 1);
    svc.voidAssessment(a.id, { reason: "誤判" });
    assert.equal(svc.getPendingCaseOpenings().length, 0);
  });

  test("婉拒次數跳過已作廢的前一筆，接續更早的有效紀錄", () => {
    const reserved = { light: "orange", orangeType: "reserved", declineReason: "再想想", reviewedAt };
    const first = svc.reviewAssessment(fill().id, reserved).assessment; // 1
    const wrong = svc.reviewAssessment(fill({ previousAssessmentId: first.id }).id, reserved).assessment; // 2
    svc.voidAssessment(wrong.id, { reason: "重複填寫" });
    const third = svc.reviewAssessment(fill({ previousAssessmentId: wrong.id }).id, reserved).assessment;
    assert.equal(third.declineCount, 2, "作廢的那筆不算，接在第一筆後面");
  });

  test("列表排序：已作廢的排最後", () => {
    const voided = fill();
    const filled = fill();
    svc.voidAssessment(voided.id, { reason: "誤建" });
    const reviewed = svc.reviewAssessment(fill().id, { light: "green" }).assessment;
    assert.deepEqual(
      svc.sortForList(svc.getAllAssessments()).map((a) => a.id),
      [filled.id, reviewed.id, voided.id]
    );
  });

  test("isActiveAssessment 供待辦等功能排除已作廢的評估", () => {
    const a = fill();
    assert.equal(svc.isActiveAssessment(a), true);
    svc.voidAssessment(a.id, { reason: "誤建" });
    assert.equal(svc.isActiveAssessment(svc.getAssessmentById(a.id)), false);
  });
});

describe("黃燈程序", () => {
  test("黃燈儲存當場提供的資源與是否請專人陪同", () => {
    const r = svc.reviewAssessment(fill().id, {
      light: "yellow",
      confirmedTags: ["exercise"],
      providedResources: ["res-1", "res-2"],
      escortOffered: true,
      reviewedAt,
    });
    assert.equal(r.ok, true);
    assert.deepEqual(r.assessment.review.providedResources, ["res-1", "res-2"]);
    assert.equal(r.assessment.review.escortOffered, true);
    assert.equal(r.case, null, "黃燈不開案");
    assert.equal(r.assessment.nextCheckAt, "2027-01-01", "3 個月後確認是否前往");
  });

  test("修改判讀時提供的資源整個替換", () => {
    const a = fill();
    svc.reviewAssessment(a.id, { light: "yellow", providedResources: ["res-1", "res-2"] });
    const r = svc.reviewAssessment(a.id, { light: "yellow", providedResources: ["res-3"] });
    assert.deepEqual(r.assessment.review.providedResources, ["res-3"]);
  });
});
