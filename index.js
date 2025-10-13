import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { StatusCodes } from 'http-status-codes'

// 引入 Model 類別
import { AquacultureModel } from './models/education/AquacultureModel.js'
import { ProductModel } from './models/education/ProductModel.js'
import { VarietiesModel } from './models/education/VarietiesModel.js'
import { FarmModel } from './models/farms/FarmModel.js'
import { OutdoorEduFarmModel } from './models/farms/OutdoorEduFarmModel.js'
import { ParkingModel } from './models/farms/ParkingModel.js'
import { TrailModel } from './models/farms/TrailModel.js'
import { ToiletModel } from './models/farms/ToiletModel.js'
import { MarketModel } from './models/farms/MarketModel.js'
import { FoodModel } from './models/farms/FoodModel.js'
import { SouvenirModel } from './models/farms/SouvenirModel.js'
import { AgriBestItemModel } from './models/farms/AgriBestItemModel.js'



// 建立 Model 實例
export const aquacultureModel = new AquacultureModel()
export const productModel = new ProductModel()
export const varietiesModel = new VarietiesModel()
export const farmModel = new FarmModel()
export const outdoorEduFarmModel = new OutdoorEduFarmModel()
export const parkingModel = new ParkingModel()  // 新增
export const trailModel = new TrailModel()
export const toiletModel = new ToiletModel()  
export const marketModel = new MarketModel() 
export const foodModel = new FoodModel()
export const souvenirModel = new SouvenirModel()
export const agriBestItemModel = new AgriBestItemModel()


// 引入路由
import farmRoutes from './routes/farms/farms.js'
import educationRoutes from './routes/education.js'
import parkingRoutes from './routes/farms/parking.js'
import trailRoutes from './routes/farms/trails.js'
import toiletRoutes from './routes/farms/toilets.js'
import marketRoutes from './routes/farms/markets.js'
import foodRoutes from './routes/farms/food.js'
import souvenirRoutes from './routes/farms/souvenirs.js'
import agriBestItemRoutes from './routes/farms/agriBestItems.js'
import memberProductRoutes from './routes/farms/memberProduct.js'





// 引入中間件
import errorHandler from './middleware/errorHandler.js'

const app = express()

// 中介軟體
app.use(cors())
app.use(express.json())

// 路由
app.use('/api', farmRoutes)
app.use('/api/education', educationRoutes)
app.use('/api/parking', parkingRoutes)  // 新增
app.use('/api/trails', trailRoutes)
app.use('/api/toilets', toiletRoutes)
app.use('/api/farms/markets', marketRoutes)
app.use('/api/farms/food', foodRoutes)
app.use('/api/souvenirs', souvenirRoutes)
app.use('/api/agri-best-items', agriBestItemRoutes)
app.use('/api/education/member-product', memberProductRoutes)



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
  // 無障礙休閒農場
  console.log('  GET /api/accessible-farms - 取得所有無障礙休閒農場')
  console.log('  GET /api/accessible-farms/:county - 根據縣市篩選農場')
  // 教育
  console.log('  GET /api/education/categories - 取得教育資源分類')
  console.log('  GET /api/education/data/:category - 取得特定分類的教育資源資料')
  // 停車場
  console.log('  GET /api/parking - 取得所有停車場')  // 新增
  console.log('  GET /api/parking/accessible - 取得無障礙停車場')  // 新增
  console.log('  GET /api/parking/statistics - 取得停車場統計')  // 新增
  // 市集
  console.log('  GET /api/markets - 取得所有農民市集')
  console.log('  GET /api/markets/certification/:certification - 根據認證標章篩選市集')
  console.log('  GET /api/markets/search - 搜尋市集')
  console.log('  GET /api/markets/statistics - 取得市集統計資料')
  console.log('  GET /api/farms/food - 取得所有美食')
  // 美食
  console.log('  GET /api/farms/food/paginated - 分頁取得美食')
  console.log('  GET /api/farms/food/cities - 取得縣市列表')
  console.log('  GET /api/farms/food/city/:city - 根據縣市篩選美食')
  console.log('  GET /api/farms/food/search - 搜尋美食')
  console.log('  GET /api/farms/food/statistics - 取得美食統計資料')

  // 伴手禮
  console.log('  GET /api/souvenirs - 取得所有伴手禮')
  console.log('  GET /api/souvenirs/county/:county - 根據縣市篩選伴手禮')
  console.log('  GET /api/souvenirs/search - 搜尋伴手禮')
  console.log('  GET /api/souvenirs/counties - 取得縣市列表')
  console.log('  GET /api/souvenirs/statistics - 取得統計資料')
  console.log('  DELETE /api/souvenirs/cache - 清除伴手禮快取')
  console.log('  GET /api/souvenirs/cache/status - 取得快取狀態')

  // 農漁會年度百大農業精品好禮-伴手禮
  console.log('  GET /api/agri-best-items - 取得所有農漁會年度百大農業精品好禮')
  console.log('  GET /api/agri-best-items/county/:county - 根據縣市篩選')
  console.log('  GET /api/agri-best-items/type/:type - 根據類型篩選')
  console.log('  GET /api/agri-best-items/search - 搜尋')
  console.log('  GET /api/agri-best-items/counties - 取得縣市列表')
  console.log('  GET /api/agri-best-items/types - 取得類型列表')
  console.log('  GET /api/agri-best-items/statistics - 取得統計資料')
  console.log('  DELETE /api/agri-best-items/cache - 清除快取')
  console.log('  GET /api/agri-best-items/cache/status - 取得快取狀態')

  // 農民學院找產品
  console.log('  GET /api/education/member-product - 取得所有農民學院找產品')
  console.log('  GET /api/education/member-product/members - 取得農民列表')
  console.log('  GET /api/education/member-product/crops - 取得作物列表')
  console.log('  GET /api/education/member-product/verify-markers - 取得驗證標章列表')
  console.log('  GET /api/education/member-product/statistics - 取得統計資料')
})