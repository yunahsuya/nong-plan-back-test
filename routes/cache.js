import express from 'express'
import {
  getFarmCacheStatus,
  clearFarmCache,
  refreshFarmCache
} from '../controllers/farmController.js'

const router = express.Router()

// 快取管理 API
router.get('/status', getFarmCacheStatus)
router.delete('/', clearFarmCache)
router.post('/refresh', refreshFarmCache)

export default router