import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 產品 API 配置
const PRODUCT_API_URL = 'https://data.moa.gov.tw/Service/OpenData/MemberProductData.aspx?IsTransData=1&UnitId=173'
const CACHE_DIR = path.join(__dirname, '../../cache/education')
const CACHE_FILE = path.join(CACHE_DIR, 'product.json')
const CACHE_CONFIG_FILE = path.join(CACHE_DIR, 'product-config.json')

// 從農業部 API 取得產品原始資料
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

// 轉換產品資料格式
function transformProductData(rawData) {
  if (!Array.isArray(rawData)) {
    if (rawData.data && Array.isArray(rawData.data)) {
      rawData = rawData.data
    } else {
      return [rawData]
    }
  }

  return rawData.map((item, index) => ({
    id: `product-${index}`,
    category: 'product',
    crop: item.crop || item.產品名稱 || item.產品名 || '未命名產品',
    verify_marker: item.verify_marker || item.安全等級 || item.驗證標章 || '',
    yield: item.yield || item.月供貨量 || 0,
    season: (() => {
      const seasonValue = item.season || item.產季 || ''
      return seasonValue === '13' ? '全年' : seasonValue
    })(),
    shipments_min: item.shipments_min || item.最小出貨量 || 0,
    url: `https://academy.moa.gov.tw/channel.php?theme=member_production&category=PT001&search=${encodeURIComponent(item.crop || item.產品名稱 || '')}`,
  }))
}

// 儲存產品資料到快取
async function saveProductToCache(data) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    
    const jsonData = JSON.stringify(data, null, 2)
    if (jsonData.length > 20 * 1024 * 1024) {
      throw new Error('Cache data too large')
    }
    await fs.writeFile(CACHE_FILE, jsonData, 'utf8')

    const cacheConfig = {
      enabled: true,
      ttl: 3600000, // 1 小時
      lastUpdate: new Date().toISOString(),
      dataCount: data.length
    }
    await fs.writeFile(CACHE_CONFIG_FILE, JSON.stringify(cacheConfig, null, 2), 'utf8')
    
    console.log('�� 產品資料已儲存到快取檔案')
  } catch (error) {
    console.error('❌ 儲存產品快取檔案失敗:', error.message)
    throw error
  }
}

// 從快取讀取產品資料
async function loadProductFromCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.log('⚠️ 無法讀取產品快取檔案')
    return null
  }
}

// 檢查產品快取是否有效
async function isProductCacheValid() {
  try {
    const configData = await fs.readFile(CACHE_CONFIG_FILE, 'utf8')
    const config = JSON.parse(configData)
    
    if (!config.enabled) return false
    
    const lastUpdate = new Date(config.lastUpdate)
    const now = new Date()
    const ttl = config.ttl || 3600000
    
    return (now - lastUpdate) < ttl
  } catch (error) {
    return false
  }
}

// 取得產品資料（主要函數）
async function fetchProductData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      const cachedData = await loadProductFromCache()
      if (cachedData) {
        console.log('📦 使用產品快取資料')
        return cachedData
      }
    }
    
    // 從 API 取得資料
    console.log('�� 嘗試從農業部 API 取得產品資料...')
    try {
      const rawData = await fetchRawProductData()
      const transformedData = transformProductData(rawData)
      
      await saveProductToCache(transformedData)
      
      console.log('✅ 成功從 API 取得並快取產品資料')
      return transformedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      const cachedData = await loadProductFromCache()
      if (cachedData) {
        console.log('📦 API 失敗，使用產品快取資料作為備案')
        return cachedData
      }
      
      throw new Error('無法取得產品資料：API 不可用且無快取資料')
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
    const { refresh } = req.query
    
    console.log('🌾 開始取得產品資料...')
    
    const data = await fetchProductData(refresh === 'true')
    
    console.log(`✅ 成功取得 ${data.length} 筆產品資料`)
    
    res.json({
      success: true,
      data: data,
      message: `成功取得 ${data.length} 筆產品資料`,
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
    
    const allProducts = await fetchProductData()
    const product = allProducts.find(p => p.id === id)
    
    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到指定的產品'
      })
    }
    
    res.json({
      success: true,
      data: product,
      message: '成功取得產品資料'
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/education/product/cache - 清除產品快取
export const clearProductCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除產品快取...')
    
    await fs.mkdir(CACHE_DIR, { recursive: true })
    
    try {
      await fs.unlink(CACHE_FILE)
      console.log('✅ 產品資料快取已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
    try {
      await fs.unlink(CACHE_CONFIG_FILE)
      console.log('✅ 產品快取配置已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
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
    const isValid = await isProductCacheValid()
    const cachedData = await loadProductFromCache()
    
    res.json({
      success: true,
      data: {
        isValid,
        hasCache: !!cachedData,
        dataCount: cachedData ? cachedData.length : 0,
        lastUpdate: cachedData ? (await fs.readFile(CACHE_CONFIG_FILE, 'utf8').then(data => JSON.parse(data).lastUpdate)) : null
      },
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