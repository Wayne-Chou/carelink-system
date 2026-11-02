# CareLink 社區資源平台（原型）

協助醫療院所找出需要社會支持的民眾，把他們轉介到社區裡合適的活動或服務（社會處方），並持續追蹤到結案。

> **目前為原型。** 沒有後端與資料庫，所有資料（資源、評估、個案、帳號、登入狀態）都存在瀏覽器的 sessionStorage，關閉分頁或瀏覽器後清除。只能使用虛構資料。

## 用途

- **民眾**：不需登入，在首頁與探索頁找社區資源，可依地區、需求或目前位置篩選。
- **判讀人員**：請民眾填寫生活近況評估表，判讀燈號（紅、橘、黃、綠）；橘燈且取得同意時自動開案。
- **健康管理員**：個案五階段（辨識、諮詢、連結、追蹤、結案），轉介民眾到資源並追蹤 1、3、6 個月。
- **資源管理員**：維護社區資源資料與風險評級，綁定資源點帳號。
- **資源點**：回報轉介來的民眾是否開始參加，並更新自己資源的資料。
- **系統管理員**：審核帳號申請、停用與建立帳號，可使用全部功能。

右下角「?」按鈕（原型展示用）可載入示範資料、開啟模擬信箱、重看操作導覽。示範帳號見登入頁的「快速登入（示範用）」。

## 技術

- Vue 3（`<script setup>`）、vue-router 4（hash 模式）、Vite 5
- Bootstrap 5（樣式）、Font Awesome 7、driver.js 1.4.0（操作導覽）
- 測試：Node 內建的 test runner（`node --test`）

## 啟動方式

需要 Node.js 22 以上（`npm test` 以萬用字元指定測試檔，需要較新的 Node）。

```bash
npm install
npm run dev      # 開發伺服器
npm test         # 執行測試
npm run build    # 打包到 dist/
npm run deploy   # 打包後發布到 GitHub Pages
```

## 文件

- [doc/README.md](doc/README.md)：文件總覽
- [doc/specs/](doc/specs/)：資源、評估與個案、帳號三份規格（與目前程式一致）
- [doc/plans/](doc/plans/)：規劃中、尚未實作的計畫
- [doc/open-questions.md](doc/open-questions.md)：待與委託方確認的事項

## 目錄

- `src/pages/`：頁面；`src/components/`：共用元件
- `src/services/`：資料讀寫與商業規則；`src/config/`：設定值、選項與文字
- `src/router/`：路由與權限；`src/utils/`：工具函式
- `tests/`：測試（`fixtures/` 為測試用的虛構資料，`helpers/` 為共用工具）
