import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../pages/Home.vue";
import ResourceList from "../pages/ResourceList.vue";
import ResourceForm from "../pages/ResourceForm.vue";
import SuccessView from "../pages/SuccessView.vue";
import ResourceDetail from "../pages/ResourceDetail.vue";
import CaseList from "../pages/CaseList.vue";
import CaseDetail from "../pages/CaseDetail.vue";
import ResourceDashboard from "../pages/ResourceDashboard.vue";
import Login from "../pages/Login.vue";
import Register from "../pages/Register.vue";
import Explore from "../pages/Explore.vue";
import AssessmentNew from "../pages/AssessmentNew.vue";
import AssessmentList from "../pages/AssessmentList.vue";
import AssessmentReview from "../pages/AssessmentReview.vue";
import Todo from "../pages/Todo.vue";
import { getAssessmentById } from "../services/assessmentService.js";
import { checkRouteAccess } from "../services/accessControl.js";
import { getCurrentUser } from "../utils/auth.js";
import { routeMeta } from "./access.js";
import { ROLE_PREVIEW_LINK } from "../config/help.js";

// 權限（原型階段，正式版需由後端處理）：各路由需要的功能寫在 router/access.js；沒有列出的是公開頁
const meta = (name) => ({ name, meta: routeMeta(name) });

const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/explore", name: "explore", component: Explore },
  { path: "/login", name: "login", component: Login },
  { path: "/register", name: "register", component: Register },
  { path: "/forgot-password", name: "forgot-password", component: () => import("../pages/ForgotPassword.vue") },
  { path: "/reset-password", name: "reset-password", component: () => import("../pages/ResetPassword.vue") },
  // 模擬信箱：原型展示用，正式版改由後端寄送 Email
  { path: "/mailbox", name: "mailbox", component: () => import("../pages/Mailbox.vue") },
  // 角色預覽（原型展示用）在右下角「?」按鈕的面板；/sitemap 導向首頁並自動打開面板
  { path: "/sitemap", name: "sitemap", redirect: ROLE_PREVIEW_LINK },
  // 評估填寫頁：由工作人員登入後把平板交給民眾填寫
  { path: "/assessment/new", ...meta("assessment-new"), component: AssessmentNew },
  { path: "/assessments", ...meta("assessments"), component: AssessmentList },
  // 判讀頁：判讀人員、系統管理員可判讀；健康管理員只能唯讀查看已開案的評估
  { path: "/assessments/:id", ...meta("assessment-review"), component: AssessmentReview },
  // 待辦：依今天日期即時計算（doc/specs/assessment-schema.md 第七節），依角色只顯示自己的項目
  { path: "/todo", ...meta("todo"), component: Todo },
  { path: "/list", ...meta("list"), component: ResourceList },
  { path: "/resources", ...meta("resources-list"), component: ResourceList },
  { path: "/form", ...meta("form"), component: ResourceForm },
  { path: "/form/:id", ...meta("form-edit"), component: ResourceForm },
  {
    path: "/user/resources/:id",
    ...meta("user-resource-detail"),
    component: () => import("../pages/ResourceUserDetail.vue"),
  },
  { path: "/success", ...meta("success"), component: SuccessView },
  // 資源詳細頁（後台）：系統管理員可編輯；其他角色唯讀，資源點只限自己綁定的資源
  { path: "/resources/:id", ...meta("resource-detail"), component: ResourceDetail },
  { path: "/resource-dashboard", ...meta("resource-dashboard"), component: ResourceDashboard },
  { path: "/cases", ...meta("cases"), component: CaseList },
  { path: "/accounts", ...meta("accounts"), component: () => import("../pages/AccountManagement.vue") },
  { path: "/case/:id", ...meta("case-detail"), component: CaseDetail },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  const result = checkRouteAccess(to, getCurrentUser(), { findAssessment: getAssessmentById });
  if (result.ok) return true;
  // 未登入：登入後回到原本要去的頁面
  if (result.reason === "login") return { name: "login", query: { redirect: to.fullPath } };
  // 沒有權限：導回首頁並提示（首頁看到 denied 參數顯示提示後移除）
  return { name: "home", query: { denied: "1" } };
});

export default router;
