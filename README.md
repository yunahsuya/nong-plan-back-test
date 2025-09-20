# 農業資訊 API 服務

## 專案簡介

這是一個基於 Node.js 和 Express 的農業資訊 API 服務，提供台灣無障礙休閒農場資訊和農作物市場時價查詢功能。本服務整合農委會開放資料，並具備完整的快取機制來提升查詢效能。

## 主要功能

### 🏡 無障礙休閒農場 API
- 取得所有無障礙休閒農場資訊
- 依縣市篩選農場資料
- 支援URL編碼的中文縣市名稱

### 💰 農作物時價 API
- 取得當前農作物市場時價
- 依作物名稱篩選時價資料
- 依市場名稱篩選時價資料

### 🚀 快取管理系統
- 智慧快取機制 (預設1小時有效期)
- 快取狀態監控
- 手動快取清除與重新整理
- 分離式快取設計 (農場、時價獨立管理)

## 技術架構

- **後端框架**: Express.js 5.x
- **執行環境**: Node.js (ES Module)
- **HTTP 客戶端**: Axios
- **資料驗證**: Validator.js
- **跨域支援**: CORS
- **開發工具**: Nodemon, ESLint

## API 路由

### 農場資料
```
GET /api/accessible-farms
GET /api/accessible-farms/:county
```

### 時價資料
```
GET /api/crop-prices
GET /api/crop-prices/crop/:crop
GET /api/crop-prices/market/:market
```

### 快取管理
```
GET /api/cache/status           # 查看快取狀態
DELETE /api/cache               # 清除農場快取
POST /api/cache/refresh         # 重新整理農場快取
POST /api/crop-prices/cache/refresh  # 重新整理時價快取
```

## 查詢參數

所有 GET API 都支援 `refresh=true` 參數來強制重新整理快取：
```
GET /api/accessible-farms?refresh=true
GET /api/crop-prices?refresh=true
```

## 安裝與執行

### 環境需求
- Node.js 16.x 或更新版本
- npm 或 yarn

### 安裝步驟

1. **複製專案**
```bash
git clone <repository-url>
cd nong-plan-back-test
```

2. **安裝依賴套件**
```bash
npm install
```

3. **環境變數設定**
建立 `.env` 檔案 (參考 `.env.example`):
```
PORT=4000
```

4. **啟動開發伺服器**
```bash
npm run dev
```

伺服器將在 `http://localhost:4000` 啟動

## 資料夾結構

```
nong-plan-back-test/
├── controllers/          # 控制器層
│   └── farmController.js
├── routes/              # 路由定義
│   └── farms.js
├── services/            # 服務層
│   ├── baseService.js   # 基礎服務
│   ├── farmService.js   # 農場服務
│   ├── priceService.js  # 時價服務
│   └── cacheService.js  # 快取服務
├── middleware/          # 中間件
│   └── errorHandler.js
├── cache/              # 快取資料目錄
│   ├── farms.json      # 農場快取資料
│   ├── farms-config.json
│   ├── prices.json     # 時價快取資料
│   └── prices-config.json
├── index.js            # 應用程式入口
└── package.json        # 專案配置
```

## API 回應格式

### 成功回應
```json
{
  "success": true,
  "data": [...],
  "message": "操作成功訊息",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "cached": true
}
```

### 錯誤回應
```json
{
  "success": false,
  "message": "錯誤訊息",
  "statusCode": 400
}
```

## 快取機制說明

- **快取有效期**: 1小時
- **自動清除**: 過期快取會自動重新獲取
- **手動控制**: 支援手動清除和重新整理
- **狀態監控**: 提供詳細的快取狀態資訊

## 開發指令

```bash
# 開發模式啟動 (熱重載)
npm run dev

# 程式碼檢查
npm run lint

# 程式碼格式化
npm run format
```

## 資料來源

本服務使用以下政府開放資料：
- 農委會無障礙休閒農場資料
- 農委會農產品市場交易行情

## 錯誤處理

- 完整的錯誤捕獲與處理機制
- 統一的錯誤回應格式
- 詳細的錯誤日誌記錄

## 授權

ISC License