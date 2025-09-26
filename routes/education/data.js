import express from 'express'
import { getProducts } from '../../controllers/education/productController.js'
import { getAquaculture } from '../../controllers/education/aquacultureController.js'
import { getVarieties } from '../../controllers/education/varietiesController.js'

const router = express.Router()

// 兼容舊 API 的路由
router.get('/:category', async (req, res, next) => {
  try {
    const { category } = req.params
    const { refresh } = req.query
    
    // 建立新的 req 物件來傳遞給各個 controller
    const newReq = { ...req, query: { refresh } }
    
    switch (category) {
      case 'product':
        return await getProducts(newReq, res, next)
      case 'aquaculture':
        return await getAquaculture(newReq, res, next)
      case 'varieties':
        return await getVarieties(newReq, res, next)
      default:
        return res.status(404).json({
          success: false,
          message: '找不到指定的分類'
        })
    }
  } catch (error) {
    next(error)
  }
})

export default router