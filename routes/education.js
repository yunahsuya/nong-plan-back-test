import express from 'express'
import categoriesRouter from './education/categories.js'
import dataRouter from './education/data.js'
import productRouter from './education/product.js'        // 修改這裡
import aquacultureRouter from './education/aquaculture.js' // 修改這裡
import varietiesRouter from './education/varieties.js'    // 修改這裡

const router = express.Router()

// 分類 API
router.use('/categories', categoriesRouter)  // /api/education/categories

// 兼容舊 API 的路由
router.use('/data', dataRouter)              // /api/education/data/:category

// 各 API 的獨立路由
router.use('/product', productRouter)        // /api/education/product/*
router.use('/aquaculture', aquacultureRouter) // /api/education/aquaculture/*
router.use('/varieties', varietiesRouter)    // /api/education/varieties/*

export default router