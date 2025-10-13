// routes/agriBestItems.js
import express from 'express'
import { 
  getAllItems,
  getItemsByCounty,
  getItemsByType,
  searchItems,
  getCounties,
  getTypes,
  getStatistics,
  clearCache,
  getCacheStatus
} from '../../controllers/farms/agriBestItemController.js'

const router = express.Router()

// 取得所有農漁會年度百大農業精品好禮
router.get('/', getAllItems)

// 根據縣市篩選
router.get('/county/:county', getItemsByCounty)

// 根據類型篩選
router.get('/type/:type', getItemsByType)

// 搜尋
router.get('/search', searchItems)

// 取得縣市列表
router.get('/counties', getCounties)

// 取得類型列表
router.get('/types', getTypes)

// 取得統計資料
router.get('/statistics', getStatistics)

// 清除快取
router.delete('/cache', clearCache)

// 取得快取狀態
router.get('/cache/status', getCacheStatus)

export default router