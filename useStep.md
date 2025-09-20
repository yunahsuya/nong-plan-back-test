# 新增 API 開發步驟指南

本指南將說明如何在現有的架構基礎上新增新的 API 功能。透過詳細的步驟說明，即使是初學者也能快速上手，並確保程式碼的一致性和可維護性。

## 使用說明

### 適用對象

- 需要新增 API 功能的開發者
- 想了解專案架構的團隊成員
- 需要維護或擴展現有系統的工程師

### 閱讀指南

1. **先閱讀架構概述**：了解整體設計模式
2. **按步驟執行**：每個步驟都有詳細程式碼範例
3. **測試驗證**：每個步驟完成後都要測試
4. **參考現有實作**：對照 `farmService.js` 和 `priceService.js`

### 預估時間

- 簡單 API（無複雜篩選）：15-30 分鐘
- 中等複雜度 API（含篩選功能）：30-60 分鐘
- 複雜 API（多重篩選、特殊處理）：1-2 小時

## 架構概述

本專案採用模組化設計，使用 BaseAPIService 繼承模式來實現程式碼重用：

```
services/
├── baseService.js      # 基礎服務類別 (所有 API 服務的父類別)
├── farmService.js      # 農場 API 服務
├── priceService.js     # 時價 API 服務
└── cacheService.js     # 快取管理服務
```

## 新增 API 的完整步驟

### 步驟 1: 建立新的服務類別

在 `services/` 資料夾中建立新的服務檔案，例如 `services/weatherService.js`。

**詳細說明**：

- 檔案命名規則：`{功能名稱}Service.js`（例如：weatherService.js, newsService.js）
- 繼承 BaseAPIService 類別，自動獲得快取、錯誤處理等功能
- constructor 中的三個參數：API URL、快取前綴、超時時間（毫秒）
- 實作基本的 `getAllXXXData()` 方法和篩選方法

**程式碼範例**：

```javascript
import { BaseAPIService } from "./baseService.js";

// 氣象資料 API URL
const WEATHER_API_URL = "https://opendata.cwb.gov.tw/api/...";

class WeatherService extends BaseAPIService {
  constructor() {
    // 參數: (API_URL, 快取前綴, 超時時間)
    super(WEATHER_API_URL, "weather", 12000);
  }

  // 取得所有氣象資料
  async getAllWeatherData(forceRefresh = false) {
    return await this.fetchData(forceRefresh);
  }

  // 根據地區篩選氣象資料
  async filterByRegion(region, forceRefresh = false) {
    try {
      const data = await this.getAllWeatherData(forceRefresh);

      const filtered = data.filter((item) => {
        // 根據實際資料結構調整篩選邏輯
        return item.地區 && item.地區.includes(region);
      });

      return filtered;
    } catch (error) {
      throw error;
    }
  }

  // 重新整理快取
  async refreshCache() {
    console.log("🔄 強制重新整理氣象快取");
    return await super.refreshCache();
  }
}

// 導出單例
export const weatherService = new WeatherService();

// 導出相容性函數
export const fetchWeatherData = (forceRefresh = false) =>
  weatherService.getAllWeatherData(forceRefresh);
export const filterWeatherByRegion = (region, forceRefresh = false) =>
  weatherService.filterByRegion(region, forceRefresh);
export const refreshWeatherCache = () => weatherService.refreshCache();
```

### 步驟 2: 新增控制器函數

在 `controllers/farmController.js` 中新增新的控制器函數。

**詳細說明**：

- 在檔案頂部加入新服務的 import
- 每個控制器函數都使用 async/await 處理非同步操作
- 統一的回應格式：success、data、message、timestamp、cached
- 使用 `decodeURIComponent()` 處理 URL 中的中文參數
- 所有錯誤都透過 `next(error)` 傳遞給錯誤處理中間件

**程式碼範例**：

```javascript
// 在現有的 import 中加入新服務
import {
  fetchWeatherData,
  filterWeatherByRegion,
  refreshWeatherCache,
} from "../services/weatherService.js";

// === 氣象資料相關控制器 ===

// 取得所有氣象資料
export const getWeatherData = async (req, res, next) => {
  try {
    const { refresh } = req.query;

    console.log("🌤️ 開始取得氣象資料...");

    const data = await fetchWeatherData(refresh === "true");

    console.log(`✅ 成功取得 ${data.length} 筆氣象資料`);

    res.json({
      success: true,
      data: data,
      message: `成功取得 ${data.length} 筆氣象資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== "true",
    });
  } catch (error) {
    next(error);
  }
};

// 根據地區篩選氣象資料
export const getWeatherByRegion = async (req, res, next) => {
  try {
    const { region: rawRegion } = req.params;
    const { refresh } = req.query;

    // 解碼URL編碼的中文字元
    const region = decodeURIComponent(rawRegion);

    if (!region || region.trim() === "") {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "請提供有效的地區名稱",
      });
    }

    console.log(`🔍 篩選地區: ${region}`);

    const filteredData = await filterWeatherByRegion(
      region,
      refresh === "true"
    );

    console.log(`✅ 篩選結果: ${filteredData.length} 筆`);

    res.json({
      success: true,
      data: filteredData,
      message: `找到 ${filteredData.length} 筆 ${region} 的氣象資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== "true",
    });
  } catch (error) {
    next(error);
  }
};

// 強制重新整理氣象快取
export const refreshWeatherCache = async (req, res, next) => {
  try {
    console.log("🔄 強制重新整理氣象快取");
    const data = await refreshWeatherCache();

    res.json({
      success: true,
      data: data,
      message: `氣象快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
```

### 步驟 3: 新增路由定義

在 `routes/farms.js` 中新增路由。

**詳細說明**：

- 在檔案頂部的 import 區塊中加入新的控制器函數
- 路由路徑命名規則：`/api/{功能名稱}`
- 支援 RESTful API 設計模式
- 參數篩選路由：`/{功能名稱}/{篩選類型}/:參數`
- 快取管理路由：`/{功能名稱}/refresh`

**程式碼範例**：

首先在檔案頂部加入 import：

```javascript
import {
  // ... 現有的 import
  getWeatherData,
  getWeatherByRegion,
  refreshWeatherCache,
} from "../controllers/farmController.js";
```

然後在路由定義區塊加入：

```javascript
// 氣象資料路由
router.get("/weather", getWeatherData);
router.get("/weather/region/:region", getWeatherByRegion);
router.post("/weather/refresh", refreshWeatherCache);
```

**注意事項**：

- 確保控制器函數名稱與實際 export 的函數名稱一致
- POST 路由用於會改變伺服器狀態的操作（如重新整理快取）
- GET 路由用於查詢資料

### 步驟 4: 更新快取服務 (如需要)

如果需要快取狀態查詢功能，在 `services/cacheService.js` 中新增：

```javascript
// 氣象快取管理器
const weatherCacheManager = new CacheManager("weather");

// 導出氣象快取相關函數
export const getWeatherCacheStatus = () => weatherCacheManager.getStatus();
export const clearWeatherCache = () => weatherCacheManager.clear();

// 更新 clearAllCache 函數
export const clearAllCache = async () => {
  try {
    await farmCacheManager.clear();
    await priceCacheManager.clear();
    await weatherCacheManager.clear(); // 新增這行

    // ... 其他程式碼
  } catch (error) {
    // ... 錯誤處理
  }
};
```

### 步驟 5: 測試新 API

**測試策略**：

- 先測試基本功能，確保 API 能正常回傳資料
- 測試篩選功能，驗證參數處理
- 測試快取機制，確認資料有正確快取
- 測試錯誤處理，驗證異常情況的回應

**測試步驟**：

1. **啟動開發伺服器**

```bash
npm run dev
```

檢查伺服器啟動日誌，確認新路由有被正確載入。

2. **測試基本 API 功能**

```bash
# 取得所有氣象資料（第一次會從遠端 API 獲取）
curl "http://localhost:4000/api/weather"

# 再次請求（應該從快取獲取，回應更快）
curl "http://localhost:4000/api/weather"
```

3. **測試篩選功能**

```bash
# 根據地區篩選（中文參數會自動編碼）
curl "http://localhost:4000/api/weather/region/台北"

# 測試不存在的地區（應該回傳空陣列但不會錯誤）
curl "http://localhost:4000/api/weather/region/不存在的地區"
```

4. **測試快取管理**

```bash
# 強制重新整理快取
curl -X POST "http://localhost:4000/api/weather/refresh"

# 強制重新整理並取得資料
curl "http://localhost:4000/api/weather?refresh=true"
```

5. **驗證快取狀態**

```bash
# 檢查快取狀態（查看快取檔案資訊）
curl "http://localhost:4000/api/cache/status"
```

6. **測試錯誤處理**

```bash
# 測試空參數（應該回傳 400 錯誤）
curl "http://localhost:4000/api/weather/region/"

# 測試無效路由（應該回傳 404 錯誤）
curl "http://localhost:4000/api/weather/invalid"
```

**預期結果檢查**：

- ✅ API 回傳正確的 JSON 格式
- ✅ 快取機制正常運作（第二次請求更快）
- ✅ 中文參數正確處理
- ✅ 錯誤回應包含適當的狀態碼和訊息

### 步驟 6: 更新文檔

在 `README.md` 中新增新 API 的說明：

```markdown
### 氣象資料 API

- 取得所有氣象資料
- 依地區篩選氣象資料
- 支援URL編碼的中文地區名稱

### API 路由
```

GET /api/weather
GET /api/weather/region/:region
POST /api/weather/refresh

```

```

## 重要注意事項

### 1. BaseAPIService 功能

- 自動處理 HTTP 請求
- 內建快取機制 (1小時 TTL)
- 統一的錯誤處理
- 超時控制

### 2. 快取命名規則

- 快取檔案: `cache/{prefix}.json`
- 設定檔案: `cache/{prefix}-config.json`
- 確保 prefix 唯一且具描述性

### 3. 中文字元處理

- 在控制器中使用 `decodeURIComponent()` 處理中文參數
- 確保 API 能正確處理 URL 編碼的中文字元

### 4. 錯誤處理

- 使用統一的錯誤處理中間件
- 回傳一致的錯誤格式
- 記錄適當的日誌訊息

### 5. 回應格式

所有 API 都應該回傳一致的格式：

```json
{
  "success": true/false,
  "data": [...],
  "message": "操作訊息",
  "timestamp": "ISO 時間戳",
  "cached": true/false
}
```

## 常見問題排解

### 1. API 回傳 500 錯誤

- 檢查 API URL 是否正確
- 確認資料結構與篩選邏輯相符
- 查看伺服器日誌中的錯誤訊息

### 2. 中文參數無法正確處理

- 確保在控制器中使用 `decodeURIComponent()`
- 檢查前端是否正確編碼中文字元

### 3. 快取無法正常運作

- 確認 `cache/` 資料夾存在且有寫入權限
- 檢查快取檔案是否正確生成

### 4. 繼承問題

- 確保新服務類別正確繼承 `BaseAPIService`
- 檢查 constructor 參數是否正確傳遞

## 實用技巧和最佳實踐

### 開發技巧

1. **程式碼複製策略**
   - 直接複製現有的 `farmService.js` 或 `priceService.js`
   - 修改類別名稱、API URL 和篩選邏輯
   - 這比從零開始寫更快且不容易出錯

2. **調試技巧**
   - 使用 `console.log()` 查看資料結構
   - 先用瀏覽器或 Postman 測試遠端 API
   - 檢查 `cache/` 資料夾中的快取檔案內容

3. **命名規範**
   - 服務類別：`XxxService`（如 `WeatherService`）
   - 檔案名稱：`xxxService.js`（如 `weatherService.js`）
   - 控制器函數：`getXxxData`、`getXxxByYyy`
   - 快取前綴：小寫英文（如 `weather`、`news`）

### 常見資料處理模式

1. **政府開放資料**

   ```javascript
   // 通常需要處理中文欄位名稱
   const filtered = data.filter((item) => {
     return item.縣市 && item.縣市.includes(county);
   });
   ```

2. **第三方 API**

   ```javascript
   // 通常使用英文欄位
   const filtered = data.filter((item) => {
     return item.region && item.region.includes(region);
   });
   ```

3. **複雜篩選**
   ```javascript
   // 多重條件篩選
   async filterByMultipleConditions(county, category, forceRefresh = false) {
     const data = await this.getAllData(forceRefresh)
     return data.filter(item => {
       const matchCounty = !county || item.縣市?.includes(county)
       const matchCategory = !category || item.類別?.includes(category)
       return matchCounty && matchCategory
     })
   }
   ```

### 效能優化建議

1. **快取策略**
   - 大型資料集：設定較長的快取時間（2-4 小時）
   - 即時性資料：設定較短的快取時間（15-30 分鐘）
   - 靜態資料：可設定更長快取時間（12-24 小時）

2. **超時設定**
   - 國內 API：8000-12000ms
   - 國外 API：15000-20000ms
   - 大型資料：20000-30000ms

### 部署前檢查清單

- [ ] 所有 API 端點都能正常回應
- [ ] 快取機制正常運作
- [ ] 中文參數處理正確
- [ ] 錯誤處理完整
- [ ] 文檔已更新（README.md）
- [ ] 程式碼符合專案風格
- [ ] 已測試邊界情況

## 範例：完整的天氣 API 實作

參考現有的 `farmService.js` 和 `priceService.js` 來了解完整的實作模式。每個新 API 都應該遵循相同的模式以保持程式碼的一致性和可維護性。

### 學習資源

- **farmService.js**: 簡單的資料篩選模式
- **priceService.js**: 多欄位篩選模式
- **baseService.js**: 了解底層實作原理
- **cacheService.js**: 快取管理機制
