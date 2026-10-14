// 深層複製：可接受 Vue 響應式資料（Proxy）
// structuredClone 無法複製 Proxy，會丟出 DataCloneError；頁面上的 ref／reactive 資料一律用這個函式複製
// 本專案的資料都來自瀏覽器儲存區（JSON 可表示的資料），所以用 JSON 往返複製
export function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
