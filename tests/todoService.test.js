import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTodos, countOverdue } from "../src/services/todoService.js";

const TODAY = "2026-10-14";
const NOW = new Date("2026-10-14T09:00:00+08:00");

const assessment = (code, patch = {}) => ({
  id: code,
  code,
  person: { name: `${code} 民眾` },
  filledAt: "2026-10-01",
  status: "reviewed",
  review: { light: "", orangeType: "" },
  nextCheckAt: null,
  previousAssessmentId: null,
  declineCount: 0,
  ...patch,
  review: { light: "", orangeType: "", ...(patch.review || {}) },
});

const caseItem = (code, patch = {}) => ({
  id: code,
  code,
  stage: 2,
  person: { name: `${code} 個案` },
  createdAt: "2026-10-01T10:00:00+08:00",
  consultation: { firstContactAt: "2026-10-02T10:00:00+08:00" },
  linkages: [],
  followUps: [],
  ...patch,
});

const run = (data) =>
  computeTodos({ today: TODAY, now: NOW, assessments: [], cases: [], resources: [], ...data });
const types = (todos) => todos.map((t) => [t.type, t.code]);

test("尚未判讀：所有未判讀的評估，以填表日為到期日", () => {
  const todos = run({ assessments: [assessment("Ast001", { status: "filled", filledAt: "2026-10-10" })] });
  assert.deepEqual(types(todos), [["unreviewed", "Ast001"]]);
  assert.equal(todos[0].overdueDays, 4);
  assert.equal(todos[0].audience, "reader");
  assert.equal(todos[0].link, "/admin/assessments/Ast001");
});

test("黃燈、綠燈：下次確認日期已到才列出", () => {
  const todos = run({
    assessments: [
      assessment("Ast001", { review: { light: "yellow" }, nextCheckAt: "2026-10-01" }),
      assessment("Ast002", { review: { light: "yellow" }, nextCheckAt: "2026-12-01" }),
      assessment("Ast003", { review: { light: "green" }, nextCheckAt: "2026-10-14" }),
    ],
  });
  assert.deepEqual(types(todos), [["yellow_recheck", "Ast001"], ["green_reassess", "Ast003"]]);
  assert.equal(todos[1].overdueDays, 0, "今天到期");
});

test("橘燈保留：下次來院時（無日期）列出；已有後續評估的舊紀錄不列出", () => {
  const reserved = { review: { light: "orange", orangeType: "reserved", declineReason: "想再想想" } };
  const todos = run({
    assessments: [
      assessment("Ast001", reserved),
      assessment("Ast002", reserved),
      assessment("Ast003", { previousAssessmentId: "Ast002", review: { light: "green" }, nextCheckAt: "2027-10-01" }),
    ],
  });
  assert.deepEqual(types(todos), [["orange_reserved", "Ast001"]]);
  assert.equal(todos[0].dueDate, null);
  assert.match(todos[0].detail, /想再想想/);
});

test("已作廢與已完成後續的評估不列入", () => {
  const todos = run({
    assessments: [
      assessment("Ast001", { status: "voided", filledAt: "2026-10-01" }),
      assessment("Ast002", { status: "closed", review: { light: "orange", orangeType: "refer" } }),
    ],
  });
  assert.deepEqual(todos, []);
});

test("逾期未聯繫：開案超過 72 小時沒有首次聯繫，到期日為開案日加 3 天", () => {
  const todos = run({
    cases: [
      caseItem("Case001", { stage: 1, createdAt: "2026-10-03T10:00:00+08:00", consultation: { firstContactAt: null } }),
      caseItem("Case002", { createdAt: "2026-10-13T10:00:00+08:00", consultation: { firstContactAt: null } }),
    ],
  });
  assert.deepEqual(types(todos), [["first_contact_overdue", "Case001"]]);
  assert.equal(todos[0].dueDate, "2026-10-06");
  assert.equal(todos[0].overdueDays, 8);
  assert.equal(todos[0].link, "/admin/cases/Case001");
});

test("追蹤到期：只有第 4 階段", () => {
  const followUps = [{ round: 1, plannedAt: "2026-10-05", doneAt: null }];
  const todos = run({ cases: [caseItem("Case001", { stage: 4, followUps }), caseItem("Case002", { stage: 3, followUps })] });
  assert.deepEqual(types(todos), [["follow_up_due", "Case001"]]);
  assert.equal(todos[0].detail, "1 個月追蹤");
});

test("資源點未回報：最新連結待回報超過 14 天", () => {
  const link = (linkedAt) => [{ resourceName: "健走班", linkedAt, status: "pending" }];
  const todos = run({
    cases: [caseItem("Case001", { stage: 3, linkages: link("2026-09-24") }), caseItem("Case002", { stage: 3, linkages: link("2026-10-05") })],
  });
  assert.deepEqual(types(todos), [["provider_unreported", "Case001"]]);
  assert.equal(todos[0].dueDate, "2026-10-08");
});

test("已結案的個案不列入", () => {
  const todos = run({ cases: [caseItem("Case001", { stage: "closed", consultation: { firstContactAt: null } })] });
  assert.deepEqual(todos, []);
});

test("資源待驗證：超過預計驗證日期，已終止的不列入", () => {
  const todos = run({
    resources: [
      { id: "r1", code: "Res001", name: "A", status: "active", nextVerifyAt: "2026-09-01" },
      { id: "r2", code: "Res002", name: "B", status: "terminated", nextVerifyAt: "2026-09-01" },
      { id: "r3", code: "Res003", name: "C", status: "active", nextVerifyAt: "2027-01-01" },
    ],
  });
  assert.deepEqual(types(todos), [["resource_verify", "Res001"]]);
  assert.equal(todos[0].audience, "admin");
  assert.equal(todos[0].link, "/admin/resources/r1");
});

test("排序：逾期最多的在前，沒有日期的在最後；逾期數只算已過期的", () => {
  const todos = run({
    assessments: [
      assessment("Ast001", { review: { light: "orange", orangeType: "reserved", declineReason: "x" } }),
      assessment("Ast002", { status: "filled", filledAt: "2026-10-14" }),
      assessment("Ast003", { status: "filled", filledAt: "2026-10-01" }),
    ],
  });
  assert.deepEqual(todos.map((t) => t.code), ["Ast003", "Ast002", "Ast001"]);
  assert.equal(countOverdue(todos), 1);
});
