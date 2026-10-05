import { test } from "node:test";
import assert from "node:assert/strict";
import { consumeFlash, setFlash } from "../src/utils/flash.js";

test("取出後即清除，只能取一次", () => {
  setFlash({ type: "resource-saved", id: "a", name: "健走班", missing: 2 });
  assert.deepEqual(consumeFlash("resource-saved"), { type: "resource-saved", id: "a", name: "健走班", missing: 2 });
  assert.equal(consumeFlash("resource-saved"), null);
});

test("type 不符時不取出也不清除", () => {
  setFlash({ type: "resource-saved", id: "a" });
  assert.equal(consumeFlash("other"), null);
  assert.equal(consumeFlash("resource-saved").id, "a");
});

test("新的提示會覆蓋尚未取出的舊提示", () => {
  setFlash({ type: "resource-saved", id: "old" });
  setFlash({ type: "resource-saved", id: "new" });
  assert.equal(consumeFlash("resource-saved").id, "new");
});
