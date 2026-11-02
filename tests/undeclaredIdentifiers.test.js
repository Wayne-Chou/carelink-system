// 每個頁面、元件與 src 的 .js 用到的名稱都有宣告或 import
// 起因：個案列表的刪除呼叫 canDeleteCase 卻沒有 import，按下「刪除」才出現 ReferenceError。
// Vite 打包與既有測試都不會執行到頁面的事件處理函式，所以這類錯誤要靠靜態檢查：
// .vue 以 @vue/compiler-sfc 編譯成實際執行的程式（含 template），再找出沒有宣告的名稱
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { babelParse, compileScript, parse, walkIdentifiers } from "@vue/compiler-sfc";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const sourceFiles = (dir = SRC) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(vue|js)$/.test(name) ? [full] : [];
  });

// 瀏覽器與 JavaScript 內建的名稱（Node 的 globalThis 不含瀏覽器專有的部分）
const BROWSER_GLOBALS = [
  "window",
  "document",
  "navigator",
  "location",
  "history",
  "localStorage",
  "sessionStorage",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "ResizeObserver",
  "IntersectionObserver",
  "MutationObserver",
  "HTMLElement",
  "Element",
  "Node",
  "getComputedStyle",
  "matchMedia",
  "scrollTo",
  "open",
];
const GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis), ...BROWSER_GLOBALS, "undefined", "arguments"]);
// 不受檢查：瀏覽器原生的確認、輸入、提示視窗另由 dialogService.test.js 禁止
for (const name of ["confirm", "prompt", "alert"]) GLOBALS.delete(name);

// template 中可以直接使用、不需宣告的名稱（Vue 提供）
const TEMPLATE_GLOBALS = new Set(["$route", "$router", "$emit", "$attrs", "$slots", "$props", "$event", "$el", "$refs"]);

// 模組最上層宣告的名稱：import、const／let／var（含解構）、function、class
function topLevelNames(program) {
  const names = new Set();
  const addPattern = (node) => {
    if (!node) return;
    if (node.type === "Identifier") names.add(node.name);
    else if (node.type === "ObjectPattern") node.properties.forEach((p) => addPattern(p.value ?? p.argument));
    else if (node.type === "ArrayPattern") node.elements.forEach(addPattern);
    else if (node.type === "RestElement") addPattern(node.argument);
    else if (node.type === "AssignmentPattern") addPattern(node.left);
  };
  for (let stmt of program.body) {
    if (stmt.type.startsWith("Export") && stmt.declaration) stmt = stmt.declaration;
    if (stmt.type === "ImportDeclaration") stmt.specifiers.forEach((s) => names.add(s.local.name));
    else if (stmt.type === "VariableDeclaration") stmt.declarations.forEach((d) => addPattern(d.id));
    else if (stmt.type === "FunctionDeclaration" || stmt.type === "ClassDeclaration") names.add(stmt.id.name);
  }
  return names;
}

// 回傳沒有宣告的名稱（含 template 中以 _ctx. 存取、但 script 沒有提供的名稱）
function undeclaredIn(code) {
  const program = babelParse(code, { sourceType: "module" }).program;
  const known = Object.create(null);
  for (const name of topLevelNames(program)) known[name] = 1;
  const missing = new Set();
  walkIdentifiers(
    program,
    (node) => {
      if (!GLOBALS.has(node.name)) missing.add(node.name);
    },
    false,
    [],
    known
  );
  for (const [, name] of code.matchAll(/\b_ctx\.([$\w]+)/g)) {
    if (!TEMPLATE_GLOBALS.has(name)) missing.add(`${name}（template）`);
  }
  return [...missing];
}

function compiledCode(file) {
  const source = readFileSync(file, "utf8");
  if (file.endsWith(".js")) return source;
  const { descriptor } = parse(source, { filename: file });
  if (!descriptor.scriptSetup && !descriptor.script) return "";
  // inlineTemplate：template 編譯進 setup，script 沒有提供的名稱會變成 _ctx.名稱
  return compileScript(descriptor, { id: "check", inlineTemplate: true }).content;
}

test("src 的 .vue 與 .js 用到的名稱都有宣告或 import", () => {
  const problems = [];
  for (const file of sourceFiles()) {
    const missing = undeclaredIn(compiledCode(file));
    if (missing.length) problems.push(`${relative(SRC, file)}：${missing.join("、")}`);
  }
  assert.deepEqual(problems, []);
});

test("檢查本身有效：漏 import 的函式會被抓到", () => {
  const sfc = `<script setup>
import { deleteCase } from "../services/caseService.js";
const removeCase = (item) => {
  const check = canDeleteCase(item);
  if (check.ok) deleteCase(item.id);
};
</script>
<template><button @click="removeCase(item)">刪除</button>{{ notProvided }}</template>`;
  const { descriptor } = parse(sfc, { filename: "Sample.vue" });
  const code = compileScript(descriptor, { id: "sample", inlineTemplate: true }).content;
  assert.deepEqual(undeclaredIn(code).sort(), ["canDeleteCase", "item（template）", "notProvided（template）"].sort());
});
