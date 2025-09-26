import express from 'express'
import { 
  getAquaculture, 
  getAquacultureById, 
  clearAquacultureCache, 
  refreshAquacultureCache,
  getAquacultureCacheStatus
} from '../../controllers/education/aquacultureController.js'

const router = express.Router()

// 水產 API 路由
router.get('/', getAquaculture)                    // GET /api/education/aquaculture
router.get('/:id', getAquacultureById)             // GET /api/education/aquaculture/:id
router.delete('/cache', clearAquacultureCache)     // DELETE /api/education/aquaculture/cache
router.post('/cache/refresh', refreshAquacultureCache) // POST /api/education/aquaculture/cache/refresh
router.get('/cache/status', getAquacultureCacheStatus) // GET /api/education/aquaculture/cache/status

export default router