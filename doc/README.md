# CareLink 文件

| 文件 | 用途 |
| --- | --- |
| [open-questions.md](open-questions.md) | 待與委託方確認事項：三份規格的所有待確認事項，依主題分組，標示已確認、待確認、已過時 |
| [specs/resource-schema.md](specs/resource-schema.md) | 社區資源規格：資源欄位、需求標籤代碼表、評估表與標籤對應、推薦規則與驗證週期、定位推薦、設定開關、資源的編輯權限與修改紀錄 |
| [specs/assessment-schema.md](specs/assessment-schema.md) | 生活近況評估與個案流程規格：角色與權限、評估紀錄、燈號判定與後續處置、個案五階段、待辦、設定開關 |
| [specs/account-schema.md](specs/account-schema.md) | 註冊與帳號管理規格：帳號狀態與登入訊息、註冊申請、審核、停用與建立帳號、設定與重設密碼、模擬信箱 |
| [plans/sites-plan.md](plans/sites-plan.md) | 資源據點與時段結構的實作計畫（規劃中，已暫停，部分前提已過時） |

## 資料夾

- specs/：已實作的規格，內容應與目前程式一致；修改程式時一併更新。規格中的設定開關由 tests/specDoc.test.js 檢查是否與 src/config/ 的值一致。
- plans/：規劃中、尚未實作的計畫。開始實作前需依現況重新評估，完成後把內容併入 specs/ 的規格。
- open-questions.md：委託方回覆後更新狀態與結論；規格中不再另列待確認事項。

原型階段的資料都存在瀏覽器（sessionStorage），只能使用虛構資料。
