import express from 'express'
import {
  getParkingLots,
  searchParkingLots,
  getAccessibleParking,
  getParkingStatistics,
  getParkingCacheStatus,
  clearParkingCache,
  refreshParkingCache
} from '../../controllers/farms/parkingController.js'

const router = express.Router()

// 停車場路由
router.get('/', getParkingLots)
router.get('/search', searchParkingLots)
router.get('/accessible', getAccessibleParking)
router.get('/statistics', getParkingStatistics)
router.get('/cache/status', getParkingCacheStatus)
router.delete('/cache', clearParkingCache)
router.post('/cache/refresh', refreshParkingCache)

export default router