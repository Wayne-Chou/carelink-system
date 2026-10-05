import { test } from "node:test";
import assert from "node:assert/strict";
import { collectCodes, countByDistrict, filterResources } from "../src/services/resourceSearch.js";

const make = (id, patch = {}) => ({
  id,
  name: `資源${id}`,
  organization: "示範協會",
  description: "",
  placeName: "",
  address: { zip: "", city: "新北市", district: "板橋區", detail: "" },
  needTags: [],
  prescriptionTypes: [],
  keywords: [],
  ageGroups: ["all"],
  identities: ["all"],
  ...patch,
});

const list = [
  make("a", { name: "河濱健走班", needTags: ["exercise"], prescriptionTypes: ["health"], ageGroups: ["senior"] }),
  make("b", { needTags: ["companionship", "food"], prescriptionTypes: ["social", "basic_support"], keywords: ["共餐"], address: { city: "新北市", district: "中和區", detail: "示範路 2 號" } }),
  make("c", { needTags: ["mental"], prescriptionTypes: ["health"], identities: ["caregiver"], address: { city: "臺北市", district: "大安區", detail: "" } }),
];
const ids = (rs) => rs.map((r) => r.id);

test("沒有條件時全部回傳", () => {
  assert.deepEqual(ids(filterResources(list, {})), ["a", "b", "c"]);
});

test("關鍵字比對名稱、關鍵字欄位與需求標籤中文", () => {
  assert.deepEqual(ids(filterResources(list, { keyword: "健走" })), ["a"]);
  assert.deepEqual(ids(filterResources(list, { keyword: "共餐" })), ["b"]);
  assert.deepEqual(ids(filterResources(list, { keyword: "心理支持" })), ["c"]);
});

test("地址或地標比對地址", () => {
  assert.deepEqual(ids(filterResources(list, { address: "中和區示範路" })), ["b"]);
});

test("縣市與行政區完全相符，台／臺視為相同", () => {
  assert.deepEqual(ids(filterResources(list, { district: "板橋區" })), ["a"]);
  assert.deepEqual(ids(filterResources(list, { city: "台北市" })), ["c"]);
});

test("處方類型", () => {
  assert.deepEqual(ids(filterResources(list, { type: "health" })), ["a", "c"]);
});

test("需求標籤符合任一即可", () => {
  assert.deepEqual(ids(filterResources(list, { tags: ["exercise", "food"] })), ["a", "b"]);
});

test("適合年齡與身分：資源勾「不指定」視為符合", () => {
  assert.deepEqual(ids(filterResources(list, { ageGroups: ["senior"] })), ["a", "b", "c"]);
  assert.deepEqual(ids(filterResources(list, { ageGroups: ["child"] })), ["b", "c"]);
  assert.deepEqual(ids(filterResources(list, { identities: ["caregiver"] })), ["a", "b", "c"]);
  assert.deepEqual(ids(filterResources([list[2]], { identities: ["dementia"] })), []);
});

test("countByDistrict 依數量排序，略過沒有行政區的資源", () => {
  const counts = countByDistrict([...list, make("d"), make("e", { address: { city: "", district: "" } })]);
  assert.deepEqual(counts[0], { city: "新北市", district: "板橋區", count: 2 });
  assert.equal(counts.length, 3);
});

test("collectCodes 只列出有用到的代碼並依指定順序", () => {
  assert.deepEqual(collectCodes(list, "needTags", ["mental", "food", "exercise", "legal"]), ["mental", "food", "exercise"]);
});
