# CareLink 守望員轉介規格 v1

Nov 3, 2026 · @hank

## 概述

守望員是社區裡發現需要幫忙的人的夥伴（例如里長、志工、社區據點人員）。守望員登入後填寫轉介單，把民眾轉介給健康管理員；健康管理員打開轉介單後決定「開案」或「不開案」。

轉介不需要先取得民眾同意，由健康管理員第一次聯繫時取得：開案後個案從第 1 階段（辨識）開始，勾選「民眾同意轉介給健康管理員」後才能進入第 2 階段。開案後沿用現有的首次聯繫規則（開案 72 小時內首次聯繫），不另訂轉介單的時間規則。

**原型階段：轉介單存在瀏覽器（sessionStorage，關閉分頁後清除），權限只在前端檢查。正式版需改由後端處理。未取得同意即轉介的個資處理需法務確認，見 [doc/open-questions.md](../open-questions.md)「守望員轉介」。**

相關程式：

| 檔案 | 內容 |
| --- | --- |
| src/config/referralLabels.js | 狀態、年齡層、發現的狀況、是否已告知、不開案原因、緊急提醒文字 |
| src/services/referralService.js | 送出、我的轉介、處理中、開案、不開案；頁面一律透過這裡讀寫轉介單 |
| src/services/caseService.js | openCaseFromReferral：由轉介單建立個案（第 1 階段） |
| src/services/todoService.js | 待辦「守望員轉介待處理」 |
| src/pages/ReferralNew.vue、MyReferrals.vue | 守望員：轉介民眾、我的轉介 |
| src/pages/ReferralList.vue、ReferralDetail.vue | 健康管理員、系統管理員：守望員轉介列表、轉介單 |

守望員帳號的申請欄位（所屬單位或社區、身分類別）見 [doc/specs/account-schema.md](account-schema.md) 第二節；角色與權限見 doc/specs/assessment-schema.md 第一節。

## 一、角色與權限

| 功能 | 權限 | 角色 |
| --- | --- | --- |
| 轉介民眾（/admin/referrals/new） | referral.create | 守望員 |
| 我的轉介（/admin/referrals） | referral.own | 守望員 |
| 守望員轉介列表（/admin/cases/referrals）、轉介單（/admin/cases/referrals/:id） | referral.manage | 健康管理員、系統管理員 |

- 守望員的左側選單只有「轉介民眾」「我的轉介」，沒有後台首頁與待辦；登入後直接進入我的轉介，打開 /admin 也直接進入我的轉介。
- 守望員直接輸入其他後台網址時，與其他角色相同：導回自己的預設頁（我的轉介）並提示「您的帳號沒有權限查看此頁」。其他角色也不能進入守望員的兩個頁面。
- 守望員轉介列表放在個案管理底下：個案管理頁左上角的「守望員轉介」按鈕（有待處理時顯示數量），左側選單維持「個案管理」。

## 二、轉介單欄位

| 欄位 | 中文名稱 | 必填 | 說明 |
| --- | --- | --- | --- |
| code | 轉介單編碼 | 系統 | Ref001 起，三位數流水號，與 Res、Ast、Case 一致 |
| status | 狀態 | 系統 | 見第三節 |
| person.name | 被轉介人姓名 | 是 |  |
| person.phone | 聯絡電話 | 是 | 手機或市話，至少 8 個數字，可含連字號、空白、括號 |
| person.city、person.district | 縣市與行政區 | 否 | 沿用 src/config/districts.js；行政區須屬於所選縣市 |
| person.ageGroup | 年齡層 | 否 | under18 未滿 18 歲、adult 18–64 歲、senior 65 歲以上、unknown 不清楚 |
| situations | 發現的狀況 | 是（至少一項） | 可複選：alone 獨居或缺少照顧、mobility 行動不便、financial 經濟困難、lonely 情緒低落或孤單、caregiver 照顧家人壓力大、other 其他 |
| description | 狀況說明 | 是 | 多行文字 |
| informed | 是否已告知當事人會有人聯繫 | 否 | yes 是、no 否、unsure 不確定 |
| watcher | 轉介的守望員 | 系統 | 送出時從帳號帶入一份：name、email、phone、unit（所屬單位或社區）、identity（身分類別文字）；之後帳號資料改變不影響 |
| caseId、caseCode | 開案的個案 | 系統 | 開案時寫入 |
| closedAt | 結案日期 | 系統 | 個案結案時寫入（YYYY-MM-DD，與個案的 closure.closedAt 相同）；不記錄結案原因 |
| decision | 處理結果 | 系統 | { result: opened 或 declined, reason, note, at, actor } |
| createdAt、updatedAt | 送出時間、最後更新 | 系統 |  |
| history | 歷程 | 系統 | 每次狀態變更一筆 { at, action, status, actor, note }；action：submit 守望員送出、process 健康管理員開始處理、open_case 開案、decline 不開案、case_closed 個案結案 |

轉介民眾頁最上方固定顯示「如有立即危險，請直接撥打 110 或 119。」送出後顯示轉介編碼與「健康管理員會盡快處理」。

## 三、狀態與流程

| 狀態 | 代碼 | 進入條件 |
| --- | --- | --- |
| 已送出 | submitted | 守望員送出 |
| 處理中 | processing | 健康管理員（或系統管理員）打開過轉介單，但還沒決定 |
| 已開案 | opened | 按「開案」 |
| 已結案 | closed | 由這張轉介單開案的個案結案（自動改變） |
| 未開案 | declined | 按「不開案」並選擇原因 |

流程：已送出 → 處理中 → 已開案 → 已結案；或 已送出 → 處理中 → 未開案。

- 已開案、已結案、未開案的轉介單不能再開案或不開案。
- 已結案：個案在第 5 階段按「結案」（caseService.advanceStage 進入 closed）時，由 caseService 呼叫 referralService.markReferralCaseClosed，把對應的轉介單從已開案改為已結案，記錄 closedAt 並在歷程加一筆「個案結案」；頁面不直接改轉介單狀態。由評估開案或在個案管理直接新增的個案結案時，不影響任何轉介單。
- 系統沒有取消結案或重新開啟個案的功能：已結案的個案在個案頁為唯讀，caseService.returnToConsultation 也不接受已結案的個案。民眾之後又需要幫忙時，由守望員再送出一張新的轉介單（我的轉介頁面說明會提示）。若之後新增重新開啟個案，需同時把轉介單改回已開案。
- 開案：建立個案，轉介來源（referral.referrerType）為 watcher「守望員轉介」，轉介者為守望員姓名與單位，referral.referralId、referralCode 連結轉介單；被轉介人的姓名、電話帶入個案，發現的狀況、狀況說明、地區寫入轉介原因。個案從第 1 階段開始，consent 為 false。由健康管理員開案時，個案的健康管理員欄位帶入開案者姓名。個案頁顯示「由守望員轉介開案」並連到轉介單。由守望員轉介開案的個案與由評估開案的相同，不能刪除，只能結案。
- 不開案：必選原因（unreachable 聯繫不上、refused 民眾婉拒、has_service 已有其他服務、not_eligible 不符合服務對象、other 其他），說明選填。不建立個案。
- 待辦「守望員轉介待處理」：狀態為已送出或處理中的轉介單（已開案、已結案、未開案不列出），先送出的在前，沒有到期日。給健康管理員；系統管理員在待辦的「全部」「健康管理員」看得到。

## 四、守望員看得到的內容

我的轉介只列出自己送出的轉介單，每筆只有：編碼、被轉介人姓名、送出日期、狀態（已送出、處理中、已開案、已結案、未開案）；未開案時另顯示原因類別，已結案時另顯示「結案日期 …」。看不到個案內容、結案原因、健康管理員填寫的不開案說明與歷程。

健康管理員與系統管理員的守望員轉介列表依狀態分頁：待處理、已送出、處理中、已開案、已結案、未開案、全部。轉介單的「處理結果」：已開案顯示「已開案：Case00n（前往個案）」，已結案顯示「已結案：Case00n（結案日期 …）」，未開案顯示原因與說明。頁面只呼叫 referralService.myReferralRows，取得的資料本身就只有這些欄位。

## 五、儲存（原型階段）

存在資料儲存區（src/services/storage.js 的 DATA_STORAGE，目前為 sessionStorage）的 referrals，與 resources、cases、assessments 相同；頁面不直接讀寫儲存區。「?」→「載入示範資料」會清空轉介單並建立一筆示範轉介 Ref001（被轉介人「陳示範（虛構民眾）」，電話 0900-000-301，由 watcher@demo.carelink 送出，狀態已送出）。
