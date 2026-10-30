// 頁面上的連結與按鈕：導向需要登入的頁面時，一律經過 canOpen（composables/useCanOpen.js）判斷是否顯示
// 1. 靜態檢查：解析每個 .vue 的 template，找出所有導向（router-link、@click／@keydown 中的 router.push／replace，
//    以及呼叫 script 中會 router.push／replace 的函式），目標不是公開頁時，元素本身或外層的 v-if、
//    或事件處理式本身必須呼叫 canOpen(...)
// 2. 權限檢查：canOpen 的判斷與路由守衛相同；每個角色在每個頁面看到的連結都能通過權限檢查
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "@vue/compiler-sfc";
import { memoryStorage } from "./helpers/memoryStorage.js";

const session = memoryStorage();
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = session;

const { PUBLIC_ROUTES, ROUTE_ACCESS, routeMeta } = await import("../src/router/access.js");
const { canOpenRoute, checkRouteAccess } = await import("../src/services/accessControl.js");
const { getAssessmentById } = await import("../src/services/assessmentService.js");
const { loadDemoData } = await import("../src/services/demoData.js");
const { DEMO_ACCOUNTS, ROLE_CODES } = await import("../src/config/roles.js");
const auth = await import("../src/utils/auth.js");
const { ROLE_PREVIEW_LINK } = await import("../src/config/help.js");

// 樣板中直接使用的網址常數 → 網址
const KNOWN_TARGETS = { ROLE_PREVIEW_LINK: ROLE_PREVIEW_LINK.path };

// ── 網址 → 路由名稱：以與實際相同的路由表解析（舊網址只是導向，不算數，頁面上必須用新網址）──
const { resolvePath } = await import("./helpers/routing.js");
const routeNameOf = (path) => resolvePath(path).name ?? null;

// 以示意值代入網址中的變數：`/case/${id}` → /case/x
const literalPath = (text) => {
  const t = text.trim();
  if (t in KNOWN_TARGETS) return KNOWN_TARGETS[t];
  const quoted = /^(['"`])([\s\S]*)\1$/.exec(t);
  if (quoted) return quoted[2].replace(/\$\{[^}]*\}/g, "x");
  const objectPath = /^\{[\s\S]*?\bpath:\s*(['"`])([^'"`]*)\1[\s\S]*\}$/.exec(t);
  if (objectPath) return objectPath[2];
  if (/^\{[\s\S]*\}$/.test(t) && !/\bpath:/.test(t)) return ""; // 只改 query：停留在同一頁
  return null; // 變數或運算式：無法靜態判斷
};

// 呼叫的參數文字（括號配對）
function callArgument(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      if (depth === 0) return text.slice(start, i);
      depth -= 1;
    }
  }
  return text.slice(start);
}

const NAV_CALL = /\$?router\.(push|replace)\(/;
const navTargetIn = (code) => {
  const m = NAV_CALL.exec(code);
  return m ? callArgument(code, m.index + m[0].length) : null;
};

// script 中的函式本體（到下一個頂層宣告為止）
function functionBody(script, name) {
  const start = script.search(new RegExp(`^(const|function) ${name}\\b`, "m"));
  if (start < 0) return null;
  const rest = script.slice(start + 1);
  const end = rest.search(/^(const |function |\/\/ |watch\(|onMounted\()/m);
  return end < 0 ? rest : rest.slice(0, end);
}

// 不需檢查的導向與原因
const EXEMPT = {
  "RolePreview.vue enterAsRole": "先以該角色的示範帳號登入，再前往該角色的首頁（tests/rolePreview.test.js 檢查首頁網址）",
};

function collectNavigations(file, source) {
  const { descriptor } = parse(source, { filename: file });
  const script = descriptor.scriptSetup?.content ?? descriptor.script?.content ?? "";
  const found = [];

  const walk = (node, guardedByAncestor) => {
    if (node.type !== 1) {
      (node.children ?? []).forEach((c) => walk(c, guardedByAncestor));
      return;
    }
    const dirs = node.props.filter((p) => p.type === 7);
    const conditionGuard = dirs.some((d) => ["if", "else-if"].includes(d.name) && d.exp?.content.includes("canOpen("));
    const guarded = guardedByAncestor || conditionGuard;

    if (node.tag === "router-link") {
      const staticTo = node.props.find((p) => p.type === 6 && p.name === "to");
      const boundTo = dirs.find((d) => d.name === "bind" && d.arg?.content === "to");
      const target = staticTo ? literalPath(`"${staticTo.value.content}"`) : literalPath(boundTo?.exp.content ?? "");
      found.push({ file, line: node.loc.start.line, what: "router-link", target, guarded });
    }
    for (const d of dirs.filter((x) => x.name === "on" && /^(click|keydown)/.test(x.arg?.content ?? ""))) {
      const exp = d.exp?.content ?? "";
      const handlerGuard = exp.includes("canOpen(");
      let arg = navTargetIn(exp);
      let what = exp;
      if (arg === null) {
        const fn = /^([a-zA-Z_]\w*)\s*(\(|$)/.exec(exp.replace(/^.*&&\s*/, ""))?.[1];
        const body = fn ? functionBody(script, fn) : null;
        arg = body ? navTargetIn(body) : null;
        what = fn ?? exp;
        if (EXEMPT[`${file} ${fn}`]) continue;
      }
      if (arg === null) continue; // 沒有導向
      found.push({ file, line: d.loc.start.line, what, target: literalPath(arg), guarded: guarded || handlerGuard });
    }
    node.children.forEach((c) => walk(c, guarded));
  };
  if (descriptor.template?.ast) walk(descriptor.template.ast, false);
  return found;
}

const VUE_FILES = ["pages", "components"].flatMap((dir) =>
  readdirSync(new URL(`../src/${dir}`, import.meta.url))
    .filter((f) => f.endsWith(".vue"))
    .map((f) => ({ file: f, source: readFileSync(new URL(`../src/${dir}/${f}`, import.meta.url), "utf8") }))
);
const NAVIGATIONS = VUE_FILES.flatMap(({ file, source }) => collectNavigations(file, source));
const isPublicTarget = (target) => target === "" || (target !== null && PUBLIC_ROUTES.includes(routeNameOf(target)));

describe("靜態檢查：導向需登入頁面的連結與按鈕都經過 canOpen", () => {
  test("找得到各頁的導向（檢查本身有效）", () => {
    assert.ok(NAVIGATIONS.length > 40, `只找到 ${NAVIGATIONS.length} 個`);
    const personal = NAVIGATIONS.find((n) => n.file === "ResourceList.vue" && n.target === "/admin/cases");
    assert.ok(personal?.guarded, "資源列表的「個人端」（/admin/cases）經過 canOpen");
  });

  test("每個導向的目標都是公開頁，或經過 canOpen", () => {
    const unguarded = NAVIGATIONS.filter((n) => !n.guarded && !isPublicTarget(n.target));
    assert.deepEqual(
      unguarded.map((n) => `${n.file}:${n.line} ${n.what} → ${n.target ?? "（變數）"}`),
      [],
      "請用 v-if=\"canOpen(...)\" 包住，或在事件處理式中先判斷 canOpen(...)"
    );
  });

  test("靜態網址都對應到存在的路由", () => {
    for (const n of NAVIGATIONS.filter((x) => x.target)) {
      assert.ok(routeNameOf(n.target), `${n.file}:${n.line} ${n.target} 沒有對應的路由`);
    }
  });
});

describe("權限檢查：canOpen 與路由守衛一致", () => {
  beforeEach(() => {
    session.data = {};
  });

  const userOf = (role) => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role);
    auth.login({ email: account.email, password: account.password });
    const user = auth.getCurrentUser();
    auth.clearCurrentUser();
    return user;
  };

  const routeOf = (name, id) => ({ name, params: { id }, matched: [{}], meta: routeMeta(name) });

  test("已登入：有權限才顯示，與路由守衛的結果相同", () => {
    const demo = loadDemoData();
    const idFor = { "assessment-review": demo.assessment.id, "case-detail": demo.case.id };
    for (const role of ROLE_CODES) {
      const user = userOf(role);
      for (const name of Object.keys(ROUTE_ACCESS)) {
        const route = routeOf(name, idFor[name] ?? demo.resource.id);
        const options = { findAssessment: getAssessmentById };
        assert.equal(canOpenRoute(route, user, options), checkRouteAccess(route, user, options).ok, `${role} ${name}`);
      }
    }
  });

  test("資源管理員看不到「個人端」（個案列表）與「進入資源端」", () => {
    const user = userOf("resource_manager");
    assert.equal(canOpenRoute(routeOf("cases"), user), false);
    assert.equal(canOpenRoute(routeOf("resource-dashboard"), user), false);
    assert.equal(canOpenRoute(routeOf("list"), user), true);
    const admin = userOf("admin");
    assert.equal(canOpenRoute(routeOf("cases"), admin), true);
    assert.equal(canOpenRoute(routeOf("resource-dashboard"), admin), true);
  });

  test("民眾資源頁是公開頁，任何人都能開啟", () => {
    const demo = loadDemoData();
    for (const user of [null, ...ROLE_CODES.map(userOf)]) {
      assert.equal(canOpenRoute(routeOf("user-resource-detail", demo.resource.id), user), true, user?.role ?? "未登入");
    }
  });

  test("尚未登入：需要登入的連結仍顯示（點了先到登入頁）", () => {
    assert.equal(canOpenRoute(routeOf("accounts"), null), true);
    assert.equal(checkRouteAccess(routeOf("accounts"), null).reason, "login");
  });
});
