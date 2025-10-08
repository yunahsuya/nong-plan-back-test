// nong-plan-back-test/routes/farms/toilets.js
import express from 'express'
import {
  getToilets,
  searchToilets,
  getAccessibleToilets,
  getToiletStatistics,
  clearToiletCache,
  refreshToiletCache
} from '../../controllers/farms/toiletController.js'

const router = express.Router()

// GET /api/toilets - 取得所有廁所
router.get('/', getToilets)

// GET /api/toilets/search - 搜尋廁所
router.get('/search', searchToilets)

// GET /api/toilets/accessible - 取得無障礙廁所
router.get('/accessible', getAccessibleToilets)

// GET /api/toilets/statistics - 取得廁所統計
router.get('/statistics', getToiletStatistics)

// DELETE /api/toilets/cache - 清除廁所快取
router.delete('/cache', clearToiletCache)

// POST /api/toilets/cache/refresh - 重新整理廁所快取
router.post('/cache/refresh', refreshToiletCache)

export default router