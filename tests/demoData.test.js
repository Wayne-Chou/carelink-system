// 示範資料（「?」選單的「載入示範資料」）：一位虛構民眾從評估到轉介的一串資料
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const { DEMO_NAMES, findDemoData, loadDemoData, countData } = await import("../src/services/demoData.js");
const { homePathFor } = await import("../src/services/accessControl.js");
const { getAllAssessments } = await import("../src/services/assessmentService.js");
const { getReferralsForResource, getAllCases } = await import("../src/services/caseService.js");
const { getAllResources, getRecommendableResources, createResource } = await import("../src/services/resourceService.js");
const auth = await import("../src/utils/auth.js");
const { DEMO_ACCOUNTS } = await import("../src/config/roles.js");

const accountOf = (role) => DEMO_ACCOUNTS.find((a) => a.role === role);

beforeEach(() => {
  session.data = {};
});

describe("示範資料", () => {
  test("1 筆資源：綠燈、正式合作、可推薦，綁定 provider@demo.carelink", () => {
    const { resource } = loadDemoData();
    assert.equal(resource.riskLevel, "green");
    assert.equal(resource.partnership, "formal");
    assert.equal(resource.status, "active");
    assert.deepEqual(getRecommendableResources("explore").map((r) => r.id), [resource.id]);
    assert.deepEqual(auth.getProviderAccountsForResource(resource.id).map((a) => a.email), ["provider@demo.carelink"]);
  });

  test("1 筆評估：判讀人員判讀為橘燈轉介並取得同意，已開案", () => {
    const { assessment, case: c } = loadDemoData();
    assert.equal(assessment.review.light, "orange");
    assert.equal(assessment.review.orangeType, "refer");
    assert.equal(assessment.review.consent, true);
    assert.equal(assessment.review.readerName, accountOf("reader").name);
    assert.equal(assessment.caseId, c.id);
    assert.equal(assessment.status, "closed");
  });

  test("1 筆個案：由評估開案，已晤談、已轉介到示範資源，等待資源點回報", () => {
    const { resource, assessment, case: c } = loadDemoData();
    assert.equal(c.referral.assessmentId, assessment.id);
    assert.ok(c.consultation.firstContactAt);
    assert.ok(c.consultation.whatMatters);
    assert.ok(c.consultation.goals.length);
    assert.equal(c.stage, 3);
    assert.deepEqual(c.linkages.map((l) => [l.resourceId, l.status]), [[String(resource.id), "pending"]]);
    assert.equal(getReferralsForResource(resource.id).length, 1, "資源端後台看得到這筆轉介");
  });

  test("資源點示範帳號登入後進入資源端後台", () => {
    loadDemoData();
    const account = accountOf("provider");
    assert.equal(auth.login({ email: account.email, password: account.password }).ok, true);
    assert.equal(homePathFor(auth.getCurrentUser()), "/admin/provider");
  });

  test("只有一位虛構民眾；名稱明顯虛構", () => {
    loadDemoData();
    assert.deepEqual(countData(), { resources: 1, cases: 1, assessments: 1 });
    for (const name of [DEMO_NAMES.person, DEMO_NAMES.resource]) assert.match(name, /示範.*（虛構/);
  });

  test("載入時清空既有的資源、評估、個案；重複載入不會多出資料", () => {
    createResource({ name: "自建資源" });
    loadDemoData();
    loadDemoData();
    assert.deepEqual(getAllResources().map((r) => r.name), [DEMO_NAMES.resource]);
    assert.equal(getAllAssessments().length, 1);
    assert.equal(getAllCases().length, 1);
  });

  test("沒有載入時找不到示範資料", () => {
    assert.deepEqual(findDemoData(), { resource: null, assessment: null, case: null });
  });
});
