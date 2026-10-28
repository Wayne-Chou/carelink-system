# 資源據點與時段結構（規劃中，尚未實作）

> **狀態：規劃中，尚未實作。** 本文件為據點結構的實作計畫，已暫停，待確認後再開始。目前資源仍為單一地點、單一服務週期的平面結構（見 doc/resource-schema.md）。

## 目標

把資源改成「據點」結構：一筆資源底下有 `sites[]`（據點），每個據點底下有 `sessions[]`（時段）。所有資源統一使用這個結構，至少 1 個據點、每個據點至少 1 個時段。這一步只做規格與資料層，不修改任何 .vue 頁面。

現況：讀取資源地址、時間相關欄位的有 12 個檔案（5 個 service／utils、7 個頁面），寫入的頁面只有資源表單。

## 一、規格文件（doc/resource-schema.md）

- 新增**第十四節「據點與時段」**，放在最後，避免第十一節之後重新編號（指定的「第十一節待確認事項」才對得上）。內容：資源 → 據點 → 時段的結構圖、據點與時段的欄位表、至少 1 個據點與 1 個時段的規則、舊格式轉換方式、isPublic 對推薦的影響。
- 第二、四節的 address、placeName、schedule、geo、transport、accessibility 標註「已移至時段，見第十四節」；staff 維持在資源層級。
- 第九節推薦規則新增：沒有對外招收據點 → 不推薦（原因代碼 `no_public_site`）。
- 第十節 JSON 範例改為新結構。
- 第十一節新增待確認事項：
  - 交通與無障礙是否放在時段（地點）層級？
  - 據點與時段是否需要各自的暫停狀態？

## 二、資料結構

```
resource.sites[] = {
  id, name, instructors: [], isPublic: true, note: null,
  sessions[] = { id, placeName, address{zip,city,district,detail}, meetingNote,
                 geo, schedule, transport, transportNote, accessibility, accessibilityOther }
}
```

| 層級 | 欄位 | 說明 |
| --- | --- | --- |
| 據點 site | id | 據點 id |
| | name | 班名或據點名稱 |
| | instructors | 教練或帶領者姓名陣列，公開給民眾 |
| | isPublic | 是否對外招收（例如師資班為 false） |
| | note | 備註 |
| 時段 session | id | 時段 id |
| | placeName | 地點名稱 |
| | address | 沿用 city、district、zip、detail |
| | meetingNote | 集合位置說明，例如「正門右側」 |
| | geo | 座標，可為 null |
| | schedule | 沿用現有服務週期結構 |
| | transport、transportNote | 交通方式與說明 |
| | accessibility、accessibilityOther | 無障礙與友善設施 |

留在資源層級不變：機構、資源內容、需求標籤、處方類型、費用、參與條件、適用對象、語言、風險評級、合作狀態、聯絡人、追蹤方式、AI 欄位、驗證與狀態；人力配置 staff 暫不處理。

- 舊格式轉換時，據點名稱預設為資源名稱、isPublic 為 true、帶領者留空（staff 不動）。
- 轉換產生的 id 固定為 `site-1`、`session-1`：轉換只在記憶體進行，若每次讀取都隨機產生 id，寫回之前就無法用 id 修改或刪除。新增的據點、時段才用隨機 id。

## 三、資料層

1. **resourceService**：讀取時依序轉換「中文舊格式 →（沿用現有轉換）→ 平面格式 → 據點結構」，只在記憶體轉換，寫入時才存回；`createEmptyResource()` 預設帶 1 個空白據點與 1 個空白時段。
2. **新增 src/services/resourceSites.js**：
   - 純函式：`createEmptySite`、`createEmptySession`、`getPublicSessions(resource)`（對外招收據點的時段，附所屬據點）、`getResourceRegions(resource, { publicOnly })`（不重複的縣市與行政區清單）、`findSessionsByRegion(resource, { city, district })`、`hasPublicSite(resource)`。
   - resourceService 的讀寫函式：`addSite`、`updateSite`、`removeSite`、`addSession`、`updateSession`、`removeSession`；刪除最後 1 個據點或時段時拒絕並回傳原因；變更服務週期類型時清空舊欄位（沿用現行做法）。
3. **推薦規則**（resourceRules）：`isRecommendable` 增加「至少一個對外招收據點」，`getVisibility` 回傳 `no_public_site`。
4. **驗證**（resourceValidation）：至少 1 個據點、每個據點至少 1 個時段（結構規則一律檢查）；地址與時間改為逐一檢查每個時段，錯誤路徑如 `sites.0.sessions.1.address.city`；必填寬嚴仍依 STRICT_VALIDATION。
5. **一併調整的資料層**（非頁面，但頁面靠它們才能顯示正確）：
   - resourceSearch：關鍵字、地址、縣市、行政區改為比對所有對外招收的時段；一筆資源跨兩個行政區時兩區各算一筆。
   - publicResource：民眾端只輸出對外招收的據點，帶領者姓名公開，staff 仍不公開。
   - resourceFormat.formatRegion：改為列出涵蓋的縣市行政區。
6. **測試資料**（tests/fixtures/resources.js）全部改新結構，並加入一筆多據點範例：
   - 據點 A「湳興河濱長者健走班」（對外）2 組時段：週二河濱、週五雨天改至活動中心，皆在板橋區。
   - 據點 B「健走帶領人培訓班」（師資班，不對外）在中和區。
   - 可測到多據點、多時段與不對外據點不計入。

## 四、頁面寫入的處理

- `createResource`、`updateResource` 遇到帶舊平面欄位（address、schedule 等）的資料時拒絕寫入並丟出明確錯誤。目前只有資源表單會送這些欄位，因此表單無法儲存（畫面上按儲存不會有反應，錯誤在瀏覽器主控台）。
- 終止、刪除資源不帶舊欄位，以新結構寫入，照常運作。

## 五、改版頁面之前會暫時顯示不正確的頁面

| 頁面 | 狀況 |
| --- | --- |
| 資源表單（新增／編輯） | 地址、地點、服務時間、交通、無障礙空白，且無法儲存 |
| 資源詳細頁（後台） | 地點、地址、服務時間、交通、無障礙空白 |
| 民眾端資源頁 | 同上 |
| 資源列表 | 卡片沒有服務時間（地區正常） |
| 判讀頁黃燈資源選擇 | 服務時間顯示「時間請洽詢」 |
| 首頁、探索頁 | 篩選與地區正常（若資料層一併調整）；卡片沒有服務時間 |

## 六、測試

- 新增 tests/resourceSites.test.js：輔助函式、刪除時至少保留 1 個、舊格式兩層轉換、id 固定、寫入時存回。
- 更新既有的資源、驗證、搜尋、民眾端、推薦規則與規格同步測試，以及測試資料。
- 完成後執行 `npm test` 與 `npm run build`。

## 七、待確認

1. 新章節放第十四節、不重新編號？
2. 用「拒絕帶舊欄位的寫入」防止頁面寫入，還是連終止、刪除也一起鎖住？
3. resourceSearch、publicResource、formatRegion 是否在這一步一併調整？（建議要）
4. 多據點範例是否採用上述設計？
5. 本計畫寫於定位推薦功能之前；定位推薦把座標放在資源層級的 geo，日後實作據點結構時，geo 隨地址移到時段，距離計算改為取資源「最近的對外招收時段」。
