# CareLink 社區資源資料結構定義 v1

Oct 5, 2026 · @hank

## 概述

本文件把「社區資源收集模版 v3」轉成程式用的資源資料結構，作為資源表單、資源詳細頁、首頁與探索頁、個案轉介選單的共同依據。需求標籤代碼同時對應「生活近況評估表 v3」，讓評估結果能直接找到資源。

命名原則如下：

- 欄位名稱用英文 camelCase，畫面顯示中文。
- 單選與多選的選項一律存固定英文代碼，中文文字只放在對照表，之後改文字不影響資料。
- 多選欄位存成陣列；日期存 YYYY-MM-DD；時間存 HH:mm。
- 「其他」選項另以 xxxOther 文字欄位補充。
- 本版仍為 localStorage 原型，請只使用假資料。

## 一、管理欄位

記錄資源的身分、驗證與營運狀態，由後台維護，民眾端不顯示驗證資訊。

| 欄位 | 中文名稱 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- | --- |
| id | 系統編號 | string | 是 | 系統自動產生，用 crypto.randomUUID() |
| code | 資源編碼 | string | 是 | 對外跨單位追蹤用。格式為 Res 加三位數流水號（例：Res001，超過 999 時位數自動增加），新增時由系統自動產生，不可修改 |
| verifiedBy.type | 驗證者類型 | enum | 是 | team 社會處方團隊、provider 機構聯絡人 |
| verifiedBy.name | 驗證者姓名 | string | 是 | 實際確認資料的人 |
| lastVerifiedAt | 最後驗證日期 | date | 是 |  |
| nextVerifyAt | 預計驗證日期 | date | 是 | 依第九節規則自動計算，可手動調整 |
| status | 資源狀態 | enum | 是 | active 活躍、paused 暫停、terminated 終止、seasonal 季節性關閉 |
| pauseReason | 暫停原因 | string | 暫停時必填 |  |
| resumeAt | 預計恢復日期 | date | 暫停時必填 |  |
| seasonalNote | 季節週期說明 | string | 季節性時必填 | 例：每年 7–8 月暫停 |
| createdAt | 建立時間 | datetime | 是 | 系統自動 |
| updatedAt | 最後修改時間 | datetime | 是 | 系統自動 |
| isDemo | 示範資料標記 | boolean | 否 | 系統自動。由後台「載入示範資料」加入的虛構資源為 true，可一鍵移除且不影響自建資源；一般資源不帶此欄位。編輯示範資料時標記會保留。正式上線前應移除所有示範資料 |

## 二、資源內容

這一區是民眾端主要看到的資訊。地址拆成縣市與行政區兩個欄位，取代首頁目前假造的行政區；座標用於「附近」搜尋。

| 欄位 | 中文名稱 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- | --- |
| name | 資源名稱 | string | 是 | 服務或活動全名 |
| organization | 所屬單位 | string | 是 | 機構或團體全名 |
| description | 資源內容 | string | 是 | 何人、何時、何地、提供何種服務給何對象，100 字內 |
| prescriptionTypes | 處方類型 | enum\[\] | 是 | 由需求標籤自動推得，見第七節 |
| needTags | 需求標籤 | enum\[\] | 是 | 至少一個，代碼見第七節 |
| needTagOther | 其他標籤 | string | 否 | 選 other 時填寫 |
| staff\[\] | 人力配置 | object\[\] | 否 | 每筆含 name 姓名、role 角色、license 證照種類、experience 專業經驗 |
| capacity.type | 可容納人數 | enum | 是 | limited 有上限、open 不限、other 其他 |
| capacity.limit | 人數上限 | number | 有上限時必填 |  |
| availability.type | 服務量能 | enum | 是 | available 有名額、full 額滿預約、realtime 須即時確認 |
| availability.slots | 可用名額 | number | 否 |  |
| availability.nextBatch | 下梯次 | string | 否 | 額滿時填 |
| schedule | 服務週期 | object | 是 | 結構見下方 |
| placeName | 地點名稱 | string | 否 | 例：XX 社區活動中心 |
| address.zip | 郵遞區號 | string | 是 |  |
| address.city | 縣市 | enum | 是 | 例：新北市 |
| address.district | 行政區 | enum | 是 | 例：板橋區，選項依縣市連動 |
| address.detail | 詳細地址 | string | 是 | 含路名、門牌、樓層 |
| geo | 經緯度 | object | 否 | { lat, lng } 或 null，預設 null；表單不提供輸入，未來由地址自動轉換，附近搜尋使用 |

服務週期 schedule 依 type 分三種：

- regular 常態性：frequency 為 weekly 或 monthly；weekdays 為星期陣列（1 為週一，7 為週日）；monthDays 為每月日期陣列；startTime、endTime。
- batch 梯次性：startDate、endDate、weekdays、startTime、endTime。
- once 單次性：date、startTime、endTime。

## 三、安全與風險評級（後台）

由驗證者填寫，民眾端不顯示。整體風險等級暫定取五項判斷條件中最差的一項。

| 欄位 | 中文名稱 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- | --- |
| riskLevel | 風險等級 | enum | 是 | green 可放心轉介、yellow 需健康管理員陪同至少一次、red 避免推薦並持續追蹤 |
| riskCriteria.management | 機構管理 | enum | 是 | green、yellow、red |
| riskCriteria.insurance | 意外保險 | enum | 是 | green、yellow、red |
| riskCriteria.environment | 環境安全 | enum | 是 | green、yellow、red |
| riskCriteria.complaints | 投訴紀錄 | enum | 是 | green、yellow、red |
| riskCriteria.staffQualification | 人員資格 | enum | 是 | green、red（模版此項沒有黃燈） |
| highRisk.isHighRisk | 是否為高風險情境 | boolean | 是 |  |
| highRisk.types | 高風險類型 | enum\[\] | 是高風險時必填 | medical 治療性身體操作或醫療行為、psychological 以改變認知行為為目的的心理服務、hazardous 風險環境或危險器材 |
| riskChangeNote | 風險調整說明 | string | 等級變更時必填 | 例：補足公共意外險 |

系統檢核規則：高風險情境成立且人員沒有正式證照時，staffQualification 自動設為 red，整體等級也隨之變為 red。

## 四、適用對象與可近性

這一區提供民眾端的篩選條件，也讓判讀人員確認民眾是否適合參加。

| 欄位 | 中文名稱 | 型別 | 必填 | 選項代碼 |
| --- | --- | --- | --- | --- |
| ageGroups | 適合年齡 | enum\[\] | 是 | all 不指定、child 兒童、teen 青少年、adult 成人、senior 長者 |
| identities | 適合身分 | enum\[\] | 是 | all 不指定、dementia 失智者、disability 身心障礙者、chronic 慢性病患者、living\_alone 獨居者、caregiver 照顧者、parent 家長、indigenous 原住民、new\_immigrant 新住民、other 其他 |
| identityOther | 其他身分 | string | 否 |  |
| notSuitableFor | 不適合對象 | string | 否 | 例：含堅果無法替換 |
| participation | 參與條件 | enum | 是 | referral\_only 僅接受轉介、registration 須報名、walk\_in 自由參加、other 其他 |
| participationOther | 其他參與條件 | string | 否 |  |
| languages | 語言 | enum\[\] | 是 | mandarin 國語、taiwanese 台語、hakka 客語、indigenous 原住民語、other 其他 |
| indigenousTribe | 原住民族別 | string | 選原住民語時必填 |  |
| languageOther | 其他語言 | string | 否 |  |
| transport | 交通可近性 | enum\[\] | 否 | dropoff 門口可下車、parking 有停車位、public\_transit 大眾運輸、shuttle 專車接駁、other 其他 |
| transportNote | 交通說明 | object | 否 | publicTransit、shuttle、other 三個文字欄位 |
| accessibility | 無障礙與包容性 | enum\[\] | 否 | barrier\_free 無障礙空間、dementia\_friendly 失智者友善、senior\_friendly 長者友善、child\_friendly 兒童友善、gender\_friendly 性別友善、culture\_friendly 文化友善、other 其他 |
| accessibilityOther | 其他包容性規劃 | string | 否 |  |
| fee.type | 費用 | enum | 是 | free 免費、paid 自費、subsidized 優惠或補助 |
| fee.detail | 收費標準或補助資格 | string | 自費或補助時必填 |  |
| notice | 參與須知 | string | 否 | 例：穿運動服、帶健保卡 |

## 五、協作介面

合作狀態直接影響資源能否出現在轉介選單，是推薦規則的必要條件。

| 欄位 | 中文名稱 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- | --- |
| partnership | 合作狀態 | enum | 是 | formal 正式合作、verbal 口頭確認、unconfirmed 尚未確認 |
| publicContact | 公眾聯絡人 | object | 是 | name、phone、emailOrLine |
| adminContact.sameAsPublic | 行政聯絡同上 | boolean | 是 |  |
| adminContact | 行政聯絡人 | object | 不同上時必填 | name、phone、emailOrLine |
| followUpMethods | 追蹤方式 | enum\[\] | 是 | provider\_contact 資源點主動聯繫、report\_form 填寫追蹤回報表單、manager\_contact 健康管理員定期主動聯繫、other 其他 |
| followUpOther | 其他追蹤方式 | string | 否 |  |
| links | 網站或社群連結 | string\[\] | 否 | 官方網頁或粉絲專頁 |

行政聯絡人只在後台顯示，民眾端只顯示公眾聯絡人。

## 六、AI 輔助欄位

原型階段先用於關鍵字搜尋，之後可作為向量搜尋的依據。生活情境另依設定 SHOW_SCENARIOS_TO_PUBLIC 顯示於民眾端資源頁（見第十二節）。

| 欄位 | 中文名稱 | 型別 | 必填 | 說明 |
| --- | --- | --- | --- | --- |
| keywords | 關鍵字 | string\[\] | 建議 | 例：運動、社交、長者、低費用、步行 |
| scenarios | 對應生活情境 | string | 建議 | 自然語言描述，例：適合平日白天想找人聊天的獨居者 |

## 七、需求標籤代碼表

共 23 個標籤，分屬五種處方類型。資源只需勾選標籤，處方類型 prescriptionTypes 由標籤所屬類型自動推得，避免兩者不一致。

| 處方類型代碼 | 處方類型 | 標籤代碼 | 標籤 |
| --- | --- | --- | --- |
| basic\_support | 基本生活支持 | financial\_aid | 經濟援助 |
| basic\_support | 基本生活支持 | legal | 法律諮詢 |
| basic\_support | 基本生活支持 | housing | 住房支持 |
| basic\_support | 基本生活支持 | transport | 交通協助 |
| basic\_support | 基本生活支持 | food | 食物援助 |
| basic\_support | 基本生活支持 | caregiver\_support | 照顧者支持 |
| basic\_support | 基本生活支持 | parenting | 親職與家庭教育 |
| basic\_support | 基本生活支持 | welfare\_application | 福利申請協助 |
| basic\_support | 基本生活支持 | home\_support | 居家支援 |
| health | 身心健康促進 | exercise | 運動健身 |
| health | 身心健康促進 | nutrition | 飲食營養 |
| health | 身心健康促進 | cognitive | 認知健康 |
| health | 身心健康促進 | mental | 心理支持 |
| social | 社會連結 | companionship | 社交陪伴 |
| social | 社會連結 | arts\_culture | 藝術與文化 |
| social | 社會連結 | nature | 自然綠活 |
| social | 社會連結 | spiritual | 信仰與靈性關懷 |
| learning | 學習與發展 | education | 教育學習 |
| learning | 學習與發展 | digital\_skills | 數位技能 |
| learning | 學習與發展 | self\_management | 健康自我管理 |
| self\_actualization | 自我實現 | volunteer | 志願服務 |
| self\_actualization | 自我實現 | employment | 就業支持 |
| self\_actualization | 自我實現 | community | 社區參與 |
| other | 其他（開發用） | other | 其他，另填 needTagOther |

建議把這張表寫成程式設定檔 src/config/needTags.js，所有頁面共用。

## 八、評估表與需求標籤對應

Q11 是民眾自己指認的需求，可以直接對應標籤；Q1–Q10 只產生建議標籤，必須由判讀人員對話確認後才採用。建議寫成 src/config/needMapping.js。

**Q11 生活支持需求**

| Q11 代碼 | 勾選項目 | 對應標籤 |
| --- | --- | --- |
| q11\_financial | 經濟與生活負擔 | financial\_aid、food |
| q11\_employment | 工作與就業 | employment |
| q11\_welfare | 福利資源申辦 | welfare\_application |
| q11\_housing | 居住環境改善 | housing |
| q11\_home | 居家生活支援 | home\_support |
| q11\_transport | 就醫與外出交通 | transport |
| q11\_caregiver | 照顧家人的支持 | caregiver\_support |
| q11\_parenting | 親職與教養支持 | parenting |
| q11\_legal | 法律權益諮詢 | legal |
| q11\_activity | 社區活動引導 | companionship、arts\_culture、nature、spiritual、education、community |
| q11\_talk | 想找人聊聊 | 不對應資源，直接判定橘燈並轉介健康管理員 |
| q11\_none | 目前沒有其他需要 | 無 |

**Q1–Q10 答「否」時的建議標籤**

| 題號 | 可能意涵 | 建議標籤 | 判讀提醒 |
| --- | --- | --- | --- |
| Q1 | 缺乏可傾訴的對象 | companionship、mental |  |
| Q2 | 較少與人交流或參與活動 | companionship、arts\_culture、nature、community |  |
| Q3 | 情緒困擾 | mental | 先追問情緒狀況，可接 BSRS-5 或 PHQ-9；有自殺自傷意念依紅燈處理 |
| Q4 | 缺乏興趣或可參與的活動 | mental，或比照 Q2 | 提不起勁偏向 mental；沒事可做比照 Q2 |
| Q5 | 缺乏意義感 | education、volunteer、arts\_culture、spiritual | 記錄以前喜歡做的事 |
| Q6 | 較少感到被需要 | volunteer、community |  |
| Q7 | 日常生活處理有困難 | home\_support、caregiver\_support | 家人代做仍屬受限，留意照顧者負荷 |
| Q8 | 身體限制影響生活 | exercise | 提到跌倒或功能下降，由醫師判斷是否安排 ICOPE |
| Q9 | 難以自我管理健康 | self\_management、nutrition |  |
| Q10 | 不清楚求助管道 | 目前沒有對應標籤 | 獨居且無夜間求助管道者優先轉介，見待確認事項 |

## 九、推薦規則與驗證週期

一筆資源要同時符合四個條件，才會出現在民眾探索頁與健康管理員的轉介選單：status 為 active、partnership 不是 unconfirmed、riskLevel 不是 red、riskLevel 已填寫（green 或 yellow）。

沒有風險等級的資源不推薦：原型階段表單可以不填風險判斷條件，這類資源視為尚未完成風險評估。此規則由設定 REQUIRE_RISK_LEVEL_FOR_RECOMMEND 控制，見第十二節。

| 情況 | 民眾探索頁 | 轉介選單 | 畫面提示 |
| --- | --- | --- | --- |
| 符合四個條件、風險綠燈 | 顯示 | 顯示 | 無 |
| 符合四個條件、風險黃燈 | 顯示 | 顯示 | 轉介時提示「需健康管理員陪同至少一次」 |
| 沒有風險等級 | 隱藏 | 隱藏 | 後台提示尚未完成風險評估 |
| 風險紅燈 | 隱藏 | 隱藏 | 後台列為持續追蹤 |
| 合作尚未確認 | 隱藏 | 隱藏 | 後台提示需聯繫確認 |
| 暫停 | 隱藏 | 隱藏 | 後台顯示預計恢復日期 |
| 季節性關閉 | 隱藏 | 隱藏 | 後台顯示週期說明 |
| 終止 | 隱藏 | 隱藏 | 保留資料供歷史個案查詢，不刪除 |

驗證週期：nextVerifyAt 預設為 lastVerifiedAt 加 6 個月；新開發資源或風險黃燈資源加 3 個月。今天已超過 nextVerifyAt 的資源，在後台資源列表標示「待驗證」。

週期月數寫成設定值，不要寫死在頁面裡：

```
VERIFY_INTERVAL_MONTHS = 6
VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW = 3
```

## 十、完整 JSON 範例

以下是一筆虛構資源，可直接當作測試資料。

```json
{
  "id": "7c1e2a40-5b3d-4f1a-9e2c-1a2b3c4d5e6f",
  "code": "Res001",
  "verifiedBy": { "type": "team", "name": "王小明" },
  "lastVerifiedAt": "2026-10-01",
  "nextVerifyAt": "2027-01-01",
  "status": "active",
  "pauseReason": null,
  "resumeAt": null,
  "seasonalNote": null,
  "createdAt": "2026-10-01T09:00:00+08:00",
  "updatedAt": "2026-10-01T09:00:00+08:00",

  "name": "湳興河濱長者健走班",
  "organization": "示範社區發展協會",
  "description": "健走老師每週二早上 7 點於河濱公園帶領 1 小時團體步行，適合能自行行走的社區長者。",
  "prescriptionTypes": ["health", "social"],
  "needTags": ["exercise", "companionship"],
  "needTagOther": null,
  "staff": [
    { "name": "陳老師", "role": "帶班老師", "license": "國民體適能指導員", "experience": "帶領長者運動 5 年" }
  ],
  "capacity": { "type": "limited", "limit": 20 },
  "availability": { "type": "available", "slots": 6, "nextBatch": null },
  "schedule": {
    "type": "regular",
    "frequency": "weekly",
    "weekdays": [2],
    "monthDays": [],
    "startTime": "07:00",
    "endTime": "08:00"
  },
  "placeName": "河濱公園入口",
  "address": { "zip": "220", "city": "新北市", "district": "板橋區", "detail": "示範路 1 號旁" },
  "geo": { "lat": 25.0, "lng": 121.45 },

  "riskLevel": "yellow",
  "riskCriteria": {
    "management": "green",
    "insurance": "green",
    "environment": "yellow",
    "complaints": "green",
    "staffQualification": "green"
  },
  "highRisk": { "isHighRisk": false, "types": [] },
  "riskChangeNote": null,

  "ageGroups": ["senior"],
  "identities": ["all"],
  "identityOther": null,
  "notSuitableFor": "無法自行行走者",
  "participation": "walk_in",
  "participationOther": null,
  "languages": ["mandarin", "taiwanese"],
  "indigenousTribe": null,
  "languageOther": null,
  "transport": ["public_transit"],
  "transportNote": { "publicTransit": "捷運站步行 10 分鐘", "shuttle": null, "other": null },
  "accessibility": ["senior_friendly"],
  "accessibilityOther": null,
  "fee": { "type": "free", "detail": null },
  "notice": "請穿運動鞋並自備水壺",

  "partnership": "verbal",
  "publicContact": { "name": "林小姐", "phone": "02-0000-0000", "emailOrLine": null },
  "adminContact": { "sameAsPublic": true },
  "followUpMethods": ["manager_contact"],
  "followUpOther": null,
  "links": [],

  "keywords": ["運動", "步行", "長者", "免費"],
  "scenarios": "適合醫師建議多運動、但不知道附近哪裡可以去的長者"
}
```

## 十一、待與委託方確認事項

以下是模版沒有寫清楚、本文件先自行假設的地方。已與委託方確認的項目以 [x] 標示並註明結論。

- [x] 資源編碼 code 的格式為何？（已確認：依運作模式簡報，格式為 Res 加三位數流水號，例如 Res001，新增時由系統自動產生）
- [ ] 處方類型是否同意由需求標籤自動推得，不另外勾選？
- [ ] 整體風險等級是否取五項條件中最差的一項？
- [ ] 人員資格只有綠燈與紅燈，是否刻意沒有黃燈？
- [ ] 「尚未確認合作」的資源，模版只說不得出現在轉介選單，民眾探索頁是否也要隱藏？
- [ ] 「新開發資源」的定義：建立後多久內算新開發？
- [ ] 參與條件是單選還是可複選（例如須報名且僅接受轉介）？
- [ ] Q10 的「健康求助管道」需要新增一個標籤（例如健康諮詢窗口）嗎？對話指引黃燈程序也提到這類資源。
- [ ] 人力配置的姓名、證照是否在民眾端公開，或僅後台可見？
- [ ] 生活情境（scenarios）的文字是否適合直接給民眾看？目前在民眾端資源頁的「適合誰參加」顯示，由設定 SHOW_SCENARIOS_TO_PUBLIC 控制，見第十二節。
- [ ] 終止資源時是否需要記錄終止原因與終止日期？目前終止只改 status，未保存原因，詳細頁也看不到。若需要，建議新增 terminateReason（終止時必填）與 terminatedAt 欄位，列表的「終止」按鈕與表單都要求填寫原因。

## 十二、設定開關

以下設定集中在 src/config/resourceRules.js，頁面不寫死。第十一節的待確認事項定案後，改設定值即可，不必修改頁面。

| 設定 | 預設值 | 用途 | 對應待確認事項 |
| --- | --- | --- | --- |
| STRICT_VALIDATION | false | false 時只有資源名稱必填，其他必填欄位顯示為「建議填寫」，未填不阻擋送出；true 時依本文件必填欄完整檢核。格式錯誤兩種模式都會阻擋 | 規格定案後改為 true |
| REQUIRE_RISK_LEVEL_FOR_RECOMMEND | true | 沒有風險等級的資源不出現在探索頁與轉介選單 | 原型階段可不填風險判斷條件 |
| OVERALL_RISK_STRATEGY | "worst" | "worst" 取五項判斷條件中最差的一項；"manual" 不自動計算，由驗證者手選 | 整體風險等級是否取最差的一項 |
| HIDE_UNCONFIRMED_IN_EXPLORE | true | 尚未確認合作的資源是否也從民眾探索頁隱藏（轉介選單一律隱藏） | 尚未確認合作的資源，探索頁是否也要隱藏 |
| NEW_RESOURCE_WINDOW_MONTHS | 6 | 最後驗證日距離建立日不到 N 個月，視為新開發資源，驗證週期改用 3 個月 | 新開發資源的定義 |
| STAFF_QUALIFICATION_ALLOW_YELLOW | false | 人員資格是否允許黃燈；false 時表單不提供黃燈，若資料為黃燈則視為紅燈 | 人員資格是否刻意沒有黃燈 |
| SHOW_STAFF_TO_PUBLIC | false | 民眾端資源頁是否顯示人力配置（姓名、角色、證照、經驗） | 人力配置的姓名、證照是否在民眾端公開 |
| SHOW_SCENARIOS_TO_PUBLIC | true | 民眾端資源頁是否在「適合誰參加」顯示生活情境（scenarios）；AI 關鍵字一律不公開 | 生活情境的文字是否適合直接給民眾看 |
| DERIVE_PRESCRIPTION_TYPES_FROM_TAGS | true | 儲存時一律由需求標籤推得處方類型 | 處方類型是否由需求標籤自動推得 |
| VERIFY_INTERVAL_MONTHS | 6 | 一般資源的驗證週期（月） | 見第九節 |
| VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW | 3 | 新開發或風險黃燈資源的驗證週期（月） | 見第九節 |

## 十三、本階段完成摘要

本階段依本文件把社區資源改為新資料結構，所有頁面改由資料層（src/services/resourceService.js）讀寫，不再直接存取瀏覽器儲存。仍為 localStorage 原型，資料只存在各自的瀏覽器中。

### 已完成的頁面

| 頁面 | 使用者 | 完成內容 |
| --- | --- | --- |
| 資源表單（新增／編輯） | 後台 | 依第一至六節分六個區塊；資源編碼（Res001）自動產生；縣市與行政區連動並自動帶郵遞區號；處方類型、整體風險、預計驗證日期自動計算；編輯時風險等級變更須填寫調整說明 |
| 資源詳細頁 | 後台 | 顯示全部欄位與五項風險判斷條件；標示資源是否出現在探索頁與轉介選單，以及不出現的原因；超過預計驗證日期標示「待驗證」 |
| 資源列表 | 後台 | 四種狀態分頁；顯示行政區、風險燈號、合作狀態、探索頁是否顯示；「終止」與二次確認的「永久刪除」；可載入與移除示範資料 |
| 建立成功頁 | 後台 | 顯示資源是否已在探索頁顯示，未顯示時列出原因 |
| 首頁、資源探索頁 | 民眾 | 只顯示符合第九節推薦規則的資源；依實際地址的行政區、處方類型、需求標籤、適合年齡與身分篩選 |
| 民眾資源頁 | 民眾 | 只顯示可公開的欄位；不顯示風險評級、驗證資訊與行政聯絡人；不開放的資源只顯示簡短說明，不透露原因 |
| 個案詳情的資源連結 | 健康管理員 | 轉介選單只列出可推薦資源，黃燈資源提示「需健康管理員陪同至少一次」；已連結的資源若後來暫停、終止或刪除，個案頁會標示目前狀態 |

另提供 6 筆虛構示範資料（3 筆會出現在探索頁、3 筆不會：暫停、風險紅燈、合作未確認），可從後台資源列表一鍵載入與移除。

### 設定開關目前的值

| 設定 | 目前值 | 目前的做法 |
| --- | --- | --- |
| STRICT_VALIDATION | false | 原型階段只有資源名稱必填，其他欄位未填仍可送出，送出後提醒有幾個建議欄位未填 |
| REQUIRE_RISK_LEVEL_FOR_RECOMMEND | true | 尚未完成風險評估的資源不推薦 |
| OVERALL_RISK_STRATEGY | "worst" | 整體風險等級自動取五項判斷條件中最差的一項 |
| HIDE_UNCONFIRMED_IN_EXPLORE | true | 尚未確認合作的資源在探索頁與轉介選單都不顯示 |
| NEW_RESOURCE_WINDOW_MONTHS | 6 | 建立後 6 個月內完成的驗證視為「新開發資源」，3 個月後需再驗證 |
| STAFF_QUALIFICATION_ALLOW_YELLOW | false | 人員資格只有綠燈與紅燈 |
| SHOW_STAFF_TO_PUBLIC | false | 民眾端不顯示人力配置 |
| SHOW_SCENARIOS_TO_PUBLIC | true | 民眾端顯示生活情境文字 |
| DERIVE_PRESCRIPTION_TYPES_FROM_TAGS | true | 處方類型由需求標籤自動推得，不另外勾選 |
| VERIFY_INTERVAL_MONTHS | 6 | 一般資源每 6 個月驗證一次 |
| VERIFY_INTERVAL_MONTHS_NEW_OR_YELLOW | 3 | 新開發或風險黃燈資源每 3 個月驗證一次 |

### 待與委託方確認事項

以下為第十一節的全部項目，「目前做法」是原型採用的假設，確認後只需調整設定或少量修改。已確認的項目以 ✅ 標示。

| # | 待確認事項 | 目前做法 | 對應設定 |
| --- | --- | --- | --- |
| 1 | ✅ 資源編碼 code 的格式為何？ | 已確認：Res 加三位數流水號（Res001），新增時由系統自動產生 | － |
| 2 | 處方類型是否同意由需求標籤自動推得，不另外勾選？ | 自動推得 | DERIVE_PRESCRIPTION_TYPES_FROM_TAGS |
| 3 | 整體風險等級是否取五項條件中最差的一項？ | 取最差的一項 | OVERALL_RISK_STRATEGY |
| 4 | 人員資格只有綠燈與紅燈，是否刻意沒有黃燈？ | 只有綠燈與紅燈 | STAFF_QUALIFICATION_ALLOW_YELLOW |
| 5 | 尚未確認合作的資源，民眾探索頁是否也要隱藏？ | 隱藏 | HIDE_UNCONFIRMED_IN_EXPLORE |
| 6 | 「新開發資源」的定義：建立後多久內算新開發？ | 建立後 6 個月內 | NEW_RESOURCE_WINDOW_MONTHS |
| 7 | 參與條件是單選還是可複選（例如須報名且僅接受轉介）？ | 單選 | － |
| 8 | Q10 的「健康求助管道」需要新增一個標籤（例如健康諮詢窗口）嗎？ | 未新增，Q10 目前沒有對應標籤 | － |
| 9 | 人力配置的姓名、證照是否在民眾端公開，或僅後台可見？ | 僅後台可見 | SHOW_STAFF_TO_PUBLIC |
| 10 | 生活情境的文字是否適合直接給民眾看？ | 在民眾資源頁「適合誰參加」顯示 | SHOW_SCENARIOS_TO_PUBLIC |
| 11 | 終止資源時是否需要記錄終止原因與終止日期？ | 未記錄，終止只改變狀態 | －（需新增欄位） |

### 尚未納入本階段的部分

- 資源端管理面板仍直接讀取瀏覽器儲存的資源資料（只用到資源名稱，新格式下顯示正常）。
- 個案資料本身尚未改為新架構，本階段只調整個案頁中與資源相關的部分。
- 「使用目前位置」的附近搜尋需要資源座標，目前尚未提供。
