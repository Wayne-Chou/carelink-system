import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const { buildRolePreview, getPreviewGroups, PREVIEW_TODO_LIMIT } = await import("../src/services/rolePreview.js");
const { DEMO_NAMES, loadDemoData } = await import("../src/services/demoData.js");
const { adminMenuFor, checkRouteAccess, filterTodosFor, homePathFor } = await import("../src/services/accessControl.js");
const { resolvePath } = await import("./helpers/routing.js");
const { computeTodos } = await import("../src/services/todoService.js");
const { STATUS_LABELS, formatLight } = await import("../src/config/assessmentLabels.js");
const { LINKAGE_STATUS_OPTIONS, caseLabel, stageShort } = await import("../src/config/caseLabels.js");
const { PARTNERSHIP_OPTIONS, RISK_ICONS, RISK_LEVEL_OPTIONS, optionLabel } = await import("../src/config/resourceOptions.js");
const { formatAudience, formatRegion } = await import("../src/utils/resourceFormat.js");
const { createAssessment, getAssessmentById } = await import("../src/services/assessmentService.js");
const { createCase } = await import("../src/services/caseService.js");
const { createResource } = await import("../src/services/resourceService.js");
const { listAccounts, submitApplication, createEmptyApplication } = await import("../src/services/accountService.js");
const auth = await import("../src/utils/auth.js");

const TODAY = "2026-10-28";
const groups = getPreviewGroups();
const byRole = (role) => groups.find((g) => g.role === role);
const preview = (role) => buildRolePreview(byRole(role), { today: TODAY });
const ROLES = groups.filter((g) => g.role).map((g) => g.role);

// 以示範帳號實際登入後的使用者
const realUser = (role) => {
  const account = byRole(role).account;
  assert.equal(auth.login({ email: account.email, password: account.password }).ok, true);
  const user = auth.getCurrentUser();
  auth.clearCurrentUser();
  return user;
};

beforeEach(() => {
  session.data = {};
});

describe("分頁與登入狀態", () => {
  test("分頁：民眾、系統管理員、資源管理員、判讀人員、健康管理員、資源點", () => {
    assert.deepEqual(
      groups.map((g) => (g.role ? g.label : "民眾")),
      ["民眾", "系統管理員", "資源管理員", "判讀人員", "健康管理員", "資源點"]
    );
  });

  test("建立預覽不會登入或切換帳號", () => {
    loadDemoData();
    for (const g of groups) buildRolePreview(g, { today: TODAY });
    assert.equal(auth.getCurrentUser(), null);
    auth.login({ email: "reader@demo.carelink", password: "demo1234" });
    for (const g of groups) buildRolePreview(g, { today: TODAY });
    assert.equal(auth.getCurrentUser().role, "reader", "原本的登入者不變");
  });

  test("頂端的姓名與角色、「實際以此角色進入」前往的首頁，與實際登入後相同", () => {
    loadDemoData();
    for (const role of ROLES) {
      const p = preview(role);
      const user = realUser(role);
      assert.deepEqual(p.user, user, role);
      assert.equal(p.header.name, user.name);
      assert.equal(p.homePath, homePathFor(user));
    }
    assert.equal(preview(null).header, null, "民眾未登入");
    assert.equal(preview(null).homePath, "/");
  });
});

describe("後台選單與實際權限一致", () => {
  for (const withDemo of [false, true]) {
    test(withDemo ? "有示範資料（資源點已綁定）" : "沒有示範資料（資源點未綁定）", () => {
      if (withDemo) loadDemoData();
      for (const role of ROLES) {
        const p = preview(role);
        const user = realUser(role);
        assert.deepEqual(p.menu, adminMenuFor(user), `${role} 與後台選單相同`);
        for (const s of p.menu) {
          const route = resolvePath(s.path);
          assert.equal(checkRouteAccess(route, user, { findAssessment: getAssessmentById }).ok, true, `${role} ${s.path}`);
        }
      }
      assert.equal(preview("provider").menu.length, withDemo ? 2 : 1, "資源點綁定後才有「我的資源」");
      assert.deepEqual(preview(null).menu, []);
    });
  }
});

describe("待辦與實際計算一致", () => {
  test("各角色的總數與前 3 筆，與待辦頁（依角色的預設範圍）相同", () => {
    loadDemoData();
    // 產生各類待辦：未判讀的評估 4 筆、逾期未驗證的資源、首次聯繫逾期的個案、待審核帳號
    for (let i = 1; i <= 4; i += 1) createAssessment({ person: { name: `測試範例${i}` } });
    createResource({ name: "逾期驗證範例", lastVerifiedAt: "2025-01-01" });
    createCase({ stage: 2, person: { name: "逾期聯繫範例" } });
    const form = createEmptyApplication();
    Object.assign(form, {
      name: "申請範例",
      email: "apply@example.com",
      phone: "0900-000-009",
      organization: "範例單位",
      jobTitle: "護理師",
      role: "manager",
      supervisorName: "王範例",
      supervisorContact: "03-0000-0009",
      reason: "測試",
      consent: true,
    });
    form.details.manager.employeeIdOrEmployer = "E009";
    assert.equal(submitApplication(form).ok, true);

    const all = computeTodos({ today: TODAY });
    for (const role of ROLES) {
      const p = preview(role);
      const user = realUser(role);
      if (role === "provider") {
        assert.equal(p.todos, null, "資源點沒有待辦頁");
        continue;
      }
      const expected = filterTodosFor(user, all);
      assert.equal(p.todos.total, expected.length, role);
      assert.deepEqual(p.todos.items, expected.slice(0, PREVIEW_TODO_LIMIT), role);
      assert.ok(p.todos.items.length <= PREVIEW_TODO_LIMIT);
    }
    assert.equal(preview("reader").todos.total, 4, "判讀人員：4 筆未判讀");
    assert.equal(preview("reader").todos.items.length, 3, "最多列 3 筆");
    assert.ok(preview("admin").todos.items.some((t) => t.type === "account_review"));
    assert.equal(preview("resource_manager").todos.items.some((t) => t.type === "account_review"), false);
    assert.equal(preview(null).todos, null, "民眾沒有待辦");
  });
});

describe("示範資料卡片內容", () => {
  test("沒有示範資料時，每個分頁都顯示提示（content 為 null）", () => {
    for (const g of groups) assert.equal(buildRolePreview(g, { today: TODAY }).content, null, g.key);
  });

  test("判讀人員：評估列表中的 Ast001 卡片", () => {
    const demo = loadDemoData();
    const { kind, row } = preview("reader").content;
    assert.equal(kind, "assessmentList");
    assert.equal(row.code, "Ast001");
    assert.equal(row.person.name, DEMO_NAMES.person);
    assert.equal(row.statusText, STATUS_LABELS.closed);
    assert.equal(row.lightText, formatLight("orange", "refer"));
    assert.equal(row.caseCode, demo.case.code);
    assert.equal(row.pendingCase, false);
  });

  test("健康管理員：個案列表中的 Case001 卡片", () => {
    const demo = loadDemoData();
    const { kind, row } = preview("manager").content;
    assert.equal(kind, "caseList");
    assert.equal(row.code, "Case001");
    assert.equal(row.stageText, stageShort(3));
    assert.equal(row.referral.assessmentCode, "Ast001");
    assert.equal(row.linkageText, `${demo.resource.name}（${caseLabel(LINKAGE_STATUS_OPTIONS, "pending")}）`);
    assert.equal(row.overdue, false);
  });

  test("資源點：資源端後台的轉介紀錄", () => {
    loadDemoData();
    const { kind, rows } = preview("provider").content;
    assert.equal(kind, "referrals");
    assert.deepEqual(rows.map((r) => [r.caseItem.code, r.statusText, r.stageText]), [
      ["Case001", caseLabel(LINKAGE_STATUS_OPTIONS, "pending"), stageShort(3)],
    ]);
  });

  test("民眾：探索頁的資源卡片", () => {
    const demo = loadDemoData();
    const { kind, card } = preview(null).content;
    assert.equal(kind, "explore");
    assert.equal(card.title, DEMO_NAMES.resource);
    assert.equal(card.description, demo.resource.description);
    assert.equal(card.region, formatRegion(demo.resource));
    assert.equal(card.audience, formatAudience(demo.resource));
  });

  test("資源管理員：資源列表的卡片", () => {
    loadDemoData();
    const { kind, row } = preview("resource_manager").content;
    assert.equal(kind, "resourceList");
    assert.equal(row.code, "Res001");
    assert.equal(row.riskText, `${RISK_ICONS.green} ${optionLabel(RISK_LEVEL_OPTIONS, "green")}`);
    assert.equal(row.partnershipText, optionLabel(PARTNERSHIP_OPTIONS, "formal"));
    assert.equal(row.exploreText, "探索頁顯示中");
    assert.equal(row.overdue, false);
  });

  test("系統管理員：待審核帳號數與各列表筆數", () => {
    loadDemoData();
    let content = preview("admin").content;
    assert.equal(content.kind, "adminSummary");
    assert.equal(content.pendingAccounts, 0);
    assert.deepEqual(
      content.counts.map((c) => [c.label, c.count]),
      [
        ["資源管理", 1],
        ["評估列表", 1],
        ["個案管理", 1],
        ["帳號管理", listAccounts().length],
      ]
    );
    auth.saveUsers([{ id: "p1", name: "待審範例", email: "p@example.com", role: "reader", status: "pending" }]);
    content = preview("admin").content;
    assert.equal(content.pendingAccounts, 1);
  });
});

test("列表頁與角色預覽使用相同的卡片資料函式（services/listViews.js）", () => {
  const uses = {
    "AssessmentList.vue": "assessmentRows",
    "CaseList.vue": "caseRows",
    "ResourceList.vue": "resourceRows",
    "Explore.vue": "exploreCard",
    "ResourceDashboard.vue": "referralRows",
  };
  for (const [file, fn] of Object.entries(uses)) {
    const source = readFileSync(new URL(`../src/pages/${file}`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`import \\{[^}]*\\b${fn}\\b[^}]*\\} from "\\.\\./services/listViews\\.js"`), file);
  }
});
