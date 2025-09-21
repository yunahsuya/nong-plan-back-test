import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 農委會農產品交易行情 API URL
const MOA_PRICE_API_URL = 'https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx?IsTransData=1&UnitId=037'

// 快取檔案路徑
const CACHE_DIR = path.join(__dirname, '../cache')
const PRICE_CACHE_FILE = path.join(CACHE_DIR, 'prices.json')
const PRICE_CONFIG_FILE = path.join(CACHE_DIR, 'price-config.json')

// 從農委會 API 取得交易行情資料
async function fetchPriceDataFromMOA() {
  try {
    console.log('🌐 正在從農委會 API 取得交易行情資料...')
    const response = await axios.get(MOA_PRICE_API_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('API 回應格式不正確')
    }

    console.log(`✅ 成功從農委會 API 取得 ${response.data.length} 筆交易資料`)
    return response.data
  } catch (error) {
    console.error('❌ 從農委會 API 取得交易資料失敗:', error.message)
    throw new Error(`無法從農委會 API 取得交易資料: ${error.message}`)
  }
}

// 轉換交易資料格式
function transformPriceData(rawData) {
  return rawData.map(item => ({
    id: `${item['交易日期']}-${item['作物代號']}-${item['市場代號']}`,
    tradeDate: item['交易日期'],
    categoryCode: item['種類代碼'],
    cropCode: item['作物代號'],
    cropName: item['作物名稱'],
    marketCode: item['市場代號'],
    marketName: item['市場名稱'],
    prices: {
      high: parseFloat(item['上價']) || 0,
      middle: parseFloat(item['中價']) || 0,
      low: parseFloat(item['下價']) || 0,
      average: parseFloat(item['平均價']) || 0
    },
    volume: parseFloat(item['交易量']) || 0,
    // 額外的統計資訊
    priceRange: (parseFloat(item['上價']) || 0) - (parseFloat(item['下價']) || 0),
    totalValue: (parseFloat(item['平均價']) || 0) * (parseFloat(item['交易量']) || 0)
  }))
}

// 儲存資料到快取檔案
async function savePriceToCache(priceData) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })

    await fs.writeFile(PRICE_CACHE_FILE, JSON.stringify(priceData, null, 2), 'utf8')

    const cacheConfig = {
      enabled: true,
      ttl: 3600000, // 1 小時 (交易資料更新較頻繁)
      maxRetries: 3,
      lastUpdate: new Date().toISOString()
    }
    await fs.writeFile(PRICE_CONFIG_FILE, JSON.stringify(cacheConfig, null, 2), 'utf8')

    console.log('💾 交易資料已儲存到快取檔案')
  } catch (error) {
    console.error('❌ 儲存快取檔案失敗:', error.message)
    throw error
  }
}

// 從快取檔案讀取資料
async function loadPriceFromCache() {
  try {
    const data = await fs.readFile(PRICE_CACHE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.log('⚠️ 無法讀取交易快取檔案，將從 API 取得資料')
    return null
  }
}

// 檢查快取是否有效
async function isPriceCacheValid() {
  try {
    const configData = await fs.readFile(PRICE_CONFIG_FILE, 'utf8')
    const config = JSON.parse(configData)

    if (!config.enabled) return false

    const lastUpdate = new Date(config.lastUpdate)
    const now = new Date()
    const ttl = config.ttl || 3600000 // 預設 1 小時

    return (now - lastUpdate) < ttl
  } catch (error) {
    return false
  }
}

// 主要函數：取得交易行情資料
async function fetchPriceData(forceRefresh = false) {
  try {
    if (!forceRefresh) {
      const isValid = await isPriceCacheValid()
      if (isValid) {
        const cachedData = await loadPriceFromCache()
        if (cachedData) {
          console.log('📦 使用交易快取資料')
          return cachedData
        }
      }
    }

    const rawData = await fetchPriceDataFromMOA()
    const transformedData = transformPriceData(rawData)

    await savePriceToCache(transformedData)

    return transformedData
  } catch (error) {
    console.error('❌ 取得交易資料失敗:', error.message)

    const cachedData = await loadPriceFromCache()
    if (cachedData) {
      console.log('⚠️ API 失敗，使用交易快取資料')
      return cachedData
    }

    throw error
  }
}

// API 控制器：取得所有交易行情
export const getAllPrices = async (req, res, next) => {
  try {
    const { refresh, date, crop, market } = req.query

    console.log('💰 開始取得農產品交易行情資料...')

    let priceData = await fetchPriceData(refresh === 'true')

    // 篩選條件
    if (date) {
      priceData = priceData.filter(item => item.tradeDate === date)
    }

    if (crop) {
      const searchTerm = crop.toLowerCase()
      priceData = priceData.filter(item =>
        item.cropName.toLowerCase().includes(searchTerm) ||
        item.cropCode.toLowerCase().includes(searchTerm)
      )
    }

    if (market) {
      const searchTerm = market.toLowerCase()
      priceData = priceData.filter(item =>
        item.marketName.toLowerCase().includes(searchTerm) ||
        item.marketCode.toLowerCase().includes(searchTerm)
      )
    }

    console.log(`✅ 成功取得 ${priceData.length} 筆交易資料`)

    res.json({
      success: true,
      data: priceData,
      message: `成功取得 ${priceData.length} 筆農產品交易行情`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// API 控制器：根據作物查詢行情
export const getPricesByCrop = async (req, res, next) => {
  try {
    const { crop } = req.params
    const { refresh, date, market } = req.query

    if (!crop || crop.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的作物名稱'
      })
    }

    console.log(`🔍 查詢作物行情: ${crop}`)

    let priceData = await fetchPriceData(refresh === 'true')

    // 篩選作物
    const searchTerm = crop.toLowerCase()
    priceData = priceData.filter(item =>
      item.cropName.toLowerCase().includes(searchTerm) ||
      item.cropCode.toLowerCase().includes(searchTerm)
    )

    // 額外篩選條件
    if (date) {
      priceData = priceData.filter(item => item.tradeDate === date)
    }

    if (market) {
      const marketTerm = market.toLowerCase()
      priceData = priceData.filter(item =>
        item.marketName.toLowerCase().includes(marketTerm) ||
        item.marketCode.toLowerCase().includes(marketTerm)
      )
    }

    console.log(`✅ 篩選結果: ${priceData.length} 筆`)

    res.json({
      success: true,
      data: priceData,
      message: `找到 ${priceData.length} 筆 ${crop} 的交易行情`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// API 控制器：根據市場查詢行情
export const getPricesByMarket = async (req, res, next) => {
  try {
    const { market } = req.params
    const { refresh, date, crop } = req.query

    if (!market || market.trim() === '') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的市場名稱'
      })
    }

    console.log(`🏪 查詢市場行情: ${market}`)

    let priceData = await fetchPriceData(refresh === 'true')

    // 篩選市場
    const searchTerm = market.toLowerCase()
    priceData = priceData.filter(item =>
      item.marketName.toLowerCase().includes(searchTerm) ||
      item.marketCode.toLowerCase().includes(searchTerm)
    )

    // 額外篩選條件
    if (date) {
      priceData = priceData.filter(item => item.tradeDate === date)
    }

    if (crop) {
      const cropTerm = crop.toLowerCase()
      priceData = priceData.filter(item =>
        item.cropName.toLowerCase().includes(cropTerm) ||
        item.cropCode.toLowerCase().includes(cropTerm)
      )
    }

    console.log(`✅ 篩選結果: ${priceData.length} 筆`)

    res.json({
      success: true,
      data: priceData,
      message: `找到 ${priceData.length} 筆 ${market} 的交易行情`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// API 控制器：取得價格統計
export const getPriceStats = async (req, res, next) => {
  try {
    const { refresh } = req.query

    console.log('📊 計算價格統計資料...')

    const priceData = await fetchPriceData(refresh === 'true')

    // 計算統計資料
    const stats = {
      totalRecords: priceData.length,
      uniqueCrops: [...new Set(priceData.map(item => item.cropName))].length,
      uniqueMarkets: [...new Set(priceData.map(item => item.marketName))].length,
      tradeDate: priceData.length > 0 ? priceData[0].tradeDate : null,
      priceRanges: {
        highest: Math.max(...priceData.map(item => item.prices.high)),
        lowest: Math.min(...priceData.filter(item => item.prices.low > 0).map(item => item.prices.low)),
        averagePrice: (priceData.reduce((sum, item) => sum + item.prices.average, 0) / priceData.length).toFixed(2)
      },
      volumeStats: {
        totalVolume: priceData.reduce((sum, item) => sum + item.volume, 0).toFixed(2),
        averageVolume: (priceData.reduce((sum, item) => sum + item.volume, 0) / priceData.length).toFixed(2)
      }
    }

    console.log('✅ 統計資料計算完成')

    res.json({
      success: true,
      data: stats,
      message: '成功取得價格統計資料',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

// 快取管理 API
export const getPriceCacheStatus = async (req, res, next) => {
  try {
    const priceExists = await fs.access(PRICE_CACHE_FILE).then(() => true).catch(() => false)
    const configExists = await fs.access(PRICE_CONFIG_FILE).then(() => true).catch(() => false)

    if (!priceExists || !configExists) {
      return res.json({
        success: true,
        data: {
          exists: false,
          enabled: false,
          lastUpdate: null,
          ttl: null,
          recordCount: 0,
          message: '交易行情快取檔案不存在'
        },
        message: '快取狀態查詢成功'
      })
    }

    const configData = await fs.readFile(PRICE_CONFIG_FILE, 'utf8')
    const config = JSON.parse(configData)

    const priceDataRaw = await fs.readFile(PRICE_CACHE_FILE, 'utf8')
    const priceData = JSON.parse(priceDataRaw)

    const lastUpdate = new Date(config.lastUpdate)
    const now = new Date()
    const ageInMinutes = Math.floor((now - lastUpdate) / (1000 * 60))

    const status = {
      exists: true,
      enabled: config.enabled,
      lastUpdate: config.lastUpdate,
      ttl: config.ttl,
      recordCount: priceData.length,
      ageInMinutes: ageInMinutes,
      isValid: (now - lastUpdate) < config.ttl,
      message: `快取包含 ${priceData.length} 筆交易資料，${ageInMinutes} 分鐘前更新`
    }

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
export const clearPriceCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除交易行情快取...')

    await fs.mkdir(CACHE_DIR, { recursive: true })

    try {
      await fs.unlink(PRICE_CACHE_FILE)
      console.log('✅ 交易行情快取已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }

    try {
      await fs.unlink(PRICE_CONFIG_FILE)
      console.log('✅ 交易快取配置已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }

    console.log('🗑️ 所有交易快取已清除')

    res.json({
      success: true,
      message: '交易行情快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// 強制重新整理快取
export const refreshPriceCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理交易行情快取')
    const priceData = await fetchPriceData(true)

    res.json({
      success: true,
      data: priceData,
      message: `交易行情快取已重新整理，取得 ${priceData.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}