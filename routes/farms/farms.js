import express from 'express'
import {
  getAccessibleFarms,
  getFarmsByCounty,
  searchFarms,
  getFarmStatistics,
  getOutdoorEduFarms,
  getFarmCacheStatus,
  clearFarmCache,
  refreshFarmCache,
  getOutdoorEduFarmCacheStatus,
  clearOutdoorEduFarmCache,
  refreshOutdoorEduFarmCache
} from '../../controllers/farms/farmController.js'

const router = express.Router()

// 無障礙休閒農場路由
router.get('/accessible-farms', getAccessibleFarms)
router.get('/accessible-farms/county/:county', getFarmsByCounty)
router.get('/accessible-farms/search', searchFarms)
router.get('/accessible-farms/statistics', getFarmStatistics)
router.get('/accessible-farms/cache/status', getFarmCacheStatus)
router.delete('/accessible-farms/cache', clearFarmCache)
router.post('/accessible-farms/cache/refresh', refreshFarmCache)

// 戶外教育農場路由
router.get('/outdoor-edu-farms', getOutdoorEduFarms)
router.get('/outdoor-edu-farms/cache/status', getOutdoorEduFarmCacheStatus)
router.delete('/outdoor-edu-farms/cache', clearOutdoorEduFarmCache)
router.post('/outdoor-edu-farms/cache/refresh', refreshOutdoorEduFarmCache)

export default router