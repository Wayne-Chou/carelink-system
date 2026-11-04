// 守望員轉介（doc/specs/referral-schema.md）：權限、轉介單的狀態變化、開案後個案在第 1 階段、申請帳號、待辦
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const svc = await import("../src/services/referralService.js");
const caseSvc = await import("../src/services/caseService.js");
const accountSvc = await import("../src/services/accountService.js");
const auth = await import("../src/utils/auth.js");
const { computeTodos } = await import("../src/services/todoService.js");
const {
  adminMenuFor,
  canOpenRoute,
  checkRouteAccess,
  filterTodosFor,
  homePathFor,
  navigationRedirect,
} = await import("../src/services/accessControl.js");
const { DEMO_ACCOUNTS, ROLE_CODES } = await import("../src/config/roles.js");
const { ROUTE_ACCESS, routeMeta } = await import("../src/router/access.js");
const { pathOf } = await import("../src/router/routes.js");
const { resolvePath } = await import("./helpers/routing.js");

const user = (role) => DEMO_ACCOUNTS.find((a) => a.role === role);
const WATCHER = user("watcher");
const MANAGER = user("manager");
const ADMIN = user("admin");
const WATCHER_PAGES = ["referral-new", "my-referrals"];
const route = (name, params = {}) => ({ name, params, fullPath: pathOf(name, { id: "x", ...params }), matched: [{}], meta: routeMeta(name) });
const allowed = (u, name) => checkRouteAccess(route(name), u).ok;

// 一份完整的轉介單
const form = (patch = {}) => ({
  person: { name: "林範例（虛構民眾）", phone: "0900-000-401", city: "花蓮縣", district: "吉安鄉", ageGroup: "senior" },
  situations: ["alone", "mobility"],
  description: "腳受傷後很少出門，家人在外地工作",
  informed: "unsure",
  ...patch,
});
const submit = (patch, watcher = WATCHER) => svc.submitReferral(form(patch), watcher);

beforeEach(() => {
  session.data = {};
});

describe("權限", () => {
  test("守望員只能進入轉介民眾與我的轉介；其他後台頁面（含直接輸入網址）一律擋下", () => {
    for (const name of Object.keys(ROUTE_ACCESS)) {
      assert.equal(allowed(WATCHER, name), WATCHER_PAGES.includes(name), name);
    }
    const redirect = navigationRedirect(route("cases"), WATCHER);
    assert.deepEqual(redirect, { path: "/admin/referrals", query: { denied: "1" } }, "沒有權限：回到我的轉介並提示");
  });

  test("其他角色都不能進入守望員的兩個頁面", () => {
    for (const role of ROLE_CODES.filter((r) => r !== "watcher")) {
      for (const name of WATCHER_PAGES) assert.equal(allowed(user(role), name), false, `${role} ${name}`);
    }
  });

  test("守望員沒有後台首頁與待辦：登入後直接進入我的轉介；打開後台首頁不提示、直接進入", () => {
    assert.equal(homePathFor(WATCHER), "/admin/referrals");
    assert.equal(allowed(WATCHER, "admin-home"), false);
    assert.equal(allowed(WATCHER, "todo"), false);
    assert.deepEqual(navigationRedirect(route("admin-home"), WATCHER), { path: "/admin/referrals" });
  });

  test("守望員的左側選單只有「轉介民眾」「我的轉介」", () => {
    assert.deepEqual(adminMenuFor(WATCHER).map((m) => [m.label, m.path]), [
      ["轉介民眾", "/admin/referrals/new"],
      ["我的轉介", "/admin/referrals"],
    ]);
  });

  test("守望員轉介列表與轉介單：只有健康管理員與系統管理員", () => {
    for (const name of ["referrals", "referral-detail"]) {
      const result = ROLE_CODES.map((role) => allowed(user(role), name));
      assert.deepEqual(result, ROLE_CODES.map((r) => ["admin", "manager"].includes(r)), name);
    }
  });

  test("網址：轉介單在個案管理底下，不會被當成個案頁的 :id", () => {
    assert.equal(resolvePath("/admin/cases/referrals").name, "referrals");
    assert.equal(resolvePath("/admin/cases/referrals/r1").name, "referral-detail");
    assert.equal(resolvePath("/admin/cases/c1").name, "case-detail");
    assert.equal(resolvePath("/admin/referrals/new").name, "referral-new");
    assert.equal(resolvePath("/admin/referrals").name, "my-referrals");
    assert.equal(canOpenRoute(resolvePath("/admin/referrals/new"), MANAGER), false);
  });
});

describe("送出轉介單", () => {
  test("必填：姓名、聯絡電話、發現的狀況、狀況說明", () => {
    const result = svc.submitReferral(svc.createEmptyReferralForm(), WATCHER);
    assert.equal(result.ok, false);
    assert.deepEqual(Object.keys(result.errors).sort(), ["description", "person.name", "person.phone", "situations"]);
    assert.equal(submit({ person: { ...form().person, phone: "123" } }).errors["person.phone"].startsWith("電話格式不正確"), true);
    assert.ok(submit({ person: { ...form().person, district: "板橋區" } }).errors["person.district"], "行政區要屬於所選縣市");
    assert.equal(submit({ informed: "", person: { name: "甲範例", phone: "03-0000-0001" } }).ok, true, "其他欄位選填，市話也可以");
  });

  test("編碼 Ref001 起、三位數流水號；狀態「已送出」；帶入守望員的姓名、單位、身分類別與電話", () => {
    const first = submit().referral;
    const second = submit().referral;
    assert.deepEqual([first.code, second.code], ["Ref001", "Ref002"]);
    assert.equal(first.status, "submitted");
    assert.deepEqual(first.watcher, {
      name: WATCHER.name,
      email: WATCHER.email,
      phone: WATCHER.phone,
      unit: "示範里辦公處（虛構）",
      identity: "里長",
    });
    assert.deepEqual(first.situations, ["alone", "mobility"]);
    assert.equal(first.caseId, null);
  });

  test("資料存在 sessionStorage 的 referrals", () => {
    submit();
    assert.equal(JSON.parse(session.data.referrals).length, 1);
  });
});

describe("我的轉介（守望員）", () => {
  test("只列出自己送出的轉介單，只有編碼、姓名、送出日期與狀態", () => {
    submit();
    submit({}, { name: "另一位範例", email: "other-watcher@example.com" });
    const rows = svc.myReferralRows(WATCHER.email);
    assert.equal(rows.length, 1);
    assert.deepEqual(Object.keys(rows[0]).sort(), ["closedDate", "code", "declineReasonText", "id", "personName", "status", "statusText", "submittedDate"].sort());
    assert.equal(rows[0].statusText, "已送出");
    assert.deepEqual(svc.myReferralRows(""), []);
  });

  test("未開案時只顯示原因類別，看不到健康管理員的說明", () => {
    const { referral } = submit();
    svc.declineReferral(referral.id, { reason: "unreachable", note: "電話三次未接" }, { actor: MANAGER.name });
    const [row] = svc.myReferralRows(WATCHER.email);
    assert.equal(row.statusText, "未開案");
    assert.equal(row.declineReasonText, "聯繫不上");
    assert.equal(JSON.stringify(row).includes("電話三次未接"), false);
  });

  test("頁面只用 myReferralRows，不讀取轉介單全部內容或個案", () => {
    const source = readFileSync(new URL("../src/pages/MyReferrals.vue", import.meta.url), "utf8");
    assert.match(source, /myReferralRows/);
    assert.doesNotMatch(source, /getAllReferrals|getReferralById|caseService|sessionStorage|localStorage/);
  });
});

describe("狀態變化（健康管理員）", () => {
  test("已送出 → 打開轉介單後為處理中（再打開不變）", () => {
    const { referral } = submit();
    const opened = svc.markProcessing(referral.id, { actor: MANAGER.name });
    assert.equal(opened.referral.status, "processing");
    assert.equal(svc.markProcessing(referral.id, { actor: MANAGER.name }).referral.history.length, 2, "已是處理中，不再多記一筆");
    assert.equal(svc.myReferralRows(WATCHER.email)[0].statusText, "處理中");
  });

  test("開案：建立個案（來源守望員轉介、連結轉介單編碼），從第 1 階段開始、尚未取得同意；轉介單為已開案", () => {
    const { referral } = submit();
    const result = svc.openCaseForReferral(referral.id, { actor: MANAGER.name, managerName: MANAGER.name });
    assert.equal(result.ok, true);
    const c = caseSvc.getCaseById(result.case.id);
    assert.equal(c.stage, 1);
    assert.equal(c.code, "Case001");
    assert.equal(c.managerName, MANAGER.name);
    assert.deepEqual(c.person.name, "林範例（虛構民眾）");
    assert.equal(c.person.phone, "0900-000-401");
    assert.equal(c.referral.referrerType, "watcher");
    assert.equal(c.referral.referralId, referral.id);
    assert.equal(c.referral.referralCode, "Ref001");
    assert.equal(c.referral.consent, false);
    assert.match(c.referral.reason, /守望員轉介 Ref001：獨居或缺少照顧、行動不便/);
    assert.ok(c.history.some((h) => h.action === "open_from_referral"));

    const updated = svc.getReferralById(referral.id);
    assert.equal(updated.status, "opened");
    assert.equal(updated.caseId, c.id);
    assert.equal(updated.caseCode, "Case001");
    assert.equal(svc.myReferralRows(WATCHER.email)[0].statusText, "已開案");
  });

  test("守望員轉介的個案：需取得同意才能進入第 2 階段；不能刪除", () => {
    const { referral } = submit();
    const { case: c } = svc.openCaseForReferral(referral.id, { actor: MANAGER.name });
    assert.deepEqual(caseSvc.checkAdvance(c).reasons, ["需取得民眾同意轉介"]);
    caseSvc.updateCase(c.id, { referral: { consent: true, consentAt: "2026-11-03T10:00:00+08:00" } });
    assert.equal(caseSvc.advanceStage(c.id).case.stage, 2);
    const another = svc.openCaseForReferral(submit().referral.id).case;
    assert.match(caseSvc.canDeleteCase(another).reason, /由守望員轉介 Ref002 開案的個案不能刪除/);
  });

  test("開案後沿用首次聯繫規則：開案超過 72 小時未聯繫即逾期", () => {
    const { case: c } = svc.openCaseForReferral(submit().referral.id);
    const later = new Date(new Date(c.createdAt).getTime() + 73 * 3_600_000);
    assert.equal(caseSvc.isFirstContactOverdue(c, later), true);
  });

  test("不開案：必選原因，可填說明；轉介單為未開案，不建立個案", () => {
    const { referral } = submit();
    assert.deepEqual(svc.declineReferral(referral.id, {}).errors, { reason: "請選擇不開案的原因" });
    const result = svc.declineReferral(referral.id, { reason: "has_service" }, { actor: MANAGER.name });
    assert.equal(result.ok, true);
    assert.equal(result.referral.status, "declined");
    assert.deepEqual([result.referral.decision.reason, result.referral.decision.note], ["has_service", ""]);
    assert.equal(caseSvc.getAllCases().length, 0);
  });

  test("已決定的轉介單不能再開案或不開案", () => {
    const { referral } = submit();
    svc.declineReferral(referral.id, { reason: "refused" });
    assert.equal(svc.openCaseForReferral(referral.id).error, "這張轉介單已是「未開案」，不能再變更");
    const other = submit().referral;
    svc.openCaseForReferral(other.id);
    assert.equal(svc.declineReferral(other.id, { reason: "other" }).error, "這張轉介單已是「已開案」，不能再變更");
    assert.equal(caseSvc.getAllCases().length, 1);
  });
});

describe("待辦：守望員轉介待處理", () => {
  test("已送出、處理中列出；已開案、未開案不列出；連到轉介單", () => {
    const a = submit().referral;
    const b = submit().referral;
    const c = submit().referral;
    svc.markProcessing(b.id);
    svc.declineReferral(c.id, { reason: "other" });
    const todos = computeTodos({ assessments: [], cases: [], resources: [], applications: [] });
    assert.deepEqual(todos.map((t) => [t.type, t.code]), [["watcher_referral", "Ref001"], ["watcher_referral", "Ref002"]]);
    assert.equal(todos[0].typeLabel, "守望員轉介待處理");
    assert.equal(todos[0].link, `/admin/cases/referrals/${a.id}`);
    assert.equal(todos[0].dueDate, null, "不新增時間規則");
  });

  test("健康管理員看得到；系統管理員在「全部」「健康管理員」看得到；判讀人員、守望員看不到", () => {
    submit();
    const todos = computeTodos({ assessments: [], cases: [], resources: [], applications: [] });
    assert.equal(filterTodosFor(MANAGER, todos).length, 1);
    assert.equal(filterTodosFor(ADMIN, todos, "all").length, 1);
    assert.equal(filterTodosFor(ADMIN, todos, "manager").length, 1);
    assert.equal(filterTodosFor(user("reader"), todos).length, 0);
    assert.equal(filterTodosFor(WATCHER, todos, "all").length, 0);
  });
});

describe("帳號：守望員的申請、建立與審核", () => {
  const application = (details) => {
    const f = accountSvc.createEmptyApplication();
    Object.assign(f, {
      name: "吳範例",
      email: "wu-watcher@example.com",
      phone: "0900-000-501",
      organization: "範例社區關懷據點",
      jobTitle: "志工",
      role: "watcher",
      supervisorName: "張範例",
      supervisorContact: "03-0000-0002",
      reason: "協助關懷社區長者",
      consent: true,
    });
    Object.assign(f.details.watcher, details);
    return f;
  };

  test("申請：所屬單位或社區、身分類別必填；選「其他」時說明也必填", () => {
    const missing = accountSvc.validateApplication(application({}));
    assert.deepEqual(Object.keys(missing).sort(), ["details.watcher.identityType", "details.watcher.unit"]);
    const other = accountSvc.validateApplication(application({ unit: "範例里", identityType: "other" }));
    assert.deepEqual(Object.keys(other), ["details.watcher.identityOther"]);
    assert.deepEqual(accountSvc.validateApplication(application({ unit: "範例里", identityType: "volunteer" })), {});
  });

  test("送出後待審核；沒選「其他」時不保留說明；審核通過後可以登入守望員", () => {
    const sent = accountSvc.submitApplication(application({ unit: "範例社區關懷據點", identityType: "volunteer", identityOther: "殘留文字" }));
    assert.equal(sent.ok, true);
    assert.deepEqual(sent.account.details, { unit: "範例社區關懷據點", identityType: "volunteer", identityOther: "" });
    const reviewed = accountSvc.reviewAccount(sent.account.id, { decision: "approve", methods: ["phone"] }, ADMIN);
    assert.equal(reviewed.ok, true);
    auth.saveUsers(auth.getUsers().map((u) => ({ ...u, password: "abc12345" })));
    const login = auth.login({ email: "wu-watcher@example.com", password: "abc12345" });
    assert.equal(login.ok, true);
    assert.equal(homePathFor(auth.getCurrentUser()), "/admin/referrals");

    const { referral } = svc.submitReferral(form(), auth.getCurrentUser());
    assert.deepEqual(referral.watcher, {
      name: "吳範例",
      email: "wu-watcher@example.com",
      phone: "0900-000-501",
      unit: "範例社區關懷據點",
      identity: "志工",
    });
  });

  test("系統管理員建立守望員：手機、所屬單位、身分類別必填；建立後可停用", () => {
    const f = { ...accountSvc.createEmptyAccountForm(), name: "鄭範例", email: "zheng@example.com", role: "watcher" };
    const errors = accountSvc.createAccount(f, ADMIN).errors;
    assert.deepEqual(Object.keys(errors).sort(), ["phone", "watcher.identityType", "watcher.unit"]);
    const created = accountSvc.createAccount(
      { ...f, phone: "0900-000-502", watcher: { unit: "範例里辦公處", identityType: "other", identityOther: "里幹事" } },
      ADMIN
    );
    assert.equal(created.ok, true);
    assert.deepEqual(created.account.details, { unit: "範例里辦公處", identityType: "other", identityOther: "里幹事" });
    const suspended = accountSvc.suspendAccount(created.account.id, { reason: "已不再擔任" }, ADMIN);
    assert.equal(suspended.ok, true);
    assert.equal(suspended.account.status, "suspended");
  });
});

describe("個案結案：轉介單改為已結案", () => {
  // 開案 → 取得同意 → 依序推進到第 5 階段 → 結案
  function closeReferralCase(referralId) {
    const { case: c } = svc.openCaseForReferral(referralId, { actor: MANAGER.name });
    caseSvc.updateCase(c.id, {
      referral: { consent: true },
      consultation: { whatMatters: "能出門走走", goals: ["每週出門一次"] },
      linkages: [{ resourceId: "r1", resourceName: "範例資源", status: "success" }],
    });
    for (let i = 0; i < 4; i += 1) assert.equal(caseSvc.advanceStage(c.id).ok, true);
    const closed = caseSvc.closeCase(c.id, { reason: "goal_met", reentryExplained: true }, { actor: MANAGER.name });
    assert.equal(closed.ok, true);
    return closed.case;
  }

  test("由守望員轉介開案的個案結案後，轉介單為已結案並記錄結案日期與歷程", () => {
    const { referral } = submit();
    const c = closeReferralCase(referral.id);
    const updated = svc.getReferralById(referral.id);
    assert.equal(updated.status, "closed");
    assert.equal(updated.closedAt, c.closure.closedAt);
    assert.deepEqual(updated.history.at(-1).action, "case_closed");
    assert.match(updated.history.at(-1).note, /Case001 結案/);
  });

  test("守望員只看到已結案與結案日期，看不到結案原因", () => {
    const { referral } = submit();
    const c = closeReferralCase(referral.id);
    const [row] = svc.myReferralRows(WATCHER.email);
    assert.equal(row.statusText, "已結案");
    assert.equal(row.closedDate, c.closure.closedAt);
    assert.equal(row.declineReasonText, "");
    const text = JSON.stringify(row);
    for (const hidden of ["goal_met", "達成目標", "能出門走走"]) assert.equal(text.includes(hidden), false, hidden);
  });

  test("已結案不算待處理，不出現在待辦，也不能再開案或不開案", () => {
    const { referral } = submit();
    closeReferralCase(referral.id);
    const todos = computeTodos({ assessments: [], cases: [], resources: [], applications: [] });
    assert.equal(todos.filter((t) => t.type === "watcher_referral").length, 0);
    assert.deepEqual(svc.getPendingReferrals(), []);
    assert.equal(svc.declineReferral(referral.id, { reason: "other" }).error, "這張轉介單已是「已結案」，不能再變更");
  });

  test("由評估開案或直接新增的個案結案時，不影響任何轉介單", () => {
    const opened = submit().referral;
    svc.openCaseForReferral(opened.id);
    const waiting = submit().referral;
    const before = svc.getAllReferrals();
    const c = caseSvc.createCase({ referral: { assessmentId: "ast-1", assessmentCode: "Ast001", consent: true } });
    caseSvc.updateCase(c.id, {
      consultation: { whatMatters: "睡得好", goals: ["規律作息"] },
      linkages: [{ resourceId: "r1", resourceName: "範例資源", status: "success" }],
    });
    for (let i = 0; i < 4; i += 1) caseSvc.advanceStage(c.id);
    assert.equal(caseSvc.closeCase(c.id, { reason: "goal_met", reentryExplained: true }).ok, true);
    assert.deepEqual(svc.getAllReferrals(), before);
    assert.deepEqual([svc.getReferralById(opened.id).status, svc.getReferralById(waiting.id).status], ["opened", "submitted"]);
  });

  test("系統沒有重新開啟個案：已結案的個案不能退回第 2 階段，轉介單維持已結案", () => {
    const { referral } = submit();
    const c = closeReferralCase(referral.id);
    assert.equal(caseSvc.returnToConsultation(c.id), null);
    assert.equal(caseSvc.getCaseById(c.id).stage, "closed");
    assert.equal(svc.getReferralById(referral.id).status, "closed");
  });
});
