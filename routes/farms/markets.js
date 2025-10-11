import express from 'express'
import {
  getAllMarkets,
  getMarketsByCertification,
  getMarketsByCounty,  // 新增
  getCounties,         // 新增
  searchMarkets,
  getMarketStatistics,
  getPaginatedMarkets
} from '../../controllers/farms/marketController.js'

const router = express.Router()

// 分頁取得農民市集
router.get('/paginated', getPaginatedMarkets)

// 取得所有農民市集
router.get('/', getAllMarkets)

// 取得縣市列表
router.get('/counties', getCounties)

// 根據認證標章篩選市集
router.get('/certification/:certification', getMarketsByCertification)

// 根據縣市篩選市集
router.get('/county/:county', getMarketsByCounty)

// 搜尋市集
router.get('/search', searchMarkets)

// 取得市集統計資料
router.get('/statistics', getMarketStatistics)

export default router