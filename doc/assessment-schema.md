# CareLink 生活近況評估與個案流程規格 v1

Oct 5, 2026 · @hank

## 概述

本階段把「生活近況評估表」做成第 1 階段「辨識」的篩檢工具，依燈號分流，並把個案資料改成新架構，補上 1、3、6 個月的追蹤提醒。完成後，系統能從民眾填表一路走到結案。

依據的三份文件：

- 運作模式簡報：五階段流程、各階段的個管紀錄欄位、資料庫編碼（Case001 等）。
- 生活近況評估表 v3（20260923）：Q1–Q12 題目與工作人員欄位。
- 生活近況評估表對話指引 v3（260930）：判讀順序、紅橘黃綠燈號、各燈號處置與追蹤週期。

與資源規格的關係：資源資料結構沿用 doc/resource-schema.md，不再變動。Q11 與 Q1–Q10 對應需求標籤的表格已寫在 src/config/needMapping.js，本階段直接使用。

本階段不包含：醫療名冊（Med001）、管理員名冊（HM001）、社區資產（As001）、正式登入權限與後端。評估表含身分證字號與心理健康資訊，原型階段只能使用假資料。

## 一、角色

原型階段依登入帳號的 role 欄位決定可用的頁面與功能（設定見 src/config/roles.js，判斷見 src/services/accessControl.js）。**權限只在前端檢查，帳號與密碼存在瀏覽器，僅供原型展示；正式版權限需由後端處理。**

| 角色代碼 | 角色 | 對應簡報 | 主要工作 | 可用頁面與功能 | 資料範圍（原型階段） |
| --- | --- | --- | --- | --- | --- |
| admin | 系統管理員 | — | 維護資源、查看全部資料 | 全部頁面與功能；資源端後台可檢視任何資源；待辦可切換查看全部 | 全部 |
| reader | 判讀人員 | 醫療（辨識者） | 閱讀填答、與民眾談話、判定燈號、取得同意 | 評估填寫、評估列表、判讀頁（含修改判讀、作廢）、待辦；資源詳細頁唯讀 | 全部評估；待辦只看「判讀人員」項目 |
| manager | 健康管理員 | 健康管理員 | 橘燈個案的諮詢、連結、追蹤、結案 | 個案列表、個案頁、待辦；資源詳細頁唯讀；已開案評估的判讀頁唯讀 | 全部個案；評估只看已開案的；待辦只看「健康管理員」項目 |
| provider | 資源點 | 資源點 | 回報出席與參與狀況 | 自己綁定資源的資源端後台與資源詳細頁（唯讀） | 只限綁定的資源（帳號的 resourceId） |

- 首頁、探索頁、民眾資源頁、登入、註冊為公開頁，不需登入。民眾不需要帳號。
- 沒有權限的頁面：導回首頁並提示「您的帳號沒有權限查看此頁」；連到無權限頁面的連結一律不顯示（例：判讀頁的「已建立個案」對判讀人員只顯示編碼）。
- 唯讀時隱藏新增、編輯、刪除、終止、作廢等按鈕。
- 角色一律以帳號的 role 欄位為準，已取消「Email 含 admin 為管理員」的規則；沒有角色（或角色已不存在，如舊帳號的 user、citizen）的帳號登入後只能看公開頁面。
- 登入後：原本被擋下的頁面有權限就回到該頁；資源點直接進入資源端後台；其他角色回首頁。
- 示範帳號（寫在程式中、不存入瀏覽器，每次打開網站都可使用；密碼皆為 demo1234，僅供展示）：

| 帳號 | 角色 | 說明 |
| --- | --- | --- |
| admin@demo.carelink | 系統管理員 | 全部頁面與功能 |
| reader@demo.carelink | 判讀人員 | 郭範例（醫師），判讀頁自動帶入姓名與類別 |
| manager@demo.carelink | 健康管理員 | 高示範 |
| provider@demo.carelink | 資源點 | 綁定 Res001 示範社區太極班（窗口 陳範例） |
| provider2@demo.carelink | 資源點 | 綁定 Res002 範例長青共餐食堂（窗口 黃示例） |
| provider3@demo.carelink | 資源點 | 綁定 Res003 示範關懷據點歌唱班（窗口 張範本）；暫停中的 Res004 沒有帳號 |

- 註冊頁暫時保留（註冊方式討論中）：可選判讀人員、健康管理員、資源點（不開放自行註冊為系統管理員）；資源點須選擇綁定的資源。示範帳號的 Email 不能註冊。

## 二、整體流程

&#91;embedded content: 評估與分流流程 · 4 種燈號\]

民眾填表後由判讀人員判定燈號；只有橘燈轉介與退縮會開案交給健康管理員，黃燈三個月後未前往且需求仍在時，也會轉為橘燈。

## 三、評估紀錄資料結構

一次填表加一次判讀為一筆評估紀錄，存在 localStorage 的 assessments，編碼暫定 Ast001。同一位民眾可以有多筆（重評、三個月後確認）。

**基本與填答**

| 欄位 | 中文名稱 | 型別 | 說明 |
| --- | --- | --- | --- |
| id / code | 系統編號 / 評估編碼 | string | code 格式暫定 Ast001 |
| person.name | 姓名 | string | 必填 |
| person.nationalId | 身分證字號 | string | 畫面只顯示遮罩，例 A12\*\*\*\*789 |
| filledAt | 填表日期 | date |  |
| fillMode | 填答方式 | enum | self 民眾自行填答、oral 施測者口語協助、proxy 家屬或陪同者協助 |
| fillNote | 施測情境備註 | string | 選填 |
| answers.q1 … q10 | Q1–Q10 | enum | yes、no、skip（選擇不回答） |
| answers.q11 | Q11 生活支持需求 | enum\[\] | 代碼沿用 needMapping.js，例 q11\_financial、q11\_talk、q11\_none |
| answers.q12 | Q12 不順心的事 | string | 可空白 |

**判讀（由判讀人員填寫）**

| 欄位 | 中文名稱 | 型別 | 說明 |
| --- | --- | --- | --- |
| review.readerName | 判讀人員 | string |  |
| review.readerType | 判讀人員類別 | enum | doctor、nurse、dietitian、other |
| review.reviewedAt | 判讀時間 | datetime |  |
| review.q12Note | Q12 談話紀錄 | string | Q12 有寫字時填 |
| review.q11Notes | Q11 各項談話紀錄 | object | 以 Q11 代碼為 key，含急迫度 urgent: boolean |
| review.questionNotes | Q1–Q10 追問紀錄 | object | 以題號為 key，只記錄有追問的題目；每題為 { note }，Q4 另有 nothingToDo（追問結果為「沒什麼事可做」時為 true，建議標籤改用 Q2 方向） |
| review.formerInterests | 以前喜歡做的事 | string | 對話指引要求 Q5 記錄 |
| review.extraAssessments | 加做的評估 | enum\[\] | bsrs5、phq9、icope |
| review.light | 判定燈號 | enum | red、orange、yellow、green |
| review.orangeType | 橘燈類型 | enum | refer 轉介、hesitant 退縮、reserved 保留 |
| review.redReasons | 紅燈原因 | enum\[\] | suicide、violence、psychosis、homeless、basic\_needs |
| review.redReferredTo | 紅燈轉介對象 | string | 例：社工、精神科、急難救助窗口 |
| review.declineReason | 婉拒原因 | string | 橘燈保留時必填 |
| review.consent | 同意轉介 | boolean | 橘燈轉介、退縮時必填 true |
| review.suggestedTags | 系統建議標籤 | object\[\] | 由 needMapping 產生，含來源題號 |
| review.confirmedTags | 確認的需求標籤 | enum\[\] | 判讀人員確認後採用 |
| review.providedResources | 提供的資源 | string\[\] | 黃燈時當場提供的資源 id |
| review.escortOffered | 是否安排陪同 | boolean | 黃燈時民眾選擇請專人陪同 |

**後續**

| 欄位 | 中文名稱 | 型別 | 說明 |
| --- | --- | --- | --- |
| caseId | 開案個案 | string | 橘燈轉介、退縮時自動建立 |
| nextCheckAt | 下次確認日期 | date | 依燈號計算，見第五節 |
| declineCount | 累計婉拒次數 | number | 橘燈保留用 |
| previousAssessmentId | 前一筆評估 | string | 重評或三個月確認時串起歷程 |
| status | 紀錄狀態 | enum | filled 已填未判讀、reviewed 已判讀、closed 已完成後續、voided 已作廢 |
| voidedAt | 作廢時間 | datetime | 作廢時記錄 |
| voidedBy | 作廢操作者 | string | 作廢時記錄目前登入者姓名 |
| voidReason | 作廢原因 | string | 作廢時必填 |

作廢規則：評估紀錄不做真正的刪除，誤建、重複填寫或填錯對象時改為作廢。已開案（有 caseId）的評估不能作廢；作廢後資料保留供查詢，但不能再判讀或開案，不列入待辦提醒、下次確認日期與橘燈保留的連續婉拒次數計算（婉拒次數會跳過作廢的紀錄，接續更早的有效紀錄）。評估列表預設不顯示已作廢的紀錄，另以「已作廢」分頁查看。

## 四、燈號判定規則

燈號一律由判讀人員決定，系統只提供建議與提醒，不自動定案。判讀頁依 Q12 → Q11 → Q1–Q10 的順序呈現，任何步驟都可以直接判紅燈。

| 燈號 | 判定條件（對話指引） | 系統建議的觸發方式 |
| --- | --- | --- |
| 紅燈 緊急需求 | 自殺意念或自傷、疑似家暴受虐、急性精神症狀、無家可歸需安置、斷炊斷藥 | 判讀頁每一步都有「發現緊急狀況」按鈕；Q11 任一項勾選「急迫」時提示考慮紅燈 |
| 橘燈 轉介 | 需求多面向且交織、多答不知道、Q11 多項相互牽連、勾「想找人聊聊」、Q12 談到需要有人協助 | Q11 勾 q11\_talk 時建議橘燈；Q11 勾 3 項以上時提示可能交織 |
| 橘燈 退縮 | 問題很多但難以決定、反覆說再看看、有動機卻跨不過去 | 無自動判斷；選此類型時顯示「建議封閉提問，直接提議下一步」 |
| 橘燈 保留 | 已判定橘燈，邀請後仍婉拒 | 選此類型時婉拒原因必填，並提示先回應顧慮再問一次 |
| 黃燈 資訊需求 | 需求單一、方向清楚、能說出想要什麼、表示要自己處理 | 只有 1 個 Q11 項目或 1–2 題 Q1–Q10 答否時建議黃燈 |
| 綠燈 未發現需求 | Q12 空白、Q11 未勾或勾「目前沒有其他需要」、Q1–Q10 全部答是 | 三項條件同時成立時建議綠燈 |

補充規則：

- Q3 或 Q4 答否時，判讀頁提示「先追問情緒狀況，可接 BSRS-5 或 PHQ-9；確認有自殺自傷意念依紅燈處理」。
- Q4 追問結果若為「沒什麼事可做」，建議標籤改用 Q2 的方向（needMapping 的 altTags）。
- Q8 提到跌倒或功能下降時，提示「由醫師判斷是否安排 ICOPE」。
- Q10 答否且獨居、無夜間求助管道時，提示「建議優先轉介」。
- 答 skip 的題目不計入綠燈的「全部答是」，系統會提示判讀人員確認。

## 五、各燈號的後續處置

只有橘燈轉介與橘燈退縮會開案；其他燈號留在評估紀錄，由系統依日期提醒。標註「待驗證」的週期都寫成設定值。

| 燈號 | 系統動作 | 追蹤者 | 下次確認 | 到期後 |
| --- | --- | --- | --- | --- |
| 紅燈 | 記錄原因與轉介對象，不進行社會處方處置，不開案 | 院內既有程序 | 無 | — |
| 橘燈 轉介、退縮 | 自動建立個案（Case001），帶入評估編碼、確認的需求標籤與 Q12 內容，直接進入第 2 階段諮詢 | 健康管理員 | 開案後 72 小時內首次聯繫 | 未聯繫列入待辦「逾期未聯繫」 |
| 橘燈 保留 | 記錄婉拒原因，不開案 | 下次接觸者 | 下次來院時；連續 3 次婉拒後延長為 6 個月（待驗證） | 再次詢問意願，同意即改為橘燈轉介並開案 |
| 黃燈 | 執行黃燈程序：選資源類型、開啟探索頁並帶入確認的標籤、記錄提供的資源與是否需要陪同 | 不指派 | 3 個月後（待驗證） | 確認是否前往；未前往且需求仍在，建立新評估並判為橘燈 |
| 綠燈 | 記錄 | 不指派 | 12 個月後（待驗證） | 提醒重新填寫評估表 |

黃燈程序的三個步驟（對話指引第四節）：

1. 釐清類型：運動、聚會、學習、健康諮詢，對應處方類型或需求標籤。
2. 指出入口：開啟探索頁並自動帶入篩選條件；不會用數位工具的民眾，改提供資源的公眾聯絡電話。
3. 選一個起點（選配）：當場在探索頁挑一個離家近、時間合適的資源，記錄到 providedResources。

黃燈民眾選擇「請專人陪同」時，視同需要協助，系統提示是否改判橘燈。

## 六、個案新架構

個案依運作模式簡報的五階段整理，編碼 Case001，資料集中由 src/services/caseService.js 讀寫，比照資源的做法：讀取時轉換舊格式，寫入時才存回。連結與追蹤改成陣列，保留每一次嘗試。

| 階段 | 欄位 | 型別 | 說明（對應簡報的個管紀錄） |
| --- | --- | --- | --- |
| 基本 | id、code、stage、managerName、createdAt、updatedAt、isDemo | — | stage：1–5，結案後為 closed |
| 基本 | person | object | name、nationalId（遮罩顯示）、phone、livingAlone |
| 1 辨識 | referral | object | 個管紀錄-轉介：referrerType（medical 醫療、watcher 守望員、self 自我轉介）、referrerName、assessmentId、assessmentCode（規格外補充：評估編碼 Ast001，方便畫面顯示）、reason（篩檢結果摘要）、consent、consentAt |
| 2 諮詢 | consultation | object | 個管紀錄-晤談：firstContactAt、whatMatters（對我而言什麼最重要）、needTags、goals\[\]（共同設定的目標）、note |
| 3 連結 | linkages\[\] | object\[\] | 個管紀錄-連結：resourceId、resourceName、reason、linkedAt、escortNeeded、status（pending、success、failed）、attendance、providerNote |
| 4 追蹤 | followUps\[\] | object\[\] | 個管紀錄-追蹤：round（1、3、6 個月）、plannedAt、doneAt、attendance、participation（success、failed）、impact（improved、same、worse）、note |
| 5 結案 | closure | object | 個管紀錄-結案：reason（goal\_met 達成目標、integrated 自主融入、withdrew 主動退出、other）、closedAt、returnedToMedical、reentryExplained、note（規格外補充：結案說明；reason 為 other 時的文字，以及舊個案的結案原因與成果都放這裡） |
| 全程 | history\[\] | object\[\] | 沿用現有格式的 stage、date、note，另加 at（時間）、actor（操作者）、action（動作代碼，例 create、advance、link、open\_from\_assessment） |
| 全程 | legacy | object | 規格外補充：舊個案轉換時，新架構沒有對應位置的欄位（age、gender、identity、source、needLevel、motivation）保留在這裡，避免資料遺失；新建立的個案沒有此欄位 |

階段推進規則：

- 進入第 2 階段：需有 consent = true。
- 進入第 3 階段：需填 whatMatters 與至少一個目標。
- 進入第 4 階段：最新一筆連結狀態為 success；建立連結時自動產生 1、3、6 個月三筆追蹤排程。
- 連結 failed 或追蹤 impact 為 worse：提示退回第 2 階段重新評估，現有行為保留。
- 結案：需填 reason；說明再入口機制（reentryExplained）為必勾。

舊個案轉換：現有欄位對應到新結構，單一 linkage 轉成 linkages 的第一筆；沒有編碼的補上 Case 流水號。示範資料改為單一主角故事線「林示範的故事」（見 doc/demo-guide.md）。

舊欄位對應摘要：basic.name → person.name；basic.identity 含「獨居長者」→ person.livingAlone；basic.source 醫療／社區／自主 → referrerType medical／watcher／self；basic.problem → referral.reason；已進入第 2 階段以後的個案視為 consent = true，firstContactAt 取第一筆第 2 階段歷程的日期；consultation.goal → goals 第一筆，needLevel 與 motivation 附在 note；linkage.status 成功／失敗／中斷 → success／failed／failed（中斷記在 providerNote）；tracking → followUps；stage 6 → closed；closure 的原因與成果文字 → closure.note。轉換只在記憶體中進行，寫入任一筆時才整份存回。

## 七、待辦與提醒

新增一個「待辦」頁，每次開啟時依今天日期即時計算，不另外存提醒資料。項目依到期日排序，已逾期的排在最前面。已作廢的評估紀錄一律不列入待辦（使用 assessmentService 的 isActiveAssessment 排除）。

| 待辦類型 | 來源 | 出現條件 | 給誰 |
| --- | --- | --- | --- |
| 尚未判讀 | 評估紀錄 | status = filled | 判讀人員 |
| 逾期未聯繫 | 個案 | 開案超過 72 小時且沒有 firstContactAt | 健康管理員 |
| 追蹤到期 | 個案 | followUps 中 plannedAt 已到且沒有 doneAt | 健康管理員 |
| 資源點未回報 | 個案 | 連結 pending 超過 14 天（待驗證） | 健康管理員 |
| 黃燈三個月確認 | 評估紀錄 | 黃燈且 nextCheckAt 已到 | 判讀人員 |
| 綠燈年度重評 | 評估紀錄 | 綠燈且 nextCheckAt 已到 | 判讀人員 |
| 橘燈保留再確認 | 評估紀錄 | 橘燈保留，民眾再次來院時在評估列表標示 | 判讀人員 |
| 資源待驗證 | 資源 | 已完成，沿用 isVerifyOverdue | 管理員 |

## 八、頁面規劃與實作順序

分四步實作，每步完成後停下來確認、commit，再進行下一步。

| 步驟 | 內容 | 新增或修改的頁面 |
| --- | --- | --- |
| 1 資料層 | assessmentService、caseService、舊個案轉換、角色 role 欄位、設定值、測試 | 不改頁面 |
| 2 評估填寫與判讀 | 填寫頁（大字、一題一屏，適合平板；也可由工作人員代填）、評估列表、判讀頁（依 Q12 → Q11 → Q1–Q10 呈現，含追問提示與燈號選擇） | /assessment/new、/assessments、/assessments/:id |
| 3 分流與個案 | 橘燈自動開案、黃燈程序串接探索頁、個案頁改用 caseService 並依第六節欄位改寫五階段 | CaseList、CaseDetail、Explore（接收帶入條件） |
| 4 待辦與示範 | 待辦頁；示範情境「林示範的故事」（11 步，含連結失敗回到諮詢的迴圈，可選從第幾步開始載入）與流程說明列；更新展示導覽 | /todo、資源列表與登入頁的「載入示範情境」 |

評估填寫頁的開頭照評估表原文顯示說明文字，並強調「每一題都可以選擇不回答，不會影響您接受的任何醫療服務」；每題提供「不回答」選項。

## 九、設定開關

寫在 src/config/assessmentRules.js，對話指引標註「待驗證」的數字都放在這裡。

| 設定 | 預設值 | 用途 |
| --- | --- | --- |
| FIRST\_CONTACT\_HOURS | 72 | 橘燈開案後首次聯繫期限（簡報：48–72 小時） |
| FOLLOW\_UP\_MONTHS | \[1, 3, 6\] | 追蹤排程 |
| YELLOW\_RECHECK\_MONTHS | 3 | 黃燈確認是否前往 |
| GREEN\_REASSESS\_MONTHS | 12 | 綠燈重新評估 |
| ORANGE\_DECLINE\_LIMIT | 3 | 橘燈保留連續婉拒幾次後延長間隔 |
| ORANGE\_EXTENDED\_MONTHS | 6 | 延長後的再確認間隔 |
| PROVIDER\_REPORT\_DAYS | 14 | 資源點未回報的提醒天數 |
| Q11\_INTERWOVEN\_COUNT | 3 | Q11 勾選幾項以上提示可能交織 |
| NATIONAL\_ID\_STORAGE | "last4" | 身分證字號的儲存方式：full 完整字號、last4 只存後四碼、none 不存；畫面一律顯示遮罩。原型階段不存完整字號（對應第十節「身分證字號是否可以只存後四碼」） |
| YELLOW\_ESCORT\_SUGGESTS\_ORANGE | true | 黃燈民眾選擇請專人陪同時，判讀頁提示考慮改判橘燈；只提示，不自動改判（對應第十節「黃燈請專人陪同是否改判橘燈」） |
| FOLLOW\_UP\_START | "linked" | 1、3、6 個月追蹤的起算點：linked 從建立連結日、success 從連結成功日、opened 從開案日（對應第十節「追蹤從何時起算」） |

| AUTO\_OPEN\_CASE | true | 判讀為橘燈轉介或退縮時是否立即開案。步驟 3 個案頁改版前為 false（判讀頁顯示「將於個案模組上線後建立個案」）；步驟 3 起為 true，網站啟動時會替先前尚未開案的評估補開案 |

NATIONAL\_ID\_STORAGE、YELLOW\_ESCORT\_SUGGESTS\_ORANGE、FOLLOW\_UP\_START 為第十節待確認事項的目前假設，確認後改設定值即可；AUTO\_OPEN\_CASE 為實作階段開關。

## 十、待與委託方確認事項

以下是三份文件沒有寫明、本規格先自行假設的地方。

- [ ] 評估紀錄的編碼格式：簡報第三頁沒有列評估，暫定 Ast001，是否另有規劃？
- [ ] 民眾在候診時是用平板自填，還是紙本填寫後由工作人員輸入？兩者都支援是否可行？
- [ ] 身分證字號在原型階段是否可以只存後四碼或完全不存？
- [ ] 判讀人員能否直接看到民眾過去的評估與個案紀錄？
- [ ] 黃燈民眾選擇「請專人陪同」時，是否應改判橘燈並開案？
- [ ] 黃燈三個月未前往、需求仍在時，是直接改判橘燈，還是重新填一次評估表？
- [ ] 橘燈保留的「再確認」由誰執行：原判讀人員，或下次看診的任一判讀人員？
- [ ] 個案要不要指派到特定健康管理員？目前沒有管理員名冊，暫時只記錄姓名文字。
- [ ] 第 1 階段的轉介來源除了評估表，是否也要支援守望員轉介與民眾自我轉介（不經評估表直接開案）？
- [ ] 結案時「轉回醫療端執行結案評估」是否需要醫療端在系統內確認？
- [ ] 追蹤 1、3、6 個月是從「連結成功」起算，還是從「開案」起算？
- [ ] 運作模式簡報第三頁標題為四個資料庫，實際列出五個，是否有一個要合併或拿掉？
- [ ] 評估紀錄是否允許作廢，作廢需要什麼權限？目前任何登入者都可以作廢（已開案的評估除外），須填寫原因並記錄操作者。

### 角色

- [ ] 系統管理員、判讀人員、健康管理員、資源點四個角色是否符合實際分工？有沒有漏掉或不需要的？
- [ ] 是否需要增加守望員、資源管理員等角色？
- [ ] 一個人可以有多個角色嗎？目前一個帳號只有一個角色。

### 資料範圍

- [ ] 健康管理員只看分派給自己的個案，還是看全部？需要個案分派功能嗎？目前看全部個案，與其相關的評估指已開案的評估。
- [ ] 判讀人員只看自己醫療機構的評估，還是看全部？目前看全部。
- [ ] 待辦是否依登入角色只顯示自己的項目？目前依角色只顯示自己的項目，系統管理員可切換查看全部。

### 註冊與帳號

- [ ] 是否開放自行註冊？還是所有帳號都由系統管理員建立？目前註冊頁暫時保留，不開放註冊為系統管理員。
- [ ] 如果開放註冊，是否需要審核才開通？由誰審核？
- [ ] 註冊時要填哪些資料確認身分？
- [ ] 資源點註冊時，如何確認申請人是該機構的窗口？
- [ ] 資源點帳號由誰開通？
- [ ] 人員離職或合作終止時，帳號如何停用？
- [ ] 密碼規則與忘記密碼的處理方式？

### 求助管道

- [ ] 評估表是否開放民眾在家自行填寫？如果開放，填完後誰負責看、多久內聯絡？
- [ ] 平板交接時，是否需要工作人員密碼才能離開填寫頁？
- [ ] 是否提供民眾「我需要協助」申請表？還是只公布聯絡電話？
- [ ] 守望員要給帳號直接轉介，還是提供不需登入的轉介表單？
