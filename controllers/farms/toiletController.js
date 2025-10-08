// nong-plan-back-test/controllers/farms/toiletController.js
import { StatusCodes } from 'http-status-codes'
import { toiletModel } from '../../index.js'
import axios from 'axios'

/**
 * 從農業部 API 取得廁所原始資料
 */
async function fetchToiletsFromAPI() {
  try {
    console.log('🌐 正在從農業部 API 取得廁所資料...')
    const API_URL = 'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx'
    const response = await axios.get(API_URL, {
      params: {
        UnitId: 886,
        IsTransData: 1
      },
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('API 回應格式不正確')
    }
    
    console.log(`✅ 成功從農業部 API 取得 ${response.data.length} 筆廁所資料`)
    return response.data
  } catch (error) {
    console.error('❌ 從農業部 API 取得廁所資料失敗:', error.message)
    throw new Error(`無法從農業部 API 取得廁所資料: ${error.message}`)
  }
}

/**
 * 取得廁所資料
 */
async function fetchToiletData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      try {
        const cachedData = await toiletModel.getAll()
        console.log('📦 使用廁所快取資料')
        return cachedData
      } catch (error) {
        console.log('⚠️ 沒有快取資料，將從 API 取得')
      }
    }
    
    // 從 API 取得資料
    console.log('🌐 嘗試從農業部 API 取得廁所資料...')
    try {
      const rawData = await fetchToiletsFromAPI()
      const processedData = await toiletModel.processData(rawData)
      
      console.log('✅ 成功從 API 取得並快取廁所資料')
      return processedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      try {
        const cachedData = await toiletModel.getAll()
        console.log('📦 API 失敗，使用廁所快取資料作為備案')
        return cachedData
      } catch (cacheError) {
        throw new Error('無法取得廁所資料：API 不可用且無快取資料')
      }
    }
  } catch (error) {
    console.error('❌ 取得廁所資料完全失敗:', error.message)
    throw error
  }
}

// GET /api/toilets - 取得所有廁所
export const getToilets = async (req, res, next) => {
  try {
    const { refresh, search, limit, offset, accessible } = req.query
    
    console.log('🚻 開始取得廁所資料...')
    
    let data = await fetchToiletData(refresh === 'true')
    
    // 搜尋功能
    if (search) {
      data = data.filter(toilet => 
        toilet.地點.includes(search)
      )
    }
    
    // 無障礙設施篩選
    if (accessible === 'true') {
      data = data.filter(toilet => 
        toilet.accessibleFeatures.length > 0
      )
    }
    
    // 分頁處理
    const startIndex = parseInt(offset) || 0
    const endIndex = startIndex + (parseInt(limit) || data.length)
    const paginatedData = data.slice(startIndex, endIndex)
    
    console.log(`✅ 成功取得 ${paginatedData.length} 筆廁所資料`)
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: data.length,
        limit: parseInt(limit) || data.length,
        offset: startIndex,
        hasMore: endIndex < data.length
      },
      message: `成功取得 ${paginatedData.length} 筆廁所資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/toilets/search - 搜尋廁所
export const searchToilets = async (req, res, next) => {
  try {
    const { location, accessible } = req.query
    
    console.log('🔍 開始搜尋廁所資料...')
    
    const searchCriteria = {}
    if (location) searchCriteria.location = location
    if (accessible) searchCriteria.accessible = accessible === 'true'
    
    const results = await toiletModel.search(searchCriteria)
    
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

// GET /api/toilets/accessible - 取得無障礙廁所
export const getAccessibleToilets = async (req, res, next) => {
  try {
    console.log('♿ 取得無障礙廁所資料...')
    
    const accessibleToilets = await toiletModel.getAccessibleToilets()
    
    res.json({
      success: true,
      data: accessibleToilets,
      message: `找到 ${accessibleToilets.length} 筆無障礙廁所`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/toilets/statistics - 取得廁所統計
export const getToiletStatistics = async (req, res, next) => {
  try {
    console.log('📊 取得廁所統計...')
    
    const allData = await toiletModel.getAll()
    
    const statistics = {
      totalToilets: allData.length,
      accessibleToilets: allData.filter(toilet => toilet.accessibleFeatures.length > 0).length,
      averageCapacity: allData.length > 0 ? 
        Math.round(allData.reduce((sum, toilet) => {
          const capacity = parseInt(toilet.容納人數?.match(/\d+/)?.[0]) || 0
          return sum + capacity
        }, 0) / allData.length) : 0
    }
    
    res.json({
      success: true,
      data: statistics,
      message: '成功取得廁所統計'
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/toilets/cache - 清除廁所快取
export const clearToiletCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除廁所快取...')
    
    await toiletModel.clearCache()
    
    res.json({
      success: true,
      message: '廁所快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/toilets/cache/refresh - 重新整理廁所快取
export const refreshToiletCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理廁所快取')
    
    const data = await fetchToiletData(true)
    res.json({
      success: true,
      data: data,
      message: `廁所快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}