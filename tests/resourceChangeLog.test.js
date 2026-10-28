import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const svc = await import("../src/services/resourceService.js");
const { FIXTURE_RESOURCES, FIXTURE_IDS } = await import("./fixtures/resources.js");
const { CHANGE_LOG_IGNORED_FIELDS, FIELD_LABELS, PROVIDER_EDITABLE_FIELDS } = await import(
  "../src/config/resourceEditing.js"
);
const { EMPTY_CHANGE_VALUE, formatChangeValue } = await import("../src/utils/resourceFormat.js");

const ID = FIXTURE_IDS.Res101;
const PROVIDER = { name: "陳範例", role: "provider" };
const MANAGER = { name: "林範例", role: "resource_manager" };
const current = () => svc.getResourceById(ID);

beforeEach(() => {
  session.data = { resources: JSON.stringify(FIXTURE_RESOURCES) };
});

test("修改時記錄修改者、時間、修改的欄位與前後內容", () => {
  const before = current();
  const updated = svc.updateResource(ID, { name: "範例社區太極班（新）", notice: "請自備水壺" }, { actor: MANAGER });
  assert.equal(updated.changeLog.length, 1);
  const [entry] = updated.changeLog;
  assert.deepEqual(entry.actor, MANAGER);
  assert.equal(entry.at, updated.updatedAt);
  assert.deepEqual(entry.changes, [
    { field: "name", before: before.name, after: "範例社區太極班（新）" },
    { field: "notice", before: before.notice, after: "請自備水壺" },
  ]);
  assert.equal(current().changeLog.length, 1, "已寫入儲存區");
});

test("紀錄累加；沒有實際變動時不新增紀錄", () => {
  svc.updateResource(ID, { name: "A" }, { actor: MANAGER });
  svc.updateResource(ID, { name: "B" }, { actor: PROVIDER });
  svc.updateResource(ID, { name: "B", notice: current().notice }, { actor: PROVIDER });
  assert.deepEqual(
    current().changeLog.map((e) => [e.actor.name, e.changes[0].after]),
    [
      ["林範例", "A"],
      ["陳範例", "B"],
    ]
  );
});

test("null、空字串視為相同，表單整份送出時不會記錄沒改的欄位", () => {
  const form = structuredClone(current());
  assert.equal(form.indigenousTribe, null, "測試前提");
  form.indigenousTribe = "";
  form.staff = form.staff.map((s) => ({ license: "", experience: "", ...s }));
  form.transportNote = { ...form.transportNote, shuttle: "" };
  assert.deepEqual(svc.updateResource(ID, form, { actor: MANAGER }).changeLog, []);
});

test("自動推得的欄位與系統時間不列入紀錄（需求標籤列入、處方類型不列入）", () => {
  const updated = svc.updateResource(ID, { needTags: ["food"] }, { actor: MANAGER });
  assert.deepEqual(updated.changeLog[0].changes.map((c) => c.field), ["needTags"]);
  for (const field of ["updatedAt", "prescriptionTypes", "nextVerifyAt", "changeLog"]) {
    assert.ok(CHANGE_LOG_IGNORED_FIELDS.includes(field), field);
  }
});

test("修改紀錄不能由送出的資料覆寫", () => {
  svc.updateResource(ID, { name: "A" }, { actor: MANAGER });
  const updated = svc.updateResource(ID, { name: "B", changeLog: [] }, { actor: MANAGER });
  assert.equal(updated.changeLog.length, 2);
});

test("資源點編輯：只寫入可修改的欄位，其他欄位一律忽略", () => {
  const before = current();
  const patch = {
    // 可以改
    description: "新的說明",
    schedule: { ...before.schedule, startTime: "08:00", endTime: "09:00" },
    capacity: { type: "limited", limit: 30 },
    publicContact: { ...before.publicContact, phone: "03-0000-0099" },
    fee: { type: "paid", detail: "每次 50 元" },
    ageGroups: ["adult"],
    links: ["https://example.com/new"],
    // 不能改
    riskCriteria: { ...before.riskCriteria, insurance: "red" },
    partnership: "unconfirmed",
    lastVerifiedAt: "2020-01-01",
    status: "paused",
    needTags: ["food"],
    adminContact: { sameAsPublic: false, name: "王範例", phone: "03-0000-0098", emailOrLine: null },
    followUpMethods: ["manager_contact"],
    keywords: ["改過"],
    scenarios: "改過",
  };
  const updated = svc.updateResource(ID, patch, { actor: PROVIDER, editableFields: PROVIDER_EDITABLE_FIELDS });
  assert.equal(updated.description, "新的說明");
  assert.equal(updated.schedule.startTime, "08:00");
  assert.equal(updated.capacity.limit, 30);
  assert.equal(updated.publicContact.phone, "03-0000-0099");
  assert.deepEqual(updated.fee, { type: "paid", detail: "每次 50 元" });
  assert.deepEqual(updated.ageGroups, ["adult"]);
  assert.deepEqual(updated.links, ["https://example.com/new"]);
  for (const field of ["riskCriteria", "riskLevel", "partnership", "lastVerifiedAt", "status", "needTags", "adminContact", "followUpMethods", "keywords", "scenarios"]) {
    assert.deepEqual(updated[field], before[field], `${field} 不變`);
  }
  assert.deepEqual(
    updated.changeLog[0].changes.map((c) => c.field).sort(),
    ["ageGroups", "capacity", "description", "fee", "links", "publicContact", "schedule"]
  );
  assert.deepEqual(updated.changeLog[0].actor, PROVIDER);
});

test("資源點可修改的欄位：不含風險評級、合作狀態、驗證資訊、資源狀態、需求標籤、行政聯絡人、追蹤方式、AI 輔助欄位", () => {
  const LOCKED = [
    "riskLevel", "riskCriteria", "highRisk", "riskChangeNote",
    "partnership",
    "verifiedBy", "lastVerifiedAt", "nextVerifyAt",
    "status", "pauseReason", "resumeAt", "seasonalNote",
    "needTags", "needTagOther", "prescriptionTypes",
    "adminContact",
    "followUpMethods", "followUpOther",
    "keywords", "scenarios",
  ];
  for (const field of LOCKED) assert.equal(PROVIDER_EDITABLE_FIELDS.includes(field), false, field);
  const fields = Object.keys(svc.createEmptyResource());
  for (const field of PROVIDER_EDITABLE_FIELDS) assert.ok(fields.includes(field), `${field} 是資源欄位`);
});

test("每個會記錄的欄位都有中文名稱", () => {
  for (const field of Object.keys(svc.createEmptyResource())) {
    if (CHANGE_LOG_IGNORED_FIELDS.includes(field)) continue;
    assert.ok(FIELD_LABELS[field], field);
  }
});

test("新增資源時修改紀錄為空；終止資源也記錄修改者", () => {
  const created = svc.createResource({ name: "新資源", changeLog: [{ at: "x" }] });
  assert.deepEqual(created.changeLog, []);
  const terminated = svc.terminateResource(created.id, { actor: MANAGER });
  assert.deepEqual(terminated.changeLog[0].changes, [{ field: "status", before: "active", after: "terminated" }]);
  assert.deepEqual(terminated.changeLog[0].actor, MANAGER);
});

test("沒有傳入修改者時仍記錄，修改者為空白", () => {
  const updated = svc.updateResource(ID, { name: "A" });
  assert.deepEqual(updated.changeLog[0].actor, { name: "", role: "" });
});

test("修改紀錄的顯示：代碼轉中文，沒有內容顯示（空白）", () => {
  assert.equal(formatChangeValue("notice", null), EMPTY_CHANGE_VALUE);
  assert.equal(formatChangeValue("links", []), EMPTY_CHANGE_VALUE);
  assert.equal(formatChangeValue("status", "paused"), "暫停");
  assert.equal(formatChangeValue("ageGroups", ["senior", "adult"]), "長者、成人");
  assert.equal(formatChangeValue("fee", { type: "paid", detail: "每次 50 元" }), "自費：每次 50 元");
  assert.equal(formatChangeValue("capacity", { type: "limited", limit: 30 }), "上限 30 人");
  assert.equal(formatChangeValue("address", { zip: "970", city: "花蓮縣", district: "花蓮市", detail: "範例路 1 號" }), "970 花蓮縣花蓮市範例路 1 號");
  assert.equal(formatChangeValue("adminContact", { sameAsPublic: true }), "同公眾聯絡人");
  assert.equal(formatChangeValue("publicContact", { name: "陳範例", phone: "03-0000-0001", emailOrLine: null }), "陳範例 03-0000-0001");
  assert.equal(formatChangeValue("geo", { lat: 23.9, lng: 121.6 }), "23.9, 121.6");
  assert.equal(formatChangeValue("description", "說明"), "說明");
});
