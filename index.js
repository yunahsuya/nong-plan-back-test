import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { StatusCodes } from 'http-status-codes'

// 引入路由
import farmRoutes from './routes/farms.js'

// 引入中間件
import errorHandler from './middleware/errorHandler.js'

const app = express()

// 中介軟體
app.use(cors())
app.use(express.json())

// 路由
app.use('/api', farmRoutes)

// 錯誤處理中間件
app.use(errorHandler)

// // 404 處理 - 使用 Express 5.x 正確語法
// app.use('*', (req, res) => {
//   res.status(StatusCodes.NOT_FOUND).json({
//     success: false,
//     message: '找不到該路由',
//     path: req.originalUrl
//   })
// })


const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`伺服器啟動成功，監聽 http://localhost:${PORT}`)
  console.log('可用路由：')
  console.log('  GET /api/accessible-farms - 取得所有無障礙休閒農場')
  console.log('  GET /api/accessible-farms/:county - 根據縣市篩選農場')
  console.log('  GET / - 健康檢查')
})