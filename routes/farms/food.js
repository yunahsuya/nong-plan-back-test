import express from 'express'
import {
  getAllFoods,
  getFoodsByCity,
  getFoodsByTown,
  getCities,
  getTownsByCity,
  searchFoods,
  getFoodStatistics,
  getPaginatedFoods
} from '../../controllers/farms/foodController.js'

const router = express.Router()

// 分頁取得美食
router.get('/paginated', getPaginatedFoods)

// 取得所有美食
router.get('/', getAllFoods)

// 取得縣市列表
router.get('/cities', getCities)

// 取得指定縣市的鄉鎮列表
router.get('/cities/:city/towns', getTownsByCity)

// 根據縣市篩選美食
router.get('/city/:city', getFoodsByCity)

// 根據鄉鎮篩選美食
router.get('/city/:city/town/:town', getFoodsByTown)
router.get('/town/:town', getFoodsByTown)

// 搜尋美食
router.get('/search', searchFoods)

// 取得美食統計資料
router.get('/statistics', getFoodStatistics)

export default router