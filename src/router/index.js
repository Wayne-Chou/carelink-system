import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../pages/Home.vue";
import ResourceList from "../pages/ResourceList.vue";
import ResourceForm from "../pages/ResourceForm.vue";
import SuccessView from "../pages/SuccessView.vue";
import UserHome from "../pages/UserHome.vue";
import ResourceDetail from "../pages/ResourceDetail.vue";
import CaseList from "../pages/CaseList.vue";
import CaseDetail from "../pages/CaseDetail.vue";
import ResourceDashboard from "../pages/ResourceDashboard.vue";
const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/list", name: "list", component: ResourceList },
  { path: "/resources", name: "resources-list", component: ResourceList },
  { path: "/form", name: "form", component: ResourceForm },
  { path: "/user", name: "user", component: UserHome },
  { path: "/success", name: "success", component: SuccessView },
  { path: "/resources/:id", name: "resource-detail", component: ResourceDetail },
  { path: "/resource-dashboard", name: "resource-dashboard", component: ResourceDashboard },
  { path: "/cases", name: "cases", component: CaseList },
  { path: "/case/:id", name: "case-detail", component: CaseDetail },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
