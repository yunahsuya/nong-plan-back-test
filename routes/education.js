import express from 'express'
import { 
  getEducationData, 
  getEducationCategories, 
  clearEducationCache, 
  refreshEducationCache 
} from '../controllers/educationController.js'

const router = express.Router()

// 教育資源 API
router.get('/categories', getEducationCategories)
router.get('/data/:category', getEducationData)

// 快取管理 API
router.delete('/cache', clearEducationCache)
router.post('/cache/refresh', refreshEducationCache) // 重新整理所有分類
router.post('/cache/refresh/:category', refreshEducationCache) // 重新整理特定分類

export default router