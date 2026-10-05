import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  HIDE_UNCONFIRMED_IN_EXPLORE,
  REQUIRE_RISK_LEVEL_FOR_RECOMMEND,
  getRecommendationHints,
  getVisibility,
  isRecommendable,
} from "../src/config/resourceRules.js";

const base = (patch = {}) => ({
  status: "active",
  partnership: "formal",
  riskLevel: "green",
  ...patch,
});

describe("isRecommendable：第九節推薦規則", () => {
  test("活躍、已確認合作、綠燈或黃燈：探索頁與轉介選單都顯示", () => {
    for (const riskLevel of ["green", "yellow"]) {
      assert.equal(isRecommendable(base({ riskLevel }), "explore"), true);
      assert.equal(isRecommendable(base({ riskLevel }), "referral"), true);
    }
    assert.equal(isRecommendable(base({ partnership: "verbal" }), "referral"), true);
  });

  test("紅燈、暫停、季節性、終止：都不推薦", () => {
    for (const patch of [
      { riskLevel: "red" },
      { status: "paused" },
      { status: "seasonal" },
      { status: "terminated" },
    ]) {
      assert.equal(isRecommendable(base(patch), "explore"), false, JSON.stringify(patch));
      assert.equal(isRecommendable(base(patch), "referral"), false, JSON.stringify(patch));
    }
  });

  test("合作尚未確認：轉介選單隱藏，探索頁依 HIDE_UNCONFIRMED_IN_EXPLORE", () => {
    const resource = base({ partnership: "unconfirmed" });
    assert.equal(isRecommendable(resource, "referral"), false);
    assert.equal(isRecommendable(resource, "explore"), !HIDE_UNCONFIRMED_IN_EXPLORE);
  });

  test("沒有風險等級：依 REQUIRE_RISK_LEVEL_FOR_RECOMMEND 決定是否推薦", () => {
    assert.equal(REQUIRE_RISK_LEVEL_FOR_RECOMMEND, true, "目前設定應為 true");
    for (const riskLevel of ["", null, undefined, "unknown"]) {
      assert.equal(isRecommendable(base({ riskLevel }), "explore"), false, `riskLevel=${riskLevel}`);
      assert.equal(isRecommendable(base({ riskLevel }), "referral"), false, `riskLevel=${riskLevel}`);
    }
  });

  test("空值不推薦", () => {
    assert.equal(isRecommendable(null), false);
    assert.equal(isRecommendable(undefined), false);
  });
});

describe("getRecommendationHints", () => {
  test("黃燈提示需陪同", () => {
    assert.deepEqual(getRecommendationHints(base({ riskLevel: "yellow" })), ["needs_escort"]);
  });

  test("沒有風險等級提示尚未評估", () => {
    assert.ok(getRecommendationHints(base({ riskLevel: "" })).includes("risk_unassessed"));
    assert.ok(!getRecommendationHints(base()).includes("risk_unassessed"));
  });

  test("多個原因同時列出", () => {
    assert.deepEqual(
      getRecommendationHints(base({ status: "paused", partnership: "unconfirmed", riskLevel: "red" })),
      ["paused", "contact_needed", "risk_tracking"]
    );
  });
});

describe("getVisibility：曝光狀態與原因", () => {
  test("可推薦的資源兩處都顯示，沒有原因", () => {
    assert.deepEqual(getVisibility(base()), {
      explore: { visible: true, reasons: [] },
      referral: { visible: true, reasons: [] },
    });
  });

  test("黃燈只是提示，不列為隱藏原因", () => {
    const v = getVisibility(base({ riskLevel: "yellow" }));
    assert.equal(v.referral.visible, true);
    assert.deepEqual(v.referral.reasons, []);
  });

  test("未做風險評估：兩處都隱藏，原因為 risk_unassessed", () => {
    const v = getVisibility(base({ riskLevel: "" }));
    assert.equal(v.explore.visible, false);
    assert.deepEqual(v.explore.reasons, ["risk_unassessed"]);
    assert.deepEqual(v.referral.reasons, ["risk_unassessed"]);
  });

  test("合作尚未確認：探索頁的原因依 HIDE_UNCONFIRMED_IN_EXPLORE", () => {
    const v = getVisibility(base({ partnership: "unconfirmed" }));
    assert.deepEqual(v.referral.reasons, ["contact_needed"]);
    assert.deepEqual(v.explore.reasons, HIDE_UNCONFIRMED_IN_EXPLORE ? ["contact_needed"] : []);
  });

  test("任何組合下：顯示與否和有沒有原因一致", () => {
    for (const status of ["active", "paused", "seasonal", "terminated"]) {
      for (const partnership of ["formal", "verbal", "unconfirmed"]) {
        for (const riskLevel of ["green", "yellow", "red", ""]) {
          const v = getVisibility({ status, partnership, riskLevel });
          for (const ctx of ["explore", "referral"]) {
            assert.equal(
              v[ctx].visible,
              v[ctx].reasons.length === 0,
              `${ctx} ${status}/${partnership}/${riskLevel || "(空)"}`
            );
          }
        }
      }
    }
  });

  test("空值不會出錯", () => {
    assert.equal(getVisibility(null).explore.visible, false);
  });
});

test("每個隱藏原因代碼都有中文標籤", async () => {
  const { VISIBILITY_REASON_LABELS } = await import("../src/config/resourceOptions.js");
  const codes = new Set();
  for (const status of ["active", "paused", "seasonal", "terminated"]) {
    for (const partnership of ["formal", "verbal", "unconfirmed"]) {
      for (const riskLevel of ["green", "yellow", "red", ""]) {
        const v = getVisibility({ status, partnership, riskLevel });
        [...v.explore.reasons, ...v.referral.reasons].forEach((c) => codes.add(c));
      }
    }
  }
  for (const code of codes) assert.ok(VISIBILITY_REASON_LABELS[code], `缺少 ${code} 的標籤`);
});
