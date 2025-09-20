import express from 'express'
import {
  getAccessibleFarms,
  getFarmsByCounty
} from '../controllers/farmController.js'

const router = express.Router()

// 農場資料 API
router.get('/accessible-farms', getAccessibleFarms)
router.get('/accessible-farms/:county', getFarmsByCounty)

export default router