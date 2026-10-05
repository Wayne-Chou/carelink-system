// 執行：node --test "tests/**/*.test.js"
// 使用 Node 內建 node:test，不需額外安裝套件；localStorage 以記憶體物件模擬

import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let store;
globalThis.localStorage = {
  getItem: (key) => (key in store ? store[key] : null),
  setItem: (key, value) => {
    store[key] = String(value);
  },
  removeItem: (key) => {
    delete store[key];
  },
};

const {
  createEmptyResource,
  createResource,
  updateResource,
  getAllResources,
  getResourceById,
  getRecommendableResources,
} = await import("../src/services/resourceService.js");

const FULL_CRITERIA = {
  management: "green",
  insurance: "green",
  environment: "green",
  complaints: "green",
  staffQualification: "green",
};

function seed(overrides = {}) {
  return createResource({
    name: "測試資源",
    status: "active",
    partnership: "formal",
    lastVerifiedAt: "2026-10-01",
    needTags: ["exercise"],
    riskCriteria: FULL_CRITERIA,
    address: { zip: "220", city: "新北市", district: "板橋區", detail: "文化路 1 號" },
    publicContact: { name: "林小姐", phone: "02-0000-0000", emailOrLine: "line_id" },
    transportNote: { publicTransit: "捷運步行 5 分鐘", shuttle: null, other: null },
    keywords: ["運動", "長者"],
    staff: [{ name: "陳老師", role: "帶班", license: "體適能", experience: "5 年" }],
    ...overrides,
  });
}

beforeEach(() => {
  store = {};
});

test("巢狀物件只傳部分欄位時，其他欄位保留", () => {
  const { id } = seed();
  const updated = updateResource(id, { address: { city: "臺北市" } });

  assert.deepEqual(updated.address, {
    zip: "220",
    city: "臺北市",
    district: "板橋區",
    detail: "文化路 1 號",
  });
});

test("多個巢狀物件同時部分更新", () => {
  const { id } = seed();
  const updated = updateResource(id, {
    publicContact: { phone: "02-1111-1111" },
    transportNote: { shuttle: "週二專車" },
  });

  assert.deepEqual(updated.publicContact, {
    name: "林小姐",
    phone: "02-1111-1111",
    emailOrLine: "line_id",
  });
  assert.equal(updated.transportNote.publicTransit, "捷運步行 5 分鐘");
  assert.equal(updated.transportNote.shuttle, "週二專車");
});

test("結果有寫回 localStorage", () => {
  const { id } = seed();
  updateResource(id, { address: { detail: "文化路 2 號" } });

  const stored = getResourceById(id);
  assert.equal(stored.address.detail, "文化路 2 號");
  assert.equal(stored.address.district, "板橋區");
});

test("陣列整個替換，不與舊陣列合併", () => {
  const { id } = seed();
  const updated = updateResource(id, {
    keywords: ["共餐"],
    needTags: ["food"],
    staff: [{ name: "王老師" }],
  });

  assert.deepEqual(updated.keywords, ["共餐"]);
  assert.deepEqual(updated.needTags, ["food"]);
  assert.deepEqual(updated.staff, [{ name: "王老師" }]);
  // 處方類型隨新標籤重新推得
  assert.deepEqual(updated.prescriptionTypes, ["basic_support"]);
});

test("巢狀物件內的陣列也是整個替換", () => {
  const { id } = seed({ highRisk: { isHighRisk: true, types: ["medical", "hazardous"] } });
  const updated = updateResource(id, { highRisk: { types: ["psychological"] } });

  assert.equal(updated.highRisk.isHighRisk, true);
  assert.deepEqual(updated.highRisk.types, ["psychological"]);
});

test("傳空陣列可清空陣列欄位", () => {
  const { id } = seed();
  assert.deepEqual(updateResource(id, { keywords: [] }).keywords, []);
});

test("patch 中為 null 的值會覆蓋，undefined 會被忽略", () => {
  const { id } = seed();
  const updated = updateResource(id, {
    publicContact: { emailOrLine: null, name: undefined },
  });

  assert.equal(updated.publicContact.emailOrLine, null);
  assert.equal(updated.publicContact.name, "林小姐");
});

test("schedule 同類型時深層合併", () => {
  const { id } = seed({
    schedule: { type: "regular", frequency: "weekly", weekdays: [2], startTime: "07:00", endTime: "08:00" },
  });
  const updated = updateResource(id, { schedule: { endTime: "09:00" } });

  assert.equal(updated.schedule.type, "regular");
  assert.deepEqual(updated.schedule.weekdays, [2]);
  assert.equal(updated.schedule.startTime, "07:00");
  assert.equal(updated.schedule.endTime, "09:00");
});

test("schedule 變更類型時不殘留舊類型欄位", () => {
  const { id } = seed({
    schedule: { type: "regular", frequency: "weekly", weekdays: [2], startTime: "07:00", endTime: "08:00" },
  });
  const updated = updateResource(id, { schedule: { type: "once", date: "2026-12-01" } });

  assert.deepEqual(updated.schedule, {
    type: "once",
    date: "2026-12-01",
    startTime: "",
    endTime: "",
  });
});

test("riskCriteria 部分更新後重新計算整體風險", () => {
  const { id } = seed();
  const updated = updateResource(id, { riskCriteria: { environment: "yellow" } });

  assert.equal(updated.riskCriteria.management, "green");
  assert.equal(updated.riskCriteria.environment, "yellow");
  assert.equal(updated.riskLevel, "yellow");
});

test("id、createdAt 不可被 patch 覆蓋，updatedAt 會更新", () => {
  const created = seed();
  const updated = updateResource(created.id, {
    id: "hacked",
    createdAt: "2000-01-01T00:00:00+08:00",
    name: "新名稱",
  });

  assert.equal(updated.id, created.id);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.name, "新名稱");
  assert.ok(updated.updatedAt);
});

test("找不到 id 時回傳 null 且不寫入", () => {
  seed();
  const before = store.resources;
  assert.equal(updateResource("not-exist", { name: "x" }), null);
  assert.equal(store.resources, before);
});

test("不修改呼叫端傳入的 patch 與先前取得的資源物件", () => {
  const created = seed();
  const patch = { address: { city: "臺北市" } };
  updateResource(created.id, patch);

  assert.deepEqual(patch, { address: { city: "臺北市" } });
  assert.equal(created.address.city, "新北市");
});

test("geo 預設為 null，資料結構不再有 mapUrl", () => {
  const empty = createEmptyResource();
  assert.equal(empty.geo, null);
  assert.equal("mapUrl" in empty, false);

  const created = seed();
  assert.equal(created.geo, null);
  assert.equal("mapUrl" in created, false);
});

test("讀取時清除既有資料中的 mapUrl，保留有效的 geo", () => {
  store.resources = JSON.stringify([
    { ...createEmptyResource(), id: "a", name: "有座標", needTags: [], mapUrl: "https://maps.example", geo: { lat: 25, lng: 121.4 } },
    { ...createEmptyResource(), id: "b", name: "座標不完整", needTags: [], geo: { lat: 25, lng: null } },
  ]);
  const [a, b] = getAllResources();
  assert.equal("mapUrl" in a, false);
  assert.deepEqual(a.geo, { lat: 25, lng: 121.4 });
  assert.equal(b.geo, null);
});

test("舊格式資料的 lat/lng 轉到 geo，沒有座標則為 null", () => {
  store.resources = JSON.stringify([
    { id: 1745000000000, name: "舊有座標", address: "新北市板橋區", lat: "25.01", lng: 121.46, tags: [] },
    { id: 1745000000001, name: "舊無座標", address: "新北市板橋區", lat: null, lng: null, tags: [] },
  ]);
  const [withGeo, withoutGeo] = getAllResources();
  assert.deepEqual(withGeo.geo, { lat: 25.01, lng: 121.46 });
  assert.equal(withoutGeo.geo, null);
  assert.equal("lat" in withGeo, false);
});

test("getRecommendableResources 排除未做風險評估的資源", () => {
  seed({ name: "已評估" });
  seed({ name: "未評估", riskCriteria: { management: "" } });
  const names = getRecommendableResources("referral").map((r) => r.name);
  assert.deepEqual(names, ["已評估"]);
});

test("編輯流程：以完整資料更新，保留 id、createdAt 與 geo，不會新增一筆", () => {
  const created = seed({ geo: { lat: 25, lng: 121.4 } });
  // 模擬表單：讀出 → 複製 → 修改 → 整份送回
  const formData = structuredClone(getResourceById(created.id));
  formData.name = "改過的名稱";
  formData.address.district = "中和區";

  const updated = updateResource(created.id, formData);
  assert.equal(getAllResources().length, 1);
  assert.equal(updated.id, created.id);
  assert.equal(updated.createdAt, created.createdAt);
  assert.equal(updated.name, "改過的名稱");
  assert.equal(updated.address.district, "中和區");
  assert.deepEqual(updated.geo, { lat: 25, lng: 121.4 });
});

test("載入示範資料：加入模式保留自建資源、不重複加入", async () => {
  const { loadDemoResources } = await import("../src/services/resourceService.js");
  const { DEMO_RESOURCES } = await import("../src/services/demoResources.js");
  const mine = seed({ name: "自建資源" });

  assert.equal(loadDemoResources(), DEMO_RESOURCES.length);
  assert.equal(loadDemoResources(), 0, "再按一次不會重複加入");
  const all = getAllResources();
  assert.equal(all.length, DEMO_RESOURCES.length + 1);
  assert.ok(getResourceById(mine.id), "自建資源保留");
  assert.ok(all.filter((r) => r.id !== mine.id).every((r) => r.isDemo === true));
});

test("載入示範資料：清空模式只剩示範資料", async () => {
  const { loadDemoResources } = await import("../src/services/resourceService.js");
  const { DEMO_RESOURCES } = await import("../src/services/demoResources.js");
  seed({ name: "自建資源" });
  assert.equal(loadDemoResources({ replace: true }), DEMO_RESOURCES.length);
  assert.equal(getAllResources().length, DEMO_RESOURCES.length);
  assert.ok(getAllResources().every((r) => r.isDemo === true));
});

test("移除示範資料只刪帶標記的，編輯過的示範資料仍保有標記", async () => {
  const { loadDemoResources, removeDemoResources } = await import("../src/services/resourceService.js");
  const { DEMO_RESOURCES } = await import("../src/services/demoResources.js");
  const mine = seed({ name: "自建資源" });
  loadDemoResources();
  updateResource(DEMO_RESOURCES[0].id, { name: "編輯過的示範資料" });

  assert.equal(removeDemoResources(), DEMO_RESOURCES.length);
  assert.deepEqual(getAllResources().map((r) => r.id), [mine.id]);
  assert.equal(removeDemoResources(), 0);
});

test("示範資料載入後探索頁可見 3 筆", async () => {
  const { loadDemoResources } = await import("../src/services/resourceService.js");
  loadDemoResources({ replace: true });
  assert.equal(getRecommendableResources("explore").length, 3);
});

describe("資源編碼 Res001", () => {
  test("新增時依序自動產生，忽略傳入的編碼", async () => {
    const a = createResource({ name: "A", code: "自己填的" });
    const b = createResource({ name: "B" });
    assert.equal(a.code, "Res001");
    assert.equal(b.code, "Res002");
  });

  test("流水號取目前最大編號加一，超過 999 時位數自動增加", async () => {
    const { formatResourceCode, getNextResourceCode } = await import("../src/services/resourceService.js");
    assert.equal(formatResourceCode(7), "Res007");
    assert.equal(formatResourceCode(1000), "Res1000");
    assert.equal(getNextResourceCode([{ code: "Res009" }, { code: "Res002" }, { code: null }, { code: "X1" }]), "Res010");
    assert.equal(getNextResourceCode([]), "Res001");
  });

  test("編輯時不可修改編碼；沒有編碼的舊資料在儲存時補上", () => {
    const a = createResource({ name: "A" });
    assert.equal(updateResource(a.id, { code: "Res999", name: "A2" }).code, "Res001");

    const raw = JSON.parse(store.resources);
    raw.push({ id: 1745000000000, name: "舊資料", address: "新北市板橋區", tags: [] });
    store.resources = JSON.stringify(raw);
    assert.equal(getResourceById("1745000000000").code, null, "讀取時不自動產生");
    assert.equal(updateResource("1745000000000", { name: "舊資料（已編輯）" }).code, "Res002");
  });

  test("載入示範資料後，新增的資源接在示範資料之後", async () => {
    const { loadDemoResources } = await import("../src/services/resourceService.js");
    loadDemoResources({ replace: true });
    assert.equal(createResource({ name: "新資源" }).code, "Res007");
  });

  test("示範資料的編碼已被自建資源使用時，改用不重複的編號", async () => {
    const { loadDemoResources } = await import("../src/services/resourceService.js");
    createResource({ name: "自建1" }); // Res001
    createResource({ name: "自建2" }); // Res002
    loadDemoResources();
    const codes = getAllResources().map((r) => r.code);
    assert.equal(new Set(codes).size, codes.length, `編碼不重複：${codes.join(", ")}`);
    assert.ok(codes.every((c) => /^Res\d{3,}$/.test(c)));
  });
});
