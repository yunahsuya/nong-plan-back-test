import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import { aquacultureModel } from '../../index.js'  // 從主程式匯入

// API 配置
const AQUACULTURE_API_URL = 'https://data.moa.gov.tw/Service/OpenData/Tfrin.aspx?key=1200&IsTransData=1&UnitId=373'

/**
 * 從農業部 API 取得原始資料
 */
async function fetchRawAquacultureData() {
  try {
    console.log('🐟 正在從農業部 API 取得水產資料...')
    const response = await axios.get(AQUACULTURE_API_URL, {
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
    
    console.log('✅ 成功從農業部 API 取得水產資料')
    return response.data
  } catch (error) {
    console.error('❌ 從農業部 API 取得水產資料失敗:', error.message)
    throw new Error(`無法從農業部 API 取得水產資料: ${error.message}`)
  }
}

/**
 * 取得水產資料（主要函數）
 */
async function fetchAquacultureData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      try {
        const cachedData = await aquacultureModel.getAll()
        console.log('📦 使用水產快取資料')
        return cachedData
      } catch (error) {
        console.log('⚠️ 沒有快取資料，將從 API 取得')
      }
    }
    
    // 從 API 取得資料
    console.log('🐟 嘗試從農業部 API 取得水產資料...')
    try {
      const rawData = await fetchRawAquacultureData()
      const processedData = await aquacultureModel.processData(rawData)
      
      console.log('✅ 成功從 API 取得並快取水產資料')
      return processedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      try {
        const cachedData = await aquacultureModel.getAll()
        console.log('📦 API 失敗，使用水產快取資料作為備案')
        return cachedData
      } catch (cacheError) {
        throw new Error('無法取得水產資料：API 不可用且無快取資料')
      }
    }
  } catch (error) {
    console.error('❌ 取得水產資料完全失敗:', error.message)
    throw error
  }
}

// ==================== API 端點 ====================

// GET /api/education/aquaculture - 取得水產資料
export const getAquaculture = async (req, res, next) => {
  try {
    const { refresh, search, limit, offset } = req.query
    
    console.log('🐟 開始取得水產資料...')
    
    let data
    if (search) {
      // 搜尋功能
      const searchCriteria = JSON.parse(search)
      data = await aquacultureModel.search(searchCriteria)
    } else {
      // 取得所有資料
      data = await fetchAquacultureData(refresh === 'true')
    }
    
    // 分頁處理
    const startIndex = parseInt(offset) || 0
    const endIndex = startIndex + (parseInt(limit) || data.length)
    const paginatedData = data.slice(startIndex, endIndex)
    
    console.log(`✅ 成功取得 ${paginatedData.length} 筆水產資料`)
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: data.length,
        limit: parseInt(limit) || data.length,
        offset: startIndex,
        hasMore: endIndex < data.length
      },
      message: `成功取得 ${paginatedData.length} 筆水產資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/aquaculture/:id - 取得單一水產資料
export const getAquacultureById = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const item = await aquacultureModel.getById(id)
    
    if (!item) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到指定的水產資料'
      })
    }
    
    res.json({
      success: true,
      data: item,
      message: '成功取得水產資料'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/aquaculture/search - 搜尋水產資料
export const searchAquaculture = async (req, res, next) => {
  try {
    const { title, category, minLat, maxLat, minLng, maxLng } = req.query
    
    console.log('🔍 開始搜尋水產資料...')
    
    const searchCriteria = {}
    if (title) searchCriteria.title = title
    if (category) searchCriteria.category = category
    if (minLat || maxLat || minLng || maxLng) {
      searchCriteria.coordinates = {}
      if (minLat) searchCriteria.coordinates.minLat = parseFloat(minLat)
      if (maxLat) searchCriteria.coordinates.maxLat = parseFloat(maxLat)
      if (minLng) searchCriteria.coordinates.minLng = parseFloat(minLng)
      if (maxLng) searchCriteria.coordinates.maxLng = parseFloat(maxLng)
    }
    
    const results = await aquacultureModel.search(searchCriteria)
    
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

// GET /api/education/aquaculture/statistics - 取得水產資料統計
export const getAquacultureStatistics = async (req, res, next) => {
  try {
    console.log('📊 取得水產資料統計...')
    
    const statistics = await aquacultureModel.getStatistics()
    
    res.json({
      success: true,
      data: statistics,
      message: '成功取得水產資料統計'
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/education/aquaculture/cache - 清除水產快取
export const clearAquacultureCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除水產快取...')
    
    await aquacultureModel.clearCache()
    
    res.json({
      success: true,
      message: '水產快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/education/aquaculture/cache/refresh - 重新整理水產快取
export const refreshAquacultureCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理水產快取')
    
    const data = await fetchAquacultureData(true)
    res.json({
      success: true,
      data: data,
      message: `水產快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/aquaculture/cache/status - 取得水產快取狀態
export const getAquacultureCacheStatus = async (req, res, next) => {
  try {
    const status = await aquacultureModel.getCacheStatus()
    
    res.json({
      success: true,
      data: status,
      message: '成功取得水產快取狀態'
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