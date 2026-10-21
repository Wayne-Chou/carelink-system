import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CITIES,
  CITY_TYPES,
  getCityGroups,
  getCityNames,
  getDistricts,
  getZipCode,
  normalizeCityName,
  parseCityDistrict,
} from "../src/config/districts.js";

const allDistricts = CITIES.flatMap((c) => c.districts.map((d) => ({ city: c.name, ...d })));

test("全台 22 個縣市：直轄市 6、市 3、縣 13，依直轄市 → 市 → 縣排序", () => {
  assert.equal(CITIES.length, 22);
  assert.deepEqual(
    getCityGroups().map((g) => [g.type, g.cities.length]),
    [["直轄市", 6], ["市", 3], ["縣", 13]]
  );
  const typeOrder = CITIES.map((c) => CITY_TYPES.indexOf(c.type));
  assert.deepEqual(typeOrder, [...typeOrder].sort((a, b) => a - b), "類型順序不交錯");
  assert.deepEqual(getCityNames().slice(0, 9), [
    "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "嘉義市",
  ]);
});

test("鄉鎮市區共 368 個，各縣市數量正確", () => {
  assert.equal(allDistricts.length, 368);
  const counts = Object.fromEntries(CITIES.map((c) => [c.name, c.districts.length]));
  assert.deepEqual(counts, {
    新北市: 29, 臺北市: 12, 桃園市: 13, 臺中市: 29, 臺南市: 37, 高雄市: 38,
    基隆市: 7, 新竹市: 3, 嘉義市: 2,
    宜蘭縣: 12, 新竹縣: 13, 苗栗縣: 18, 彰化縣: 26, 南投縣: 13, 雲林縣: 20, 嘉義縣: 18,
    屏東縣: 33, 臺東縣: 16, 花蓮縣: 13, 澎湖縣: 6, 金門縣: 6, 連江縣: 4,
  });
});

test("每區都有 3 碼郵遞區號", () => {
  for (const d of allDistricts) assert.match(d.zip, /^\d{3}$/, `${d.city}${d.name}`);
});

test("名稱不重複：縣市名稱、同一縣市內的行政區名稱；名稱一律用「臺」", () => {
  assert.equal(new Set(getCityNames()).size, CITIES.length);
  for (const c of CITIES) {
    assert.equal(new Set(c.districts.map((d) => d.name)).size, c.districts.length, c.name);
  }
  for (const name of [...getCityNames(), ...allDistricts.map((d) => d.name)]) {
    assert.ok(!name.includes("台"), name);
  }
  assert.equal(getZipCode("雲林縣", "臺西鄉"), "636");
  assert.equal(getZipCode("屏東縣", "霧臺鄉"), "902");
});

test("共用郵遞區號：新竹市三區都是 300、嘉義市兩區都是 600", () => {
  assert.deepEqual(getDistricts("新竹市").map((d) => [d.name, d.zip]), [["東區", "300"], ["北區", "300"], ["香山區", "300"]]);
  assert.deepEqual(getDistricts("嘉義市").map((d) => [d.name, d.zip]), [["東區", "600"], ["西區", "600"]]);
  const byZip = (zip) => allDistricts.filter((d) => d.zip === zip).map((d) => `${d.city}${d.name}`);
  assert.deepEqual(byZip("300"), ["新竹市東區", "新竹市北區", "新竹市香山區"]);
  assert.deepEqual(byZip("600"), ["嘉義市東區", "嘉義市西區"]);
});

test("同名行政區：郵遞區號一律依縣市＋行政區查詢", () => {
  assert.equal(getZipCode("新竹市", "東區"), "300");
  assert.equal(getZipCode("嘉義市", "東區"), "600");
  assert.equal(getZipCode("臺中市", "東區"), "401");
  assert.equal(getZipCode("臺南市", "東區"), "701");
  assert.equal(getZipCode("臺北市", "大安區"), "106");
  assert.equal(getZipCode("臺中市", "大安區"), "439");
  assert.equal(getZipCode("台中市", "大安區"), "439", "台、臺視為同一字");
  assert.equal(getZipCode("新北市", "東區"), "", "縣市沒有這個行政區");
});

test("normalizeCityName：台一律換成臺", () => {
  assert.equal(normalizeCityName(" 台東縣 "), "臺東縣");
  assert.equal(normalizeCityName("台南市"), "臺南市");
});

test("parseCityDistrict：行政區要緊接在縣市之後，不靠郵遞區號反查", () => {
  const parse = (text) => Object.values(parseCityDistrict(text)).join("|");
  assert.equal(parse("新北市板橋區文化路 1 號"), "新北市|板橋區|220");
  assert.equal(parse("台中市北屯區文心路四段"), "臺中市|北屯區|406", "不會把北屯區當成北區");
  assert.equal(parse("臺中市中區民權路"), "臺中市|中區|400");
  assert.equal(parse("新竹市北區東大路二段"), "新竹市|北區|300", "路名的「東」不影響");
  assert.equal(parse("300 新竹市香山區中華路"), "新竹市|香山區|300");
  assert.equal(parse("600 嘉義市西區民族路"), "嘉義市|西區|600", "開頭的郵遞區號只略過");
  assert.equal(parse("嘉義縣太保市祥和一路"), "嘉義縣|太保市|612", "嘉義縣與嘉義市分開");
  assert.equal(parse("新竹縣竹北市光明六路"), "新竹縣|竹北市|302");
  assert.equal(parse("台東縣台東市中華路"), "臺東縣|臺東市|950");
  assert.equal(parse("新北市"), "新北市||", "只有縣市");
});

test("parseCityDistrict：沒寫縣市時，只有唯一對應的行政區才採用", () => {
  const parse = (text) => Object.values(parseCityDistrict(text)).join("|");
  assert.equal(parse("板橋區文化路"), "新北市|板橋區|220");
  assert.equal(parse("那瑪夏區"), "高雄市|那瑪夏區|849");
  assert.equal(parse("東區民族路"), "||", "東區有多個縣市");
  assert.equal(parse("信義區松仁路"), "||", "信義區在臺北市與基隆市都有");
  assert.equal(parse("300 東區"), "||", "不用郵遞區號 300 反查新竹市");
  assert.equal(parse(""), "||");
});
