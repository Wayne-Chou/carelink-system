import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GEO_MESSAGES,
  checkGeo,
  distanceKm,
  formatDistance,
  geolocationErrorMessage,
  parseMapLink,
  rankByDistance,
} from "../src/utils/geo.js";

const BANQIAO_STATION = { lat: 25.0143, lng: 121.4635 };
const TAIPEI_101 = { lat: 25.0339, lng: 121.5645 };

test("distanceKm：已知兩點的直線距離；同一點為 0；缺座標為 null", () => {
  const km = distanceKm(BANQIAO_STATION, TAIPEI_101);
  assert.ok(km > 10.2 && km < 10.6, `板橋車站到台北 101 約 10.4 公里，實得 ${km}`);
  assert.equal(distanceKm(TAIPEI_101, TAIPEI_101), 0);
  assert.equal(distanceKm(BANQIAO_STATION, TAIPEI_101), distanceKm(TAIPEI_101, BANQIAO_STATION));
  // 臺北到高雄約 300 公里
  const longKm = distanceKm(TAIPEI_101, { lat: 22.6273, lng: 120.3014 });
  assert.ok(longKm > 290 && longKm < 305, `${longKm}`);
  assert.equal(distanceKm(BANQIAO_STATION, null), null);
  assert.equal(distanceKm(null, TAIPEI_101), null);
  assert.equal(distanceKm(BANQIAO_STATION, { lat: 25, lng: null }), null);
});

test("formatDistance：10 公里內到小數一位，最少 0.1；以上取整數", () => {
  assert.equal(formatDistance(0.02), "距離約 0.1 公里");
  assert.equal(formatDistance(0.84), "距離約 0.8 公里");
  assert.equal(formatDistance(3), "距離約 3.0 公里");
  assert.equal(formatDistance(10.4), "距離約 10 公里");
  assert.equal(formatDistance(null), "");
});

test("rankByDistance：由近到遠，沒有座標的排最後；可限制距離範圍", () => {
  const near = { id: "near", geo: { lat: 25.0117, lng: 121.4637 } };
  const mid = { id: "mid", geo: { lat: 24.9993, lng: 121.499 } };
  const far = { id: "far", geo: TAIPEI_101 };
  const none1 = { id: "none1", geo: null };
  const none2 = { id: "none2" };
  const ranked = rankByDistance([far, none1, mid, near, none2], BANQIAO_STATION);
  assert.deepEqual(ranked.map((r) => r.resource.id), ["near", "mid", "far", "none1", "none2"]);
  assert.equal(ranked.at(-1).distanceKm, null);

  const within5 = rankByDistance([far, none1, mid, near], BANQIAO_STATION, { radiusKm: 5 });
  assert.deepEqual(within5.map((r) => r.resource.id), ["near", "mid", "none1"], "範圍外的排除，沒有座標的保留在最後");
  assert.deepEqual(rankByDistance([], BANQIAO_STATION), []);
});

test("checkGeo：選填；需成對、為數字、在臺灣範圍內", () => {
  assert.deepEqual(checkGeo("", ""), { ok: true, geo: null });
  assert.deepEqual(checkGeo(" 25.0143 ", "121.4635"), { ok: true, geo: BANQIAO_STATION });
  assert.deepEqual(checkGeo(24.4321, 118.3171), { ok: true, geo: { lat: 24.4321, lng: 118.3171 } }, "金門");
  assert.deepEqual(checkGeo("25", ""), { ok: false, error: GEO_MESSAGES.incomplete });
  assert.deepEqual(checkGeo("25.01x", "121.46"), { ok: false, error: GEO_MESSAGES.not_number });
  assert.deepEqual(checkGeo("121.4635", "25.0143"), { ok: false, error: GEO_MESSAGES.out_of_range }, "經緯度填反");
  assert.deepEqual(checkGeo("35.68", "139.76"), { ok: false, error: GEO_MESSAGES.out_of_range }, "東京");
});

test("parseMapLink：常見的 Google 地圖連結格式", () => {
  const cases = [
    ["https://www.google.com/maps/place/%E6%9D%BF%E6%A9%8B/@25.0143,121.4635,17z/data=!3m1!4b1", BANQIAO_STATION],
    // 地點標記 !3d!4d 優先於畫面中心 @
    ["https://www.google.com/maps/place/x/@25.0,121.4,15z/data=!4m6!3m5!1s0x0:0x0!8m2!3d25.0143!4d121.4635", BANQIAO_STATION],
    ["https://www.google.com/maps/search/?api=1&query=25.0143%2C121.4635", BANQIAO_STATION],
    ["https://maps.google.com/?q=25.0143,121.4635", BANQIAO_STATION],
    ["https://www.google.com/maps?ll=25.0143,121.4635&z=16", BANQIAO_STATION],
    ["https://www.google.com/maps/dir/?api=1&destination=25.0143,121.4635", BANQIAO_STATION],
    ["25.0143, 121.4635", BANQIAO_STATION],
    ["25.0143，121.4635", BANQIAO_STATION],
  ];
  for (const [link, geo] of cases) assert.deepEqual(parseMapLink(link), { ok: true, geo }, link);
});

test("parseMapLink：讀不到座標時說明原因", () => {
  assert.deepEqual(parseMapLink("https://maps.app.goo.gl/AbCdEf123"), { ok: false, error: GEO_MESSAGES.short_link });
  assert.deepEqual(parseMapLink("https://www.google.com/maps/place/板橋車站"), { ok: false, error: GEO_MESSAGES.not_found });
  assert.deepEqual(parseMapLink(""), { ok: false, error: GEO_MESSAGES.not_found });
  assert.deepEqual(parseMapLink("https://www.google.com/maps/@35.68,139.76,15z"), {
    ok: false,
    error: GEO_MESSAGES.out_of_range,
  });
});

test("geolocationErrorMessage：拒絕、無法取得、逾時、不支援各有說明", () => {
  const messages = [1, 2, 3, "unsupported", "insecure"].map(geolocationErrorMessage);
  assert.equal(new Set(messages).size, messages.length);
  assert.match(geolocationErrorMessage(1), /允許/);
  assert.match(geolocationErrorMessage("unsupported"), /不支援/);
});
