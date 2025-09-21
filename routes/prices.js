import express from 'express'
import {
  getAllPrices,
  getPricesByCrop,
  getPricesByMarket,
  getPriceStats,
  getPriceCacheStatus,
  clearPriceCache,
  refreshPriceCache
} from '../controllers/priceController.js'

const router = express.Router()

// 農產品交易行情 API
router.get('/prices', getAllPrices)
router.get('/prices/crop/:crop', getPricesByCrop)
router.get('/prices/market/:market', getPricesByMarket)
router.get('/prices/stats', getPriceStats)

// 交易行情快取管理 API
router.get('/prices/cache/status', getPriceCacheStatus)
router.delete('/prices/cache', clearPriceCache)
router.post('/prices/cache/refresh', refreshPriceCache)

export default router