// routes/education/memberProduct.js
import express from 'express'
import { 
  getAllItems,
  getItemsByMember,
  getItemsByCrop,
  getItemsByVerifyMarker,
  getItemsByCategory,
  searchItems,
  getMembers,
  getCrops,
  getVerifyMarkers,
  getCategories,
  getStatistics,
  clearCache,
  getCacheStatus
} from '../../controllers/farms/memberProductController.js'

const router = express.Router()

// 取得所有農民學院找產品
router.get('/', getAllItems)

// 根據農民姓名篩選
router.get('/member/:member', getItemsByMember)

// 根據作物篩選
router.get('/crop/:crop', getItemsByCrop)

// 根據驗證標章篩選
router.get('/verify-marker/:verifyMarker', getItemsByVerifyMarker)

// 根據分類篩選
router.get('/category/:category', getItemsByCategory)

// 搜尋
router.get('/search', searchItems)

// 取得農民列表
router.get('/members', getMembers)

// 取得作物列表
router.get('/crops', getCrops)

// 取得驗證標章列表
router.get('/verify-markers', getVerifyMarkers)

// 取得分類列表
router.get('/categories', getCategories)

// 取得統計資料
router.get('/statistics', getStatistics)

// 清除快取
router.delete('/cache', clearCache)

// 取得快取狀態
router.get('/cache/status', getCacheStatus)

export default router