import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_RESOURCES } from "../src/services/demoResources.js";
import {
  getLinkedResourceName,
  getLinkedResourceStatus,
  getReferralOptions,
} from "../src/services/referral.js";

const demo = (code) => DEMO_RESOURCES.find((r) => r.code === code);

test("轉介選單只列出可推薦資源，黃燈標記需陪同", () => {
  const options = getReferralOptions(DEMO_RESOURCES);
  assert.deepEqual(
    options.map((o) => o.resource.code),
    ["Res001", "Res002", "Res003"]
  );
  assert.deepEqual(
    options.filter((o) => o.needsEscort).map((o) => o.resource.code),
    ["Res001"]
  );
});

test("沒有連結資源", () => {
  for (const id of [null, undefined, ""]) {
    assert.deepEqual(getLinkedResourceStatus(id, DEMO_RESOURCES), { linked: false });
  }
});

test("連結的資源仍可轉介", () => {
  const status = getLinkedResourceStatus(demo("Res002").id, DEMO_RESOURCES);
  assert.equal(status.available, true);
  assert.deepEqual(status.reasons, []);
  assert.equal(status.needsEscort, false);
});

test("連結的資源後來暫停或終止：找得到資源並列出原因", () => {
  const paused = getLinkedResourceStatus(demo("Res004").id, DEMO_RESOURCES);
  assert.equal(paused.deleted, false);
  assert.equal(paused.available, false);
  assert.deepEqual(paused.reasons, ["paused"]);

  const terminated = { ...demo("Res002"), status: "terminated" };
  const t = getLinkedResourceStatus(terminated.id, [terminated]);
  assert.equal(t.available, false);
  assert.deepEqual(t.reasons, ["terminated"]);
});

test("連結的資源已被刪除", () => {
  assert.deepEqual(getLinkedResourceStatus("gone-123", DEMO_RESOURCES), {
    linked: true,
    deleted: true,
    resourceId: "gone-123",
  });
});

test("舊資料的數字 id 也能比對", () => {
  const legacy = { ...demo("Res002"), id: "1745000000000" };
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
