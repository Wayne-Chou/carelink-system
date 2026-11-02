// 畫面內的確認、輸入、提示對話框（取代瀏覽器原生的 confirm、prompt、alert）
// 頁面呼叫 confirmDialog／promptDialog／alertDialog 取得 Promise；畫面由 App.vue 的 AppDialog 呈現
// 一次只顯示一個；同時要求多個時依序顯示
// 每個對話框都要有 id：AppDialog 以 data-tour="dialog-<id>" 標記，讓導覽可以框起

import { reactive } from "vue";

export const dialogState = reactive({ current: null, queue: [] });

const DEFAULTS = {
  confirm: { confirmText: "確定", cancelText: "取消" },
  prompt: { confirmText: "確定", cancelText: "取消" },
  alert: { confirmText: "我知道了", cancelText: "" },
};

// 取消時的回傳值：confirm 為 false、prompt 為 null、alert 為 undefined
const CANCEL_VALUE = { confirm: false, prompt: null, alert: undefined };

function open(kind, options = {}) {
  if (!options.id) throw new Error("對話框需要 id");
  return new Promise((resolve) => {
    const dialog = {
      kind,
      tone: "default",
      title: "",
      message: "",
      input: null,
      ...DEFAULTS[kind],
      ...options,
      value: options.input?.value ?? "",
      resolve,
    };
    if (dialogState.current) dialogState.queue.push(dialog);
    else dialogState.current = dialog;
  });
}

// 確認：resolve(true／false)
export const confirmDialog = (options) => open("confirm", options);
// 輸入：resolve(輸入的文字（已去除前後空白）／null)
// input：{ label, placeholder, required, expected }；expected 為必須輸入的文字（例如資源名稱）
export const promptDialog = (options) => open("prompt", { ...options, input: { ...options?.input } });
// 提示：只有一個按鈕，resolve() 後繼續
export const alertDialog = (options) => open("alert", options);

// 訊息依空行分段，畫面逐段顯示
export const messageParagraphs = (message) =>
  String(message ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// 輸入框目前的內容是否可以送出；不行時回傳原因（AppDialog 在使用者開始輸入後才顯示在輸入框下方）
export function inputProblem(dialog, value = dialog?.value) {
  if (dialog?.kind !== "prompt") return "";
  const text = String(value ?? "").trim();
  const { required, expected, label } = dialog.input ?? {};
  if (expected !== undefined && text !== expected) return text ? "輸入內容不符" : `請輸入「${expected}」`;
  if (required && !text) return `請輸入${label || "內容"}`;
  return "";
}

const next = () => {
  dialogState.current = dialogState.queue.shift() ?? null;
};

// 按確定：prompt 的內容不符條件時不關閉
export function acceptDialog() {
  const dialog = dialogState.current;
  if (!dialog || inputProblem(dialog)) return false;
  const value = dialog.kind === "confirm" ? true : dialog.kind === "prompt" ? String(dialog.value).trim() : undefined;
  next();
  dialog.resolve(value);
  return true;
}

// 按取消、Esc；alert 的唯一按鈕也走這裡
export function cancelDialog() {
  const dialog = dialogState.current;
  if (!dialog) return;
  next();
  dialog.resolve(CANCEL_VALUE[dialog.kind]);
}

// 換頁時關閉全部（視為取消），避免對話框留在別的頁面上
export function cancelAllDialogs() {
  const pending = [dialogState.current, ...dialogState.queue].filter(Boolean);
  dialogState.current = null;
  dialogState.queue = [];
  for (const dialog of pending) dialog.resolve(CANCEL_VALUE[dialog.kind]);
}
