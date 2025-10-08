import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import { farmModel, outdoorEduFarmModel } from '../../index.js'  // 從主程式匯入


// API 配置
const MOA_API_URL = 'https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvAccessibleFarm.aspx?IsTransData=1&UnitId=241'
const MOA_OUTDOOR_EDU_API_URL = 'https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvOutdoorEdu.aspx?IsTransData=1&UnitId=242'

/**
 * 從農委會 API 取得原始資料
 */
async function fetchRawFarmData() {
  try {
    console.log('🌐 正在從農委會 API 取得農場資料...')
    const response = await axios.get(MOA_API_URL, {
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024, // 限制回應大小 5MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('API 回應格式不正確')
    }
    
    if (response.data.length > 10000) {
      throw new Error('API 回應資料過多')
    }
    
    console.log(`✅ 成功從農委會 API 取得 ${response.data.length} 筆資料`)
    return response.data
  } catch (error) {
    console.error('❌ 從農委會 API 取得農場資料失敗:', error.message)
    throw new Error(`無法從農委會 API 取得農場資料: ${error.message}`)
  }
}

/**
 * 取得農場資料（主要函數）
 */
async function fetchFarmData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      try {
        const cachedData = await farmModel.getAll()
        console.log('📦 使用農場快取資料')
        return cachedData
      } catch (error) {
        console.log('⚠️ 沒有快取資料，將從 API 取得')
      }
    }
    
    // 從 API 取得資料
    console.log('🌐 嘗試從農委會 API 取得農場資料...')
    try {
      const rawData = await fetchRawFarmData()
      const processedData = await farmModel.processData(rawData)
      
      console.log('✅ 成功從 API 取得並快取農場資料')
      return processedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      try {
        const cachedData = await farmModel.getAll()
        console.log('📦 API 失敗，使用農場快取資料作為備案')
        return cachedData
      } catch (cacheError) {
        throw new Error('無法取得農場資料：API 不可用且無快取資料')
      }
    }
  } catch (error) {
    console.error('❌ 取得農場資料完全失敗:', error.message)
    throw error
  }
}

/**
 * 從農委會 API 取得戶外教育農場原始資料
 */
async function fetchRawOutdoorEduFarmData() {
  try {
    console.log('🌐 正在從農委會 API 取得戶外教育農場資料...')
    const response = await axios.get(MOA_OUTDOOR_EDU_API_URL, {
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('API 回應格式不正確')
    }
    
    console.log(`✅ 成功從農委會 API 取得戶外教育農場 ${response.data.length} 筆資料`)
    return response.data
  } catch (error) {
    console.error('❌ 從農委會 API 取得戶外教育農場資料失敗:', error.message)
    throw new Error(`無法從農委會 API 取得戶外教育農場資料: ${error.message}`)
  }
}

// ... existing code ...

/**
 * 取得戶外教育農場資料
 */
async function fetchOutdoorEduFarmData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      try {
        const cachedData = await outdoorEduFarmModel.getAll()
        console.log('📦 使用戶外教育農場快取資料')
        return cachedData
      } catch (error) {
        console.log('⚠️ 沒有快取資料，將從 API 取得')
      }
    }
    
    // 從 API 取得資料
    console.log('🌐 嘗試從農委會 API 取得戶外教育農場資料...')
    try {
      const rawData = await fetchRawOutdoorEduFarmData()
      const processedData = await outdoorEduFarmModel.processData(rawData)
      
      console.log('✅ 成功從 API 取得並快取戶外教育農場資料')
      return processedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      try {
        const cachedData = await outdoorEduFarmModel.getAll()
        console.log('📦 API 失敗，使用戶外教育農場快取資料作為備案')
        return cachedData
      } catch (cacheError) {
        throw new Error('無法取得戶外教育農場資料：API 不可用且無快取資料')
      }
    }
  } catch (error) {
    console.error('❌ 取得戶外教育農場資料完全失敗:', error.message)
    throw error
  }
}

// ... existing code ...

// ==================== API 端點 ====================

// GET /api/farms - 取得所有無障礙休閒農場
export const getAccessibleFarms = async (req, res, next) => {
  try {
    const { refresh, search, limit, offset } = req.query
    
    console.log('🌾 開始取得無障礙休閒農場資料...')
    
    let data
    if (search) {
      // 搜尋功能
      const searchCriteria = JSON.parse(search)
      data = await farmModel.search(searchCriteria)
    } else {
      // 取得所有資料
      data = await fetchFarmData(refresh === 'true')
    }
    
    // 分頁處理
    const startIndex = parseInt(offset) || 0
    const endIndex = startIndex + (parseInt(limit) || data.length)
    const paginatedData = data.slice(startIndex, endIndex)
    
    console.log(`✅ 成功取得 ${paginatedData.length} 筆農場資料`)
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: data.length,
        limit: parseInt(limit) || data.length,
        offset: startIndex,
        hasMore: endIndex < data.length
      },
      message: `成功取得 ${paginatedData.length} 筆無障礙休閒農場資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/farms/county/:county - 根據縣市篩選農場
export const getFarmsByCounty = async (req, res, next) => {
  try {
    const { county } = req.params
    const { refresh } = req.query
    
    if (!county || county.trim() === '' || county.length > 50 || !/^[\u4e00-\u9fff\w\s]+$/.test(county)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的縣市名稱'
      })
    }
    
    console.log(`🔍 篩選縣市: ${county}`)
    
    const filteredFarms = await farmModel.getByCounty(county)
    
    console.log(`✅ 篩選結果: ${filteredFarms.length} 筆`)
    
    res.json({
      success: true,
      data: filteredFarms,
      message: `找到 ${filteredFarms.length} 筆 ${county} 的農場資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/farms/search - 搜尋農場
export const searchFarms = async (req, res, next) => {
  try {
    const { name, county, accessibleItem, minLat, maxLat, minLng, maxLng } = req.query
    
    console.log('🔍 開始搜尋農場資料...')
    
    const searchCriteria = {}
    if (name) searchCriteria.name = name
    if (county) searchCriteria.county = county
    if (accessibleItem) searchCriteria.accessibleItem = accessibleItem
    if (minLat || maxLat || minLng || maxLng) {
      searchCriteria.coordinates = {}
      if (minLat) searchCriteria.coordinates.minLat = parseFloat(minLat)
      if (maxLat) searchCriteria.coordinates.maxLat = parseFloat(maxLat)
      if (minLng) searchCriteria.coordinates.minLng = parseFloat(minLng)
      if (maxLng) searchCriteria.coordinates.maxLng = parseFloat(maxLng)
    }
    
    const results = await farmModel.search(searchCriteria)
    
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

// GET /api/farms/statistics - 取得農場統計
export const getFarmStatistics = async (req, res, next) => {
  try {
    console.log('📊 取得農場統計...')
    
    const statistics = await farmModel.getStatistics()
    
    res.json({
      success: true,
      data: statistics,
      message: '成功取得農場統計'
    })
  } catch (error) {
    next(error)
  }
}


// GET /api/outdoor-edu-farms - 取得戶外教育農場
export const getOutdoorEduFarms = async (req, res, next) => {
  try {
    const { refresh, search, limit, offset } = req.query
    
    console.log('🌾 開始取得戶外教育農場資料...')
    
    let data
    if (search) {
      // 搜尋功能
      const searchCriteria = JSON.parse(search)
      data = await outdoorEduFarmModel.search(searchCriteria)
    } else {
      // 取得所有資料
      data = await fetchOutdoorEduFarmData(refresh === 'true')
    }
    
    // 分頁處理
    const startIndex = parseInt(offset) || 0
    const endIndex = startIndex + (parseInt(limit) || data.length)
    const paginatedData = data.slice(startIndex, endIndex)
    
    console.log(`✅ 成功取得 ${paginatedData.length} 筆戶外教育農場資料`)
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: data.length,
        limit: parseInt(limit) || data.length,
        offset: startIndex,
        hasMore: endIndex < data.length
      },
      message: `成功取得 ${paginatedData.length} 筆戶外教育農場資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}


// GET /api/outdoor-edu-farms/cache/status - 取得戶外教育農場快取狀態
export const getOutdoorEduFarmCacheStatus = async (req, res, next) => {
  try {
    const status = await outdoorEduFarmModel.getCacheStatus()
    
    res.json({
      success: true,
      data: status,
      message: '成功取得戶外教育農場快取狀態'
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

// DELETE /api/outdoor-edu-farms/cache - 清除戶外教育農場快取
export const clearOutdoorEduFarmCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除戶外教育農場快取...')
    
    await outdoorEduFarmModel.clearCache()
    
    res.json({
      success: true,
      message: '戶外教育農場快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/outdoor-edu-farms/cache/refresh - 重新整理戶外教育農場快取
export const refreshOutdoorEduFarmCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理戶外教育農場快取')
    
    const data = await fetchOutdoorEduFarmData(true)
    res.json({
      success: true,
      data: data,
      message: `戶外教育農場快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}


// GET /api/farms/cache/status - 取得農場快取狀態
export const getFarmCacheStatus = async (req, res, next) => {
  try {
    const status = await farmModel.getCacheStatus()
    
    res.json({
      success: true,
      data: status,
      message: '成功取得農場快取狀態'
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

// DELETE /api/farms/cache - 清除農場快取
export const clearFarmCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除農場快取...')
    
    await farmModel.clearCache()
    
    res.json({
      success: true,
      message: '農場快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/farms/cache/refresh - 重新整理農場快取
export const refreshFarmCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理農場快取')
    
    const data = await fetchFarmData(true)
    res.json({
      success: true,
      data: data,
      message: `農場快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}