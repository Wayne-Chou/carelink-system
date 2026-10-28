import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { openPendingCases } from "./services/assessmentService.js";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "@fortawesome/fontawesome-free/css/all.min.css";

// AUTO_OPEN_CASE 開啟時，替先前判讀為橘燈轉介或退縮、尚未開案的評估補開案（設定在 config/assessmentRules.js）
const backfill = openPendingCases();
if (backfill.opened.length || backfill.failed.length) {
  console.info("[補開案]", backfill);
}

createApp(App).use(router).mount("#app");
