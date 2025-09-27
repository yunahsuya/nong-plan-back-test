import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import { productModel } from '../../index.js'  // 從主程式匯入


// API 配置
const PRODUCT_API_URL = 'https://data.moa.gov.tw/Service/OpenData/MemberProductData.aspx?IsTransData=1&UnitId=173'

/**
 * 從農業部 API 取得產品原始資料
 */
async function fetchRawProductData() {
  try {
    console.log('🌾 正在從農業部 API 取得產品資料...')
    const response = await axios.get(PRODUCT_API_URL, {
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    })
    
    if (!response.data) {
      throw new Error('API 回應格式不正確')
    }
    
    console.log('✅ 成功從農業部 API 取得產品資料')
    return response.data
  } catch (error) {
    console.error('❌ 從農業部 API 取得產品資料失敗:', error.message)
    throw new Error(`無法從農業部 API 取得產品資料: ${error.message}`)
  }
}

/**
 * 取得產品資料（主要函數）
 */
async function fetchProductData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      try {
        const cachedData = await productModel.getAll()
        console.log('📦 使用產品快取資料')
        return cachedData
      } catch (error) {
        console.log('⚠️ 沒有快取資料，將從 API 取得')
      }
    }
    
    // 從 API 取得資料
    console.log('🌾 嘗試從農業部 API 取得產品資料...')
    try {
      const rawData = await fetchRawProductData()
      const processedData = await productModel.processData(rawData)
      
      console.log('✅ 成功從 API 取得並快取產品資料')
      return processedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      try {
        const cachedData = await productModel.getAll()
        console.log('📦 API 失敗，使用產品快取資料作為備案')
        return cachedData
      } catch (cacheError) {
        throw new Error('無法取得產品資料：API 不可用且無快取資料')
      }
    }
  } catch (error) {
    console.error('❌ 取得產品資料完全失敗:', error.message)
    throw error
  }
}

// ==================== API 端點 ====================

// GET /api/education/product - 取得產品資料
export const getProducts = async (req, res, next) => {
  try {
    const { refresh, search, limit, offset } = req.query
    
    console.log('🌾 開始取得產品資料...')
    
    let data
    if (search) {
      // 搜尋功能
      const searchCriteria = JSON.parse(search)
      data = await productModel.search(searchCriteria)
    } else {
      // 取得所有資料
      data = await fetchProductData(refresh === 'true')
    }
    
    // 分頁處理
    const startIndex = parseInt(offset) || 0
    const endIndex = startIndex + (parseInt(limit) || data.length)
    const paginatedData = data.slice(startIndex, endIndex)
    
    console.log(`✅ 成功取得 ${paginatedData.length} 筆產品資料`)
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: data.length,
        limit: parseInt(limit) || data.length,
        offset: startIndex,
        hasMore: endIndex < data.length
      },
      message: `成功取得 ${paginatedData.length} 筆產品資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/product/:id - 取得單一產品資料
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const item = await productModel.getById(id)
    
    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到指定的產品'
      })
    }
    
    res.json({
      success: true,
      data: item,
      message: '成功取得產品資料'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/product/search - 搜尋產品資料
export const searchProducts = async (req, res, next) => {
  try {
    const { crop, verify_marker, season } = req.query
    
    console.log('🔍 開始搜尋產品資料...')
    
    const searchCriteria = {}
    if (crop) searchCriteria.crop = crop
    if (verify_marker) searchCriteria.verify_marker = verify_marker
    if (season) searchCriteria.season = season
    
    const results = await productModel.search(searchCriteria)
    
    console.log(`✅ 搜尋完成，找到 ${results.length} 筆結果`)
    
    res.json({
      success: true,
      data: results,
      message: `搜尋完成，找到 ${results.length} 筆結果`,
      searchCriteria
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/product/statistics - 取得產品統計
export const getProductStatistics = async (req, res, next) => {
  try {
    console.log('📊 取得產品統計...')
    
    const statistics = await productModel.getStatistics()
    
    res.json({
      success: true,
      data: statistics,
      message: '成功取得產品統計'
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/education/product/cache - 清除產品快取
export const clearProductCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除產品快取...')
    
    await productModel.clearCache()
    
    res.json({
      success: true,
      message: '產品快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/education/product/cache/refresh - 重新整理產品快取
export const refreshProductCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理產品快取')
    
    const data = await fetchProductData(true)
    res.json({
      success: true,
      data: data,
      message: `產品快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/product/cache/status - 取得產品快取狀態
export const getProductCacheStatus = async (req, res, next) => {
  try {
    const status = await productModel.getCacheStatus()
    
    res.json({
      success: true,
      data: status,
      message: '成功取得產品快取狀態'
    })
  } catch (error) {
    res.json({
      success: true,
      data: {
        isValid: false,
        hasCache: false,
        dataCount: 0,
        lastUpdate: null
      },
      message: '快取狀態檢查完成'
    })
  }
}