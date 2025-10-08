import { StatusCodes } from 'http-status-codes'
import { parkingModel } from '../../index.js'
import axios from 'axios'

/**
 * 從農業部 API 取得停車場原始資料
 */
async function fetchParkingLotsFromAPI() {
  try {
    console.log('🌐 正在從農業部 API 取得停車場資料...')
    const API_URL = 'https://data.moa.gov.tw/Service/OpenData/DataFileService.aspx'
    const response = await axios.get(API_URL, {
      params: {
        UnitId: 885,
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
    
    console.log(`✅ 成功從農業部 API 取得 ${response.data.length} 筆停車場資料`)
    return response.data
  } catch (error) {
    console.error('❌ 從農業部 API 取得停車場資料失敗:', error.message)
    throw new Error(`無法從農業部 API 取得停車場資料: ${error.message}`)
  }
}

/**
 * 取得停車場資料
 */
async function fetchParkingData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      try {
        const cachedData = await parkingModel.getAll()
        console.log('📦 使用停車場快取資料')
        return cachedData
      } catch (error) {
        console.log('⚠️ 沒有快取資料，將從 API 取得')
      }
    }
    
    // 從 API 取得資料
    console.log('🌐 嘗試從農業部 API 取得停車場資料...')
    try {
      const rawData = await fetchParkingLotsFromAPI()
      const processedData = await parkingModel.processData(rawData)
      
      console.log('✅ 成功從 API 取得並快取停車場資料')
      return processedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      try {
        const cachedData = await parkingModel.getAll()
        console.log('📦 API 失敗，使用停車場快取資料作為備案')
        return cachedData
      } catch (cacheError) {
        throw new Error('無法取得停車場資料：API 不可用且無快取資料')
      }
    }
  } catch (error) {
    console.error('❌ 取得停車場資料完全失敗:', error.message)
    throw error
  }
}

// GET /api/parking - 取得所有停車場
export const getParkingLots = async (req, res, next) => {
  try {
    const { refresh, search, limit, offset, minCapacity, accessible } = req.query
    
    console.log('🅿️ 開始取得停車場資料...')
    
    let data = await fetchParkingData(refresh === 'true')
    
    // 搜尋功能
    if (search) {
      data = data.filter(parking => 
        parking.location.includes(search)
      )
    }
    
    // 最小容量篩選
    if (minCapacity) {
      data = data.filter(parking => 
        parking.totalSpaces >= parseInt(minCapacity)
      )
    }
    
    // 無障礙設施篩選
    if (accessible === 'true') {
      data = data.filter(parking => 
        parking.accessibleFeatures.length > 0
      )
    }
    
    // 分頁處理
    const startIndex = parseInt(offset) || 0
    const endIndex = startIndex + (parseInt(limit) || data.length)
    const paginatedData = data.slice(startIndex, endIndex)
    
    console.log(`✅ 成功取得 ${paginatedData.length} 筆停車場資料`)
    
    res.json({
      success: true,
      data: paginatedData,
      pagination: {
        total: data.length,
        limit: parseInt(limit) || data.length,
        offset: startIndex,
        hasMore: endIndex < data.length
      },
      message: `成功取得 ${paginatedData.length} 筆停車場資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/parking/search - 搜尋停車場
export const searchParkingLots = async (req, res, next) => {
  try {
    const { location, minCapacity, accessible } = req.query
    
    console.log('🔍 開始搜尋停車場資料...')
    
    const searchCriteria = {}
    if (location) searchCriteria.location = location
    if (minCapacity) searchCriteria.minCapacity = parseInt(minCapacity)
    if (accessible) searchCriteria.accessible = accessible === 'true'
    
    const results = await parkingModel.search(searchCriteria)
    
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

// GET /api/parking/accessible - 取得無障礙停車場
export const getAccessibleParking = async (req, res, next) => {
  try {
    console.log('♿ 取得無障礙停車場資料...')
    
    const accessibleParking = await parkingModel.getAccessibleParking()
    
    res.json({
      success: true,
      data: accessibleParking,
      message: `找到 ${accessibleParking.length} 筆無障礙停車場`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/parking/statistics - 取得停車場統計
export const getParkingStatistics = async (req, res, next) => {
  try {
    console.log('📊 取得停車場統計...')
    
    const allData = await parkingModel.getAll()
    
    const statistics = {
      totalParkingLots: allData.length,
      totalSpaces: allData.reduce((sum, parking) => sum + parking.totalSpaces, 0),
      totalCarSpaces: allData.reduce((sum, parking) => sum + parking.parkingSpaces.car, 0),
      totalDisabledSpaces: allData.reduce((sum, parking) => sum + parking.parkingSpaces.disabled, 0),
      totalMotorcycleSpaces: allData.reduce((sum, parking) => sum + parking.parkingSpaces.motorcycle, 0),
      totalBusSpaces: allData.reduce((sum, parking) => sum + parking.parkingSpaces.bus, 0),
      accessibleParkingLots: allData.filter(parking => parking.accessibleFeatures.length > 0).length,
      averageSpacesPerLot: allData.length > 0 ? Math.round(allData.reduce((sum, parking) => sum + parking.totalSpaces, 0) / allData.length) : 0
    }
    
    res.json({
      success: true,
      data: statistics,
      message: '成功取得停車場統計'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/parking/cache/status - 取得停車場快取狀態
export const getParkingCacheStatus = async (req, res, next) => {
  try {
    const status = await parkingModel.getCacheStatus()
    
    res.json({
      success: true,
      data: status,
      message: '成功取得停車場快取狀態'
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

// DELETE /api/parking/cache - 清除停車場快取
export const clearParkingCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除停車場快取...')
    
    await parkingModel.clearCache()
    
    res.json({
      success: true,
      message: '停車場快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/parking/cache/refresh - 重新整理停車場快取
export const refreshParkingCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理停車場快取')
    
    const data = await fetchParkingData(true)
    res.json({
      success: true,
      data: data,
      message: `停車場快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}