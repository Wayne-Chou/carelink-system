import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../pages/Home.vue";
import ResourceList from "../pages/ResourceList.vue";
import ResourceForm from "../pages/ResourceForm.vue";
import SuccessView from "../pages/SuccessView.vue";
import UserHome from "../pages/UserHome.vue";
const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/list", name: "list", component: ResourceList },
  { path: "/form", name: "form", component: ResourceForm },
  { path: "/user", name: "user", component: UserHome },
  { path: "/success", name: "success", component: SuccessView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
