import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 水產 API 配置
const AQUACULTURE_API_URL = 'https://data.moa.gov.tw/Service/OpenData/Tfrin.aspx?key=1200&IsTransData=1&UnitId=373'
const CACHE_DIR = path.join(__dirname, '../../cache/education')
const CACHE_FILE = path.join(CACHE_DIR, 'aquaculture.json')
const CACHE_CONFIG_FILE = path.join(CACHE_DIR, 'aquaculture-config.json')

// 從農業部 API 取得水產原始資料
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

// 轉換水產資料格式
function transformAquacultureData(rawData) {
  if (!Array.isArray(rawData)) {
    if (rawData.data && Array.isArray(rawData.data)) {
      rawData = rawData.data
    } else {
      return [rawData]
    }
  }

  return rawData.map((item, index) => ({
    id: `aquaculture-${index}`,
    category: 'aquaculture',
    title: item.遊戲名稱 || item.名稱 || item.title || item.title || item.title || item.title || '未命名',
    description: item.描述 || item.說明 || item.Description || item.description || '',
    link: item.遊戲類型 || item.類型 || item.link || item.link || '',
    pubDate: item.遊戲類型 || item.類型 || item.pubDate || item.pubDate || '',

    coordinates: {
      longitude: parseFloat(item.經度 || item.Longitude || item.longitude) || 0,
      latitude: parseFloat(item.緯度 || item.Latitude || item.latitude) || 0
    }
  }))
}

// 儲存水產資料到快取
async function saveAquacultureToCache(data) {
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
    
    console.log('�� 水產資料已儲存到快取檔案')
  } catch (error) {
    console.error('❌ 儲存水產快取檔案失敗:', error.message)
    throw error
  }
}

// 從快取讀取水產資料
async function loadAquacultureFromCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.log('⚠️ 無法讀取水產快取檔案')
    return null
  }
}

// 檢查水產快取是否有效
async function isAquacultureCacheValid() {
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

// 取得水產資料（主要函數）
async function fetchAquacultureData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      const cachedData = await loadAquacultureFromCache()
      if (cachedData) {
        console.log('📦 使用水產快取資料')
        return cachedData
      }
    }
    
    // 從 API 取得資料
    console.log('�� 嘗試從農業部 API 取得水產資料...')
    try {
      const rawData = await fetchRawAquacultureData()
      const transformedData = transformAquacultureData(rawData)
      
      await saveAquacultureToCache(transformedData)
      
      console.log('✅ 成功從 API 取得並快取水產資料')
      return transformedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      const cachedData = await loadAquacultureFromCache()
      if (cachedData) {
        console.log('📦 API 失敗，使用水產快取資料作為備案')
        return cachedData
      }
      
      throw new Error('無法取得水產資料：API 不可用且無快取資料')
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
    const { refresh } = req.query
    
    console.log('🐟 開始取得水產資料...')
    
    const data = await fetchAquacultureData(refresh === 'true')
    
    console.log(`✅ 成功取得 ${data.length} 筆水產資料`)
    
    res.json({
      success: true,
      data: data,
      message: `成功取得 ${data.length} 筆水產資料`,
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
    
    const allAquaculture = await fetchAquacultureData()
    const item = allAquaculture.find(a => a.id === id)
    
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

// DELETE /api/education/aquaculture/cache - 清除水產快取
export const clearAquacultureCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除水產快取...')
    
    await fs.mkdir(CACHE_DIR, { recursive: true })
    
    try {
      await fs.unlink(CACHE_FILE)
      console.log('✅ 水產資料快取已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
    try {
      await fs.unlink(CACHE_CONFIG_FILE)
      console.log('✅ 水產快取配置已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
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
    const isValid = await isAquacultureCacheValid()
    const cachedData = await loadAquacultureFromCache()
    
    res.json({
      success: true,
      data: {
        isValid,
        hasCache: !!cachedData,
        dataCount: cachedData ? cachedData.length : 0,
        lastUpdate: cachedData ? (await fs.readFile(CACHE_CONFIG_FILE, 'utf8').then(data => JSON.parse(data).lastUpdate)) : null
      },
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