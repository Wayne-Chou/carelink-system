// 跨頁的一次性提示：上一頁寫入，下一頁取出後即清除
// 只存在記憶體中，重新整理頁面就會消失，適合「已儲存變更」這類操作後的回饋

let pending = null;

// message 需含 type，用來讓接收頁只取出屬於自己的提示
export function setFlash(message) {
  pending = message;
}

// 取出指定 type 的提示；type 不符時回傳 null，且不清除（留給正確的頁面）
export function consumeFlash(type) {
  if (!pending || pending.type !== type) return null;
  const message = pending;
  pending = null;
  return message;
}
