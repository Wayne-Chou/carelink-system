// 確認規格文件與程式設定一致，避免改了設定卻忘了更新文件
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as rules from "../src/config/resourceRules.js";

const doc = readFileSync(new URL("../doc/specs/resource-schema.md", import.meta.url), "utf8");

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

test("第十二節列出所有設定，且值與程式一致", () => {
  const rows = settingRows(section("十二、設定開關"));
  assert.deepEqual(Object.keys(rows).sort(), Object.keys(SETTINGS).sort());
  for (const [name, value] of Object.entries(SETTINGS)) {
    assert.equal(rows[name], JSON.stringify(value), name);
  }
});

// ── 待確認事項集中在 doc/open-questions.md ──
const readDoc = (path) => readFileSync(new URL(`../doc/${path}`, import.meta.url), "utf8");
const SPECS = ["specs/resource-schema.md", "specs/assessment-schema.md", "specs/account-schema.md"];
const openQuestions = readDoc("open-questions.md");

test("規格不再另列待確認事項，改為連到 doc/open-questions.md", () => {
  for (const path of SPECS) {
    const text = readDoc(path);
    assert.doesNotMatch(text, /^- \[[ x]\] /m, `${path} 不應有待確認清單`);
    assert.ok(text.includes("(../open-questions.md)"), `${path} 連到 open-questions.md`);
  }
});

test("open-questions.md 每一項都標示狀態：已確認、待確認或已過時", () => {
  const rows = openQuestions
    .slice(openQuestions.indexOf("## A."))
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| 狀態") && !line.startsWith("| ---"));
  assert.ok(rows.length > 40, "項目數");
  for (const row of rows) assert.match(row, /^\| (✅ 已確認|⏳ 待確認|⛔ 已過時) \|/, row);
});

test("open-questions.md 引用的設定都存在於程式中", async () => {
  const assessmentRules = await import("../src/config/assessmentRules.js");
  const names = [...openQuestions.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map(([, name]) => name);
  assert.ok(names.length > 0);
  for (const name of names) assert.ok(name in rules || name in assessmentRules, name);
});

test("doc/README.md 列出 doc 底下所有文件", () => {
  const readme = readDoc("README.md");
  const files = ["open-questions.md", ...["specs", "plans"].flatMap((dir) =>
    readdirSync(new URL(`../doc/${dir}`, import.meta.url)).map((f) => `${dir}/${f}`)
  )];
  for (const file of files) assert.ok(readme.includes(`](${file})`), file);
});

test("assessment-schema 第九節列出所有設定，且值與 assessmentRules.js 一致", async () => {
  const assessmentRules = await import("../src/config/assessmentRules.js");
  const text = readFileSync(new URL("../doc/specs/assessment-schema.md", import.meta.url), "utf8");
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
