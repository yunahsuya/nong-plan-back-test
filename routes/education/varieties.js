import express from 'express'
import { 
  getVarieties, 
  getVarietyById, 
  clearVarietiesCache, 
  refreshVarietiesCache,
  getVarietiesCacheStatus
} from '../../controllers/education/varietiesController.js'

const router = express.Router()

// 品種 API 路由
router.get('/', getVarieties)                    // GET /api/education/varieties
router.get('/:id', getVarietyById)               // GET /api/education/varieties/:id
router.delete('/cache', clearVarietiesCache)     // DELETE /api/education/varieties/cache
router.post('/cache/refresh', refreshVarietiesCache) // POST /api/education/varieties/cache/refresh
router.get('/cache/status', getVarietiesCacheStatus) // GET /api/education/varieties/cache/status

export default router