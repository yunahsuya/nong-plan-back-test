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
      timeout: 60000, // 增加到60秒
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
    // id: `${item['交易日期']}-${item['作物代號']}-${item['市場代號']}`,
    tradeDate: item['交易日期'],
    // categoryCode: item['種類代碼'],
    // cropCode: item['作物代號'],
    cropName: item['作物名稱'],
    // marketCode: item['市場代號'],
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

// 智能篩選熱門作物並顯示休市狀態
// function smartFilterWithRestStatus(rawData) {
//   // 1. 分離休市記錄和正常記錄
//   const restRecords = rawData.filter(item => item['作物名稱'] === '休市')
//   const normalRecords = rawData.filter(item => item['作物名稱'] !== '休市')
  
//   // 2. 找出熱門作物 (基於歷史平均交易量)
//   const cropGroups = {}
//   normalRecords.forEach(item => {
//     const crop = item['作物名稱']
//     if (!cropGroups[crop]) {
//       cropGroups[crop] = []
//     }
//     cropGroups[crop].push(parseFloat(item['交易量']) || 0)
//   })
  
//   const cropAverages = {}
//   Object.keys(cropGroups).forEach(crop => {
//     const volumes = cropGroups[crop]
//     const average = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
//     cropAverages[crop] = average
//   })
  
//   // 3. 定義熱門作物 (平均交易量 > 100公斤)
//   const popularCrops = Object.keys(cropAverages)
//     .filter(crop => cropAverages[crop] > 100)
  
//   // 4. 找出所有市場和今天休市的市場
//   const allMarkets = [...new Set(rawData.map(item => ({
//     marketCode: item['市場代號'],
//     marketName: item['市場名稱']
//   })))]
  
//   const restMarkets = restRecords.map(item => ({
//     marketCode: item['市場代號'],
//     marketName: item['市場名稱']
//   }))
  
//   // 5. 為每個熱門作物生成完整記錄
//   const result = []
//   const today = rawData[0]['交易日期'] // 假設是同一天
  
//   popularCrops.forEach(crop => {
//     allMarkets.forEach(market => {
//       // 檢查該作物今天在這個市場是否有交易記錄
//       const todayRecord = rawData.find(item => 
//         item['作物名稱'] === crop &&
//         item['市場代號'] === market.marketCode &&
//         item['交易日期'] === today &&
//         item['作物名稱'] !== '休市'
//       )
      
//       if (todayRecord) {
//         // 有交易記錄，正常顯示
//         result.push({
//           id: `${today}-${todayRecord['作物代號']}-${market.marketCode}`,
//           tradeDate: today,
//           categoryCode: todayRecord['種類代碼'],
//           cropCode: todayRecord['作物代號'],
//           cropName: crop,
//           marketCode: market.marketCode,
//           marketName: market.marketName,
//           prices: {
//             high: parseFloat(todayRecord['上價']) || 0,
//             middle: parseFloat(todayRecord['中價']) || 0,
//             low: parseFloat(todayRecord['下價']) || 0,
//             average: parseFloat(todayRecord['平均價']) || 0
//           },
//           volume: parseFloat(todayRecord['交易量']) || 0,
//           priceRange: (parseFloat(todayRecord['上價']) || 0) - (parseFloat(todayRecord['下價']) || 0),
//           totalValue: (parseFloat(todayRecord['平均價']) || 0) * (parseFloat(todayRecord['交易量']) || 0),
//           status: '正常交易',
//           isRest: false
//         })
//       } else {
//         // 沒有交易記錄，檢查是否為休市
//         const isMarketRest = restMarkets.some(rest => 
//           rest.marketCode === market.marketCode
//         )
        
//         if (isMarketRest) {
//           // 市場休市
//           result.push({
//             id: `${today}-${crop}-${market.marketCode}-rest`,
//             tradeDate: today,
//             categoryCode: 'N00',
//             cropCode: 'rest',
//             cropName: crop,
//             marketCode: market.marketCode,
//             marketName: market.marketName,
//             prices: { high: 0, middle: 0, low: 0, average: 0 },
//             volume: 0,
//             priceRange: 0,
//             totalValue: 0,
//             status: '市場休市',
//             isRest: true
//           })
//         } else {
//           // 市場正常，但該作物沒交易
//           result.push({
//             id: `${today}-${crop}-${market.marketCode}-no-trade`,
//             tradeDate: today,
//             categoryCode: 'N00',
//             cropCode: 'no-trade',
//             cropName: crop,
//             marketCode: market.marketCode,
//             marketName: market.marketName,
//             prices: { high: 0, middle: 0, low: 0, average: 0 },
//             volume: 0,
//             priceRange: 0,
//             totalValue: 0,
//             status: '無交易',
//             isRest: false
//           })
//         }
//       }
//     })
//   })
  
//   return {
//     data: result,
//     stats: {
//       totalRecords: rawData.length,
//       normalRecords: normalRecords.length,
//       restRecords: restRecords.length,
//       popularCrops: popularCrops.length,
//       filteredRecords: result.length,
//       restMarkets: restMarkets.length
//     }
//   }
// }

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
          console.log('�� 使用交易快取資料')
          return cachedData
        }
      }
    }

    const rawData = await fetchPriceDataFromMOA()
    const transformedData = transformPriceData(rawData)
    
    // 在儲存快取前進行篩選
    const filteredResult = smartFilterWithRestStatus(transformedData)
    const filteredData = filteredResult.data
    
    console.log(`�� 原始資料: ${transformedData.length} 筆`)
    console.log(`📊 篩選後: ${filteredData.length} 筆`)
    console.log(`📊 減少: ${Math.round((1 - filteredData.length / transformedData.length) * 100)}%`)

    await savePriceToCache(filteredData)

    return filteredData
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

// 新的前端專用 API：取得農產品分類彙整
export const getCropCategories = async (req, res, next) => {
  try {
    console.log('🌾 取得農產品分類彙整')

    const priceData = await fetchPriceData()
    // 注意：現在 priceData 已經是篩選後的資料，不需要再次篩選

    // 按作物分組並計算統計
    const cropGroups = {}

    priceData.forEach(item => {
      const cropName = item.cropName

      if (!cropGroups[cropName]) {
        cropGroups[cropName] = {
          name: cropName,
          records: [],
          markets: new Set(),
          totalVolume: 0,
          totalValue: 0
        }
      }

      cropGroups[cropName].records.push(item)
      cropGroups[cropName].markets.add(item.marketName)
      cropGroups[cropName].totalVolume += item.volume
      cropGroups[cropName].totalValue += item.totalValue
    })

    // 轉換為前端需要的格式
    const categories = Object.values(cropGroups).map(group => {
      const prices = group.records.map(r => r.prices.average).filter(p => p > 0)
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

      return {
        name: group.name,
        marketCount: group.markets.size,
        avgPrice: Math.round(avgPrice * 100) / 100,
        priceRange: {
          min: Math.round(minPrice * 100) / 100,
          max: Math.round(maxPrice * 100) / 100
        },
        totalVolume: Math.round(group.totalVolume * 100) / 100,
        lastUpdated: new Date().toISOString()
      }
    }).sort((a, b) => b.totalVolume - a.totalVolume) // 按交易量排序

    res.json({
      status: 'success',
      data: {
        categories,
        summary: {
          totalCategories: categories.length,
          totalMarkets: [...new Set(priceData.map(item => item.marketName))].length,
          lastUpdated: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    next(error)
  }
}

// 新的前端專用 API：取得特定作物的各地價格
export const getCropLocationPrices = async (req, res, next) => {
  try {
    const { crop, market, sort } = req.query

    if (!crop) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: '請提供作物名稱參數 crop'
      })
    }

    console.log(`🔍 取得 ${crop} 的各地價格`)

    const priceData = await fetchPriceData()
    // 注意：現在 priceData 已經是篩選後的資料，不需要再次篩選

    // 篩選作物
    let filteredData = priceData.filter(item =>
      item.cropName.toLowerCase().includes(crop.toLowerCase())
    )

    // 篩選市場（如果提供）
    if (market) {
      filteredData = filteredData.filter(item =>
        item.marketName.toLowerCase().includes(market.toLowerCase()) ||
        item.marketCode.toLowerCase().includes(market.toLowerCase())
      )
    }

    // 轉換為前端需要的格式
    const locations = filteredData.map(item => ({
      id: item.id,
      market: {
        code: item.marketCode,
        name: item.marketName
      },
      variant: item.cropName,
      prices: item.prices,
      volume: item.volume,
      totalValue: item.totalValue,
      priceRange: item.priceRange,
      lastUpdated: new Date().toISOString()
    }))

    // 排序
    if (sort === 'price_desc') {
      locations.sort((a, b) => b.prices.average - a.prices.average)
    } else if (sort === 'price_asc') {
      locations.sort((a, b) => a.prices.average - b.prices.average)
    } else if (sort === 'volume_desc') {
      locations.sort((a, b) => b.volume - a.volume)
    }

    // 計算統計
    const validPrices = locations.filter(l => l.prices.average > 0)
    const statistics = validPrices.length > 0 ? {
      maxPrice: Math.max(...validPrices.map(l => l.prices.average)),
      maxPriceMarket: validPrices.find(l => l.prices.average === Math.max(...validPrices.map(p => p.prices.average)))?.market.name,
      minPrice: Math.min(...validPrices.map(l => l.prices.average)),
      minPriceMarket: validPrices.find(l => l.prices.average === Math.min(...validPrices.map(p => p.prices.average)))?.market.name,
      avgPrice: validPrices.reduce((sum, l) => sum + l.prices.average, 0) / validPrices.length,
      totalVolume: locations.reduce((sum, l) => sum + l.volume, 0),
      totalValue: locations.reduce((sum, l) => sum + l.totalValue, 0)
    } : null

    res.json({
      status: 'success',
      data: {
        cropName: crop,
        locations,
        statistics,
        pagination: {
          total: locations.length,
          page: 1,
          limit: locations.length
        }
      }
    })
  } catch (error) {
    next(error)
  }
}

// 智能篩選熱門作物並顯示休市狀態
function smartFilterWithRestStatus(rawData) {
  console.log(`📊 原始資料: ${rawData.length} 筆`)
  
  // 直接篩選：移除不需要的記錄
  const filtered = rawData.filter(item => {
    // 1. 移除休市記錄
    if (item.cropName === '休市') {
      return false
    }
    
    // 2. 移除交易量為0的記錄
    if (item.volume === 0) {
      return false
    }
    
    // 3. 移除交易量過小的記錄
    if (item.volume < 1000) {
      return false
    }
    
    // 4. 移除價格異常的記錄
    if (item.prices.average <= 0) {
      return false
    }
    
    // 5. 移除"其他"分類
    if (item.cropName.includes('其他')) {
      return false
    }
    
    // 6. 移除"改良種"分類
    if (item.cropName.includes('改良種')) {
      return false
    }
    
    return true
  })
  
  console.log(`📊 篩選後: ${filtered.length} 筆`)
  console.log(`📊 減少: ${Math.round((1 - filtered.length / rawData.length) * 100)}%`)
  
  return {
    data: filtered,
    stats: {
      totalRecords: rawData.length,
      filteredRecords: filtered.length,
      reductionRate: Math.round((1 - filtered.length / rawData.length) * 100)
    }
  }
}

// 新的API：取得熱門作物狀態（包含休市資訊）
export const getPopularCropsWithStatus = async (req, res, next) => {
  try {
    const { refresh } = req.query

    console.log('🌾 取得熱門作物狀態...')

    // 修正：使用 fetchPriceData 而不是 fetchPriceDataFromMOA
    const priceData = await fetchPriceData(refresh === 'true')
    const result = smartFilterWithRestStatus(priceData)

    console.log(`✅ 成功處理 ${result.stats.filteredRecords} 筆熱門作物記錄`)

    res.json({
      success: true,
      data: result.data,
      stats: result.stats,
      message: `成功取得 ${result.stats.popularCrops} 種熱門作物狀態`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// 新的API：取得熱門作物清單
export const getPopularCropsList = async (req, res, next) => {
  try {
    const { refresh } = req.query

    console.log('📋 取得熱門作物清單...')

    const priceData = await fetchPriceData(refresh === 'true')
    const normalRecords = priceData.filter(item => item.cropName !== '休市')
    
    // 計算作物平均交易量
    const cropGroups = {}
    normalRecords.forEach(item => {
      const crop = item.cropName
      if (!cropGroups[crop]) {
        cropGroups[crop] = []
      }
      cropGroups[crop].push(item.volume || 0)
    })
    
    const cropAverages = Object.keys(cropGroups).map(crop => {
      const volumes = cropGroups[crop]
      const average = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
      return {
        name: crop,
        averageVolume: Math.round(average * 100) / 100,
        recordCount: volumes.length,
        isPopular: average > 100
      }
    }).sort((a, b) => b.averageVolume - a.averageVolume)

    const popularCrops = cropAverages.filter(crop => crop.isPopular)
    const otherCrops = cropAverages.filter(crop => !crop.isPopular)

    console.log(`📊 熱門作物: ${popularCrops.length} 種`)
    console.log(`�� 其他作物: ${otherCrops.length} 種`)

    res.json({
      success: true,
      data: {
        popularCrops,
        otherCrops,
        summary: {
          totalCrops: cropAverages.length,
          popularCount: popularCrops.length,
          otherCount: otherCrops.length
        }
      },
      message: `找到 ${popularCrops.length} 種熱門作物`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}
