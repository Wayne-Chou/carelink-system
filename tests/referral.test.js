import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_RESOURCES } from "./fixtures/resources.js";
import {
  getLinkedResourceName,
  getLinkedResourceStatus,
  getReferralOptions,
} from "../src/services/referral.js";

const fixture = (code) => FIXTURE_RESOURCES.find((r) => r.code === code);

test("轉介選單只列出可推薦資源，黃燈標記需陪同", () => {
  const options = getReferralOptions(FIXTURE_RESOURCES);
  assert.deepEqual(
    options.map((o) => o.resource.code),
    ["Res101", "Res102", "Res103"]
  );
  assert.deepEqual(
    options.filter((o) => o.needsEscort).map((o) => o.resource.code),
    ["Res103"]
  );
});

test("沒有連結資源", () => {
  for (const id of [null, undefined, ""]) {
    assert.deepEqual(getLinkedResourceStatus(id, FIXTURE_RESOURCES), { linked: false });
  }
});

test("連結的資源仍可轉介", () => {
  const status = getLinkedResourceStatus(fixture("Res102").id, FIXTURE_RESOURCES);
  assert.equal(status.available, true);
  assert.deepEqual(status.reasons, []);
  assert.equal(status.needsEscort, false);
});

test("連結的資源後來暫停或終止：找得到資源並列出原因", () => {
  const paused = getLinkedResourceStatus(fixture("Res104").id, FIXTURE_RESOURCES);
  assert.equal(paused.deleted, false);
  assert.equal(paused.available, false);
  assert.deepEqual(paused.reasons, ["paused"]);

  const terminated = { ...fixture("Res102"), status: "terminated" };
  const t = getLinkedResourceStatus(terminated.id, [terminated]);
  assert.equal(t.available, false);
  assert.deepEqual(t.reasons, ["terminated"]);
});

test("連結的資源已被刪除", () => {
  assert.deepEqual(getLinkedResourceStatus("gone-123", FIXTURE_RESOURCES), {
    linked: true,
    deleted: true,
    resourceId: "gone-123",
  });
});

test("舊資料的數字 id 也能比對", () => {
  const legacy = { ...fixture("Res102"), id: "1745000000000" };
  assert.equal(getLinkedResourceStatus(1745000000000, [legacy]).deleted, false);
});

test("被刪除資源的名稱：優先用連結時存的名稱，其次從歷程找最後一筆", () => {
  assert.equal(getLinkedResourceName({ resourceName: "共餐食堂" }, []), "共餐食堂");
  const history = [
    { note: "[健康管理員] 連結資源：舊資源A" },
    { note: "[健康管理員] 連結資源：新資源B（需健康管理員陪同至少一次）" },
    { note: "[健康管理員] 流程推進" },
  ];
  assert.equal(getLinkedResourceName({}, history), "新資源B");
  assert.equal(getLinkedResourceName({}, []), "");
});
