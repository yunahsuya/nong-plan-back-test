import { StatusCodes } from 'http-status-codes'
import { fetchFarmsFromMOA, filterFarmsByCounty, refreshCache } from '../../nong-plan/src/services/moaService.js'
import { getCacheStatus, clearCache } from '../../nong-plan/src/services/cacheService.js'

// 取得所有無障礙休閒農場
export const getAccessibleFarms = async (req, res, next) => {
  try {
    const { refresh } = req.query // 支援 ?refresh=true 參數強制重新整理
    
    console.log('🌾 開始取得無障礙休閒農場資料...')
    
    const farms = await fetchFarmsFromMOA(refresh === 'true')
    
    console.log(`✅ 成功取得 ${farms.length} 筆農場資料`)
    
    res.json({
      success: true,
      data: farms,
      message: `成功取得 ${farms.length} 筆無障礙休閒農場資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// 根據縣市篩選農場
export const getFarmsByCounty = async (req, res, next) => {
  try {
    const { county } = req.params
    const { refresh } = req.query
    
    if (!county || county.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的縣市名稱'
      })
    }
    
    console.log(`🔍 篩選縣市: ${county}`)
    
    const filteredFarms = await filterFarmsByCounty(county, refresh === 'true')
    
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

// 快取管理 API
export const getFarmCacheStatus = async (req, res, next) => {
  try {
    const status = await getCacheStatus()
    res.json({
      success: true,
      data: status,
      message: '快取狀態查詢成功'
    })
  } catch (error) {
    next(error)
  }
}

// 清除快取
export const clearFarmCache = async (req, res, next) => {
  try {
    await clearCache()
    res.json({
      success: true,
      message: '快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// 強制重新整理快取
export const refreshFarmCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理快取')
    const farms = await refreshCache()
    
    res.json({
      success: true,
      data: farms,
      message: `快取已重新整理，取得 ${farms.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}