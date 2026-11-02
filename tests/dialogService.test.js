// 畫面內對話框（dialogService ＋ AppDialog）：取代瀏覽器原生的 confirm、prompt、alert
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const {
  dialogState,
  confirmDialog,
  promptDialog,
  alertDialog,
  acceptDialog,
  cancelDialog,
  cancelAllDialogs,
  inputProblem,
  messageParagraphs,
} = await import("../src/services/dialogService.js");

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const read = (path) => readFileSync(join(SRC, path), "utf8").replace(/\r\n/g, "\n");
const sourceFiles = (dir = SRC) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(vue|js)$/.test(name) ? [full] : [];
  });

beforeEach(() => cancelAllDialogs());

describe("dialogService", () => {
  test("確認：按確定回傳 true、按取消回傳 false", async () => {
    const yes = confirmDialog({ id: "t1", title: "確定？" });
    assert.equal(dialogState.current.id, "t1");
    assert.equal(dialogState.current.confirmText, "確定");
    acceptDialog();
    assert.equal(await yes, true);
    assert.equal(dialogState.current, null);

    const no = confirmDialog({ id: "t2", title: "確定？" });
    cancelDialog();
    assert.equal(await no, false);
  });

  test("輸入：回傳去除前後空白的文字；取消回傳 null；必填時空白不能送出", async () => {
    const named = promptDialog({ id: "t3", input: { label: "個案姓名", required: true } });
    assert.equal(inputProblem(dialogState.current), "請輸入個案姓名");
    assert.equal(acceptDialog(), false, "空白時不關閉");
    dialogState.current.value = "  王示範  ";
    assert.equal(acceptDialog(), true);
    assert.equal(await named, "王示範");

    const cancelled = promptDialog({ id: "t4", input: { label: "姓名" } });
    cancelDialog();
    assert.equal(await cancelled, null);
  });

  test("輸入指定文字（例如資源名稱）才能送出", async () => {
    const result = promptDialog({ id: "t5", input: { label: "請輸入名稱", expected: "範例資源" } });
    const dialog = dialogState.current;
    assert.equal(inputProblem(dialog), "請輸入「範例資源」");
    assert.equal(acceptDialog(), false, "還沒輸入時不能送出");
    dialog.value = "範例";
    assert.equal(inputProblem(dialog), "輸入內容不符");
    assert.equal(acceptDialog(), false);
    dialog.value = "範例資源";
    assert.equal(acceptDialog(), true);
    assert.equal(await result, "範例資源");
  });

  test("提示：只有一個按鈕「我知道了」", async () => {
    const done = alertDialog({ id: "t6", title: "提示" });
    assert.equal(dialogState.current.kind, "alert");
    assert.equal(dialogState.current.confirmText, "我知道了");
    acceptDialog();
    assert.equal(await done, undefined);
  });

  test("一次只顯示一個，依序顯示；換頁時全部視為取消", async () => {
    const first = confirmDialog({ id: "a" });
    const second = promptDialog({ id: "b", input: {} });
    assert.equal(dialogState.current.id, "a");
    acceptDialog();
    assert.equal(await first, true);
    assert.equal(dialogState.current.id, "b");
    const third = confirmDialog({ id: "c" });
    cancelAllDialogs();
    assert.equal(await second, null);
    assert.equal(await third, false);
    assert.equal(dialogState.current, null);
    assert.equal(dialogState.queue.length, 0);
  });

  test("沒有 id 時拋出錯誤（導覽要靠 id 框起對話框）", () => {
    assert.throws(() => confirmDialog({ title: "沒有 id" }), /id/);
  });

  test("訊息依空行分段", () => {
    assert.deepEqual(messageParagraphs("第一段\n\n第二段\n\n"), ["第一段", "第二段"]);
    assert.deepEqual(messageParagraphs(""), []);
  });
});

describe("各頁改用畫面內對話框", () => {
  test("src 中不再使用瀏覽器原生的 confirm、prompt、alert", () => {
    const native = /(^|[^.\w])(window\.)?(confirm|prompt|alert)\(/;
    for (const file of sourceFiles()) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => assert.doesNotMatch(line, native, `${file}:${i + 1}`));
    }
  });

  test("每處對話框都有 id，且導覽可以框起的 id 都列在這裡", () => {
    const expected = {
      "pages/AccountManagement.vue": ["account-suspend", "account-create-admin"],
      "pages/AssessmentNew.vue": ["assessment-leave"],
      "pages/AssessmentReview.vue": ["assessment-void"],
      "pages/ResourceForm.vue": ["resource-map-address"],
      "pages/ResourceDetail.vue": ["resource-rebind", "resource-unbind"],
      "pages/ResourceList.vue": ["resource-terminate", "resource-delete"],
      "pages/CaseList.vue": ["case-create", "case-delete-blocked", "case-delete"],
      "pages/CaseDetail.vue": ["case-return-after-failure", "case-return", "case-return-after-worse"],
      "components/HelpButton.vue": ["demo-load", "demo-loaded", "demo-load-failed"],
    };
    for (const [file, ids] of Object.entries(expected)) {
      const found = [...read(file).matchAll(/(?:confirm|prompt|alert)Dialog\(\{\s*id: "([^"]+)"/g)].map((m) => m[1]);
      assert.deepEqual([...new Set(found)], ids, file);
    }
  });

  test("AppDialog 掛在 App.vue，並提供導覽用的 data-tour 標記", () => {
    assert.match(read("App.vue"), /<AppDialog \/>/);
    const dialog = read("components/AppDialog.vue");
    assert.match(dialog, /:data-tour="`dialog-\$\{dialog\.id\}`"/);
    for (const mark of ["dialog-confirm", "dialog-cancel", "dialog-input"]) {
      assert.match(dialog, new RegExp(`data-tour="${mark}"`), mark);
    }
    assert.match(dialog, /aria-modal="true"/);
    assert.match(dialog, /stopPropagation/, "Esc 不傳到後方面板");
  });
});
