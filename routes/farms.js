import express from 'express'
import { 
  getAccessibleFarms, 
  getFarmsByCounty, 
  getFarmCacheStatus, 
  clearFarmCache, 
  refreshFarmCache 
} from '../controllers/farmController.js'

const router = express.Router()

// 農場資料 API
router.get('/accessible-farms', getAccessibleFarms)
router.get('/accessible-farms/:county', getFarmsByCounty)

// 快取管理 API
router.get('/cache/status', getFarmCacheStatus)
router.delete('/cache', clearFarmCache)
router.post('/cache/refresh', refreshFarmCache)

export default router