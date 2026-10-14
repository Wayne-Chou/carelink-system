// 確認規格文件與程式設定一致，避免改了設定卻忘了更新文件
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as rules from "../src/config/resourceRules.js";

const doc = readFileSync(new URL("../doc/resource-schema.md", import.meta.url), "utf8");

const section = (title) => {
  const start = doc.indexOf(`## ${title}`);
  assert.ok(start >= 0, `找不到「${title}」`);
  const next = doc.indexOf("\n## ", start + 1);
  return doc.slice(start, next === -1 ? undefined : next);
};

// 表格中「| 設定名稱 | 值 |」的列 → { 名稱: 值 }
const settingRows = (text) =>
  Object.fromEntries(
    [...text.matchAll(/^\| ([A-Z][A-Z_]+) \| ([^|]+?) \|/gm)].map(([, name, value]) => [name, value])
  );

// 程式中的設定：大寫常數，排除代碼表（陣列）
const SETTINGS = Object.fromEntries(
  Object.entries(rules).filter(([name, value]) => /^[A-Z_]+$/.test(name) && !Array.isArray(value))
);

for (const title of ["十二、設定開關", "十三、本階段完成摘要"]) {
  test(`第${title.split("、")[0]}節列出所有設定，且值與程式一致`, () => {
    const rows = settingRows(section(title));
    assert.deepEqual(Object.keys(rows).sort(), Object.keys(SETTINGS).sort());
    for (const [name, value] of Object.entries(SETTINGS)) {
      assert.equal(rows[name], JSON.stringify(value), name);
    }
  });
}

test("第十三節的待確認事項與第十一節一致，已確認的項目兩邊都有標示", () => {
  const items = [...section("十一、待與委託方確認事項").matchAll(/^- \[([ x])\] /gm)].map(
    ([, mark]) => mark === "x"
  );
  const summary = section("十三、本階段完成摘要");
  const table = summary.slice(summary.indexOf("### 待與委託方確認事項"));
  const rows = [...table.matchAll(/^\| (\d+) \| (✅ )?/gm)].map(([, n, done]) => ({
    n: Number(n),
    done: !!done,
  }));
  assert.equal(rows.length, items.length);
  assert.deepEqual(
    rows.map((r) => r.n),
    Array.from({ length: items.length }, (_, i) => i + 1)
  );
  assert.deepEqual(
    rows.map((r) => r.done),
    items,
    "第十一節 [x] 的項目，第十三節應以 ✅ 標示"
  );
});

test("assessment-schema 第九節列出所有設定，且值與 assessmentRules.js 一致", async () => {
  const assessmentRules = await import("../src/config/assessmentRules.js");
  const text = readFileSync(new URL("../doc/assessment-schema.md", import.meta.url), "utf8");
  const start = text.indexOf("## 九、設定開關");
  const ninth = text.slice(start, text.indexOf("\n## ", start + 1));
  // 文件中的底線與方括號有跳脫（FIRST\_CONTACT\_HOURS、\[1, 3, 6\]）
  const unescape = (s) => s.replace(/\\/g, "");
  const rows = Object.fromEntries(
    [...ninth.matchAll(/^\| ([A-Z0-9\\_]+) \| ([^|]+?) \|/gm)].map(([, name, value]) => [
      unescape(name),
      unescape(value).replace(/\s/g, ""),
    ])
  );
  // 程式中的設定：第九節的週期門檻與待確認假設（大寫常數且不是代碼表）
  const settings = Object.fromEntries(
    Object.entries(assessmentRules).filter(
      ([name, value]) =>
        /^[A-Z0-9_]+$/.test(name) &&
        !(Array.isArray(value) && value.some((v) => typeof v === "string"))
    )
  );
  assert.deepEqual(Object.keys(rows).sort(), Object.keys(settings).sort());
  for (const [name, value] of Object.entries(settings)) {
    assert.equal(rows[name], JSON.stringify(value), name);
  }
});
