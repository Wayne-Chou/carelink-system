// 頁面上的連結與按鈕：導向目前登入者沒有權限的頁面時一律不顯示
// 用法：const canOpen = useCanOpen();  <button v-if="canOpen('/cases')" ...>
// 判斷與路由守衛相同（accessControl.checkRouteAccess），每次呼叫都讀取目前的登入者
// tests/navLinks.test.js 會檢查每個頁面導向需登入頁面的連結與按鈕都經過 canOpen

import { useRouter } from "vue-router";
import { canOpenRoute } from "../services/accessControl.js";
import { getAssessmentById } from "../services/assessmentService.js";
import { getCurrentUser } from "../utils/auth.js";

export function useCanOpen() {
  const router = useRouter();
  return (to) => canOpenRoute(router.resolve(to), getCurrentUser(), { findAssessment: getAssessmentById });
}
