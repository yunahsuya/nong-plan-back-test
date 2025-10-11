import express from 'express'
import { TrailController } from '../../controllers/farms/trailController.js'
import { TrailModel } from '../../models/farms/TrailModel.js'

const router = express.Router()
const trailModel = new TrailModel()
const trailController = new TrailController(trailModel)

// 🔧 重要：搜尋路由必須在動態路由之前定義
// 搜尋步道
router.get('/search', trailController.searchTrails.bind(trailController))

// 取得所有步道
router.get('/', trailController.getAllTrails.bind(trailController))

// 根據縣市取得步道
router.get('/:county', trailController.getTrailsByCounty.bind(trailController))

export default router