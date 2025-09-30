import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { StatusCodes } from 'http-status-codes'

// 引入 Model 類別
import { AquacultureModel } from './models/AquacultureModel.js'
import { ProductModel } from './models/ProductModel.js'
import { VarietiesModel } from './models/VarietiesModel.js'
import { FarmModel } from './models/FarmModel.js'
import { OutdoorEduFarmModel } from './models/OutdoorEduFarmModel.js'

// 建立 Model 實例
export const aquacultureModel = new AquacultureModel()
export const productModel = new ProductModel()
export const varietiesModel = new VarietiesModel()
export const farmModel = new FarmModel()
export const outdoorEduFarmModel = new OutdoorEduFarmModel()


// 引入路由
import farmRoutes from './routes/farms.js'
import educationRoutes from './routes/education.js'

// 引入中間件
import errorHandler from './middleware/errorHandler.js'

const app = express()

// 中介軟體
app.use(cors())
app.use(express.json())

// 路由
app.use('/api', farmRoutes)
app.use('/api/education', educationRoutes)

// 錯誤處理中間件
app.use(errorHandler)

// 健康檢查
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '農業計畫後端服務正常運行',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`伺服器啟動成功，監聽 http://localhost:${PORT}`)
  console.log('可用路由：')
  console.log('  GET /api/accessible-farms - 取得所有無障礙休閒農場')
  console.log('  GET /api/accessible-farms/:county - 根據縣市篩選農場')
  console.log('  GET /api/education/categories - 取得教育資源分類')
  console.log('  GET /api/education/data/:category - 取得特定分類的教育資源資料')
})