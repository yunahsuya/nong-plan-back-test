import express from 'express'
import {
  getAccessibleFarms,
  getFarmsByCounty,
  getFarmCacheStatus,
  clearFarmCache,
  refreshFarmCache,
  getCropPrices,
  getPricesByCrop,
  getPricesByMarket,
  refreshPriceCache
} from '../controllers/farmController.js'

const router = express.Router()

// 農場資料 API
router.get('/accessible-farms', getAccessibleFarms)
router.get('/accessible-farms/:county', getFarmsByCounty)

// 快取管理 API
router.get('/cache/status', getFarmCacheStatus)
router.delete('/cache', clearFarmCache)
router.post('/cache/refresh', refreshFarmCache)

// 農作物時價 API
router.get('/crop-prices', getCropPrices)
router.get('/crop-prices/crop/:crop', getPricesByCrop)
router.get('/crop-prices/market/:market', getPricesByMarket)
router.post('/crop-prices/cache/refresh', refreshPriceCache)

export default router