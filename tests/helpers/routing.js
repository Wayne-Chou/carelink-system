// 測試用：以與實際相同的路由表（router/routes.js）建立 vue-router，頁面換成空元件
// 用來把網址解析成路由（名稱、參數、權限 meta），以及檢查舊網址的導向
import { createMemoryHistory, createRouter } from "vue-router";
import { ROUTES, buildRoutes } from "../../src/router/routes.js";
import { routeMeta } from "../../src/router/access.js";

const Empty = { render: () => null };
// 版面元件標記一下，方便測試確認哪些頁面在後台版面底下
export const ADMIN_LAYOUT = { name: "AdminLayout", render: () => null };

export function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: buildRoutes(() => Empty, ADMIN_LAYOUT, routeMeta),
  });
}

export const testRouter = createTestRouter();

// 網址 → 路由（不套用舊網址的導向，導向請用 navigateTo）；找不到時 matched 為空陣列
export const resolvePath = (path) => testRouter.resolve(path);

export const ROUTE_NAMES = ROUTES.map((r) => r.name);

// 實際導覽到網址（會套用舊網址的導向），回傳最後到達的路由；不含權限檢查
export async function navigateTo(path) {
  const router = createTestRouter();
  await router.push(path);
  return router.currentRoute.value;
}
