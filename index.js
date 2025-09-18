// 載入環境變數，讓專案可以使用 .env 檔案 (自動載入 .env 檔案中的環境變數)
import 'dotenv/config'

// 用來建立伺服器
import express from 'express'

// 引入 http 狀態碼
import { StatusCodes } from 'http-status-codes'


// 引入 cors 解決跨域問題
import cors from 'cors'

//  引入 mongoose，用來連接 MongoDB
// import mongoose from 'mongoose'

// 設定驗證策略
// import './passport.js'

// 連接資料庫
// mongoose
//   .connect(process.env.DB_URL)
//   .then(() => {
//     console.log('資料庫連線成功')
//     mongoose.set('sanitizeFilter', true)
//   })
//   .catch((error) => {
//     console.log('資料庫連線失敗')
//     console.error('資料庫連線失敗', error)
//   })

// 建立 express 伺服器，並設定中介軟體
const app = express()

// 把 cors 中介程式全域掛上。效果：允許不同網域的網頁去叫這個 API（預設允許所有來源）
app.use(cors())

// 內建中介軟體：用來解析 JSON 格式的請求主體 (body)，並把結果放到 req.body
app.use(express.json())

// 內建中介軟體：用來解析 URL-encoded 格式的請求主體 (body)，並把結果放到 req.body
app.use((error, req, res, _next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: 'JSON 格式錯誤',
  })
})


// 處理未定義的路由 (接下來是「catch-all」的路由處理，當沒有任何 route 符合時就會落到這裡。)
app.all(/.*/, (req, res) => {
    res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: '找不到該路由',
  })
})

// 啟動伺服器，讓它監聽本機的 4000 埠口（port）。當伺服器成功啟動，會執行第二個參數裡的回呼函式（callback）。
app.listen(4000, () => {
  console.log('伺服器啟動')
})