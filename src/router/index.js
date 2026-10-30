import { createRouter, createWebHashHistory } from "vue-router";
import AdminLayout from "../components/AdminLayout.vue";
import { getAssessmentById } from "../services/assessmentService.js";
import { navigationRedirect } from "../services/accessControl.js";
import { getCurrentUser } from "../utils/auth.js";
import { routeMeta } from "./access.js";
import { buildRoutes } from "./routes.js";

// 網址、頁面與版面寫在 router/routes.js；權限（原型階段，正式版需由後端處理）寫在 router/access.js
// 頁面在進入時才載入
const pages = import.meta.glob("../pages/*.vue");
const componentFor = (page) => pages[`../pages/${page}.vue`];

const router = createRouter({
  history: createWebHashHistory(),
  routes: buildRoutes(componentFor, AdminLayout, routeMeta),
});

// 未登入：先到登入頁，登入後回到原本要去的頁面
// 已登入但沒有權限：導回自己的後台首頁並提示（資源點打開後台首頁時直接進入資源端後台）
router.beforeEach((to) => navigationRedirect(to, getCurrentUser(), { findAssessment: getAssessmentById }) ?? true);

export default router;
