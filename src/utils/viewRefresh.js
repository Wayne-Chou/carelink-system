// 重新載入目前的頁面元件（不重新整理瀏覽器）：App.vue 以 viewVersion 作為 router-view 元件的 key
// 角色預覽載入示範資料或切換登入角色後呼叫，讓目前頁面重新讀取資料與登入者

import { ref } from "vue";

export const viewVersion = ref(0);

export function refreshView() {
  viewVersion.value += 1;
}
