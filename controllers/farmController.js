import { StatusCodes } from 'http-status-codes'
import { fetchFarmsFromMOA, filterFarmsByCounty, refreshCache } from '../services/farmService.js'
import { fetchPricesFromMOA, filterPricesByCrop, filterPricesByMarket, refreshPricesCache } from '../services/priceService.js'
import { getCacheStatus, clearCache } from '../services/cacheService.js'

// 取得所有無障礙休閒農場
export const getAccessibleFarms = async (req, res, next) => {
  try {
    const { refresh } = req.query // 支援 ?refresh=true 參數強制重新整理
    
    const farms = await fetchFarmsFromMOA(refresh === 'true')
    
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
    const { county: rawCounty } = req.params
    const { refresh } = req.query

    // 解碼URL編碼的中文字元
    const county = decodeURIComponent(rawCounty)

    if (!county || county.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的縣市名稱'
      })
    }
    
    const filteredFarms = await filterFarmsByCounty(county, refresh === 'true')
    
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

// === 農作物時價相關控制器 ===

// 取得所有農作物時價
export const getCropPrices = async (req, res, next) => {
  try {
    const { refresh } = req.query

    const prices = await fetchPricesFromMOA(refresh === 'true')

    res.json({
      success: true,
      data: prices,
      message: `成功取得 ${prices.length} 筆農作物時價資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// 根據作物名稱篩選時價
export const getPricesByCrop = async (req, res, next) => {
  try {
    const { crop: rawCrop } = req.params
    const { refresh } = req.query

    // 解碼URL編碼的中文字元
    const crop = decodeURIComponent(rawCrop)

    if (!crop || crop.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的作物名稱'
      })
    }

    const filteredPrices = await filterPricesByCrop(crop, refresh === 'true')

    res.json({
      success: true,
      data: filteredPrices,
      message: `找到 ${filteredPrices.length} 筆 ${crop} 的時價資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// 根據市場名稱篩選時價
export const getPricesByMarket = async (req, res, next) => {
  try {
    const { market: rawMarket } = req.params
    const { refresh } = req.query

    // 解碼URL編碼的中文字元
    const market = decodeURIComponent(rawMarket)

    if (!market || market.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的市場名稱'
      })
    }

    const filteredPrices = await filterPricesByMarket(market, refresh === 'true')

    res.json({
      success: true,
      data: filteredPrices,
      message: `找到 ${filteredPrices.length} 筆 ${market} 的時價資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// 強制重新整理時價快取
export const refreshPriceCache = async (req, res, next) => {
  try {
    const prices = await refreshPricesCache()

    res.json({
      success: true,
      data: prices,
      message: `時價快取已重新整理，取得 ${prices.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}