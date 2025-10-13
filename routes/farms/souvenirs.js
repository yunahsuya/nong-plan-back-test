// routes/farms/souvenirs.js
import express from 'express'
import { 
  getAllSouvenirs,
  getSouvenirsByCounty,
  searchSouvenirs,
  getCounties,
  getStatistics,
  clearCache,
  getCacheStatus
} from '../../controllers/farms/souvenirController.js'

const router = express.Router()

// 取得所有伴手禮
router.get('/', getAllSouvenirs)

// 根據縣市篩選伴手禮
router.get('/county/:county', getSouvenirsByCounty)

// 搜尋伴手禮
router.get('/search', searchSouvenirs)

// 取得縣市列表
router.get('/counties', getCounties)

// 取得統計資料
router.get('/statistics', getStatistics)

// 清除快取
router.delete('/cache', clearCache)

// 取得快取狀態
router.get('/cache/status', getCacheStatus)

export default router