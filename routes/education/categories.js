import express from 'express'
import { getEducationCategories } from '../../controllers/education/categoriesController.js'

const router = express.Router()

// 分類 API 路由
router.get('/', getEducationCategories)  // GET /api/education/categories

export default router