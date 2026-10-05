import { test } from "node:test";
import assert from "node:assert/strict";
import { goBack, hasPreviousPage } from "../src/utils/navigation.js";

// 模擬 vue-router：記錄呼叫了 back 還是 push
const mockRouter = (back) => {
  const calls = [];
  return {
    calls,
    options: { history: { state: back === undefined ? null : { back } } },
    back: () => calls.push(["back"]),
    push: (to) => calls.push(["push", to]),
  };
};

test("有上一頁時回上一頁", () => {
  const router = mockRouter("/list");
  assert.equal(hasPreviousPage(router), true);
  goBack(router, "/explore");
  assert.deepEqual(router.calls, [["back"]]);
});

test("直接開啟網址（沒有上一頁）時前往備援頁面", () => {
  for (const back of [null, undefined, ""]) {
    const router = mockRouter(back);
    assert.equal(hasPreviousPage(router), false);
    goBack(router, "/cases");
    assert.deepEqual(router.calls, [["push", "/cases"]]);
  }
});

test("未指定備援頁面時回首頁", () => {
  const router = mockRouter(null);
  goBack(router);
  assert.deepEqual(router.calls, [["push", "/"]]);
});
