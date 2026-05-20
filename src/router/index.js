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
import { isAuthenticated } from "../utils/auth.js";

const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/explore", name: "explore", component: Explore },
  { path: "/login", name: "login", component: Login },
  { path: "/register", name: "register", component: Register },
  { path: "/list", name: "list", component: ResourceList, meta: { requiresAuth: true } },
  {
    path: "/resources",
    name: "resources-list",
    component: ResourceList,
    meta: { requiresAuth: true },
  },
  { path: "/form", name: "form", component: ResourceForm, meta: { requiresAuth: true } },
  {
    path: "/user/resources/:id",
    name: "user-resource-detail",
    component: () => import("../pages/ResourceUserDetail.vue"),
  },
  { path: "/success", name: "success", component: SuccessView },
  {
    path: "/resources/:id",
    name: "resource-detail",
    component: ResourceDetail,
    meta: { requiresAuth: true },
  },
  {
    path: "/resource-dashboard",
    name: "resource-dashboard",
    component: ResourceDashboard,
    meta: { requiresAuth: true },
  },
  { path: "/cases", name: "cases", component: CaseList, meta: { requiresAuth: true } },
  { path: "/case/:id", name: "case-detail", component: CaseDetail, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: "login" };
  }
  return true;
});

export default router;
