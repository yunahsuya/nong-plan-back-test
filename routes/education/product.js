import express from 'express'
import { 
  getProducts, 
  getProductById, 
  clearProductCache, 
  refreshProductCache,
  getProductCacheStatus
} from '../../controllers/education/productController.js'

const router = express.Router()

// 產品 API 路由
router.get('/', getProducts)                    // GET /api/education/product
router.get('/:id', getProductById)              // GET /api/education/product/:id
router.delete('/cache', clearProductCache)      // DELETE /api/education/product/cache
router.post('/cache/refresh', refreshProductCache) // POST /api/education/product/cache/refresh
router.get('/cache/status', getProductCacheStatus) // GET /api/education/product/cache/status

export default router