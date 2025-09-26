import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 品種 API 配置
const VARIETIES_API_URL = 'https://data.moa.gov.tw/Service/OpenData/Tarivariety.aspx?IsTransData=1&UnitId=356'
// 路徑
const CACHE_DIR = path.join(__dirname, '../../cache/education')
const CACHE_FILE = path.join(CACHE_DIR, 'varieties.json')
const CACHE_CONFIG_FILE = path.join(CACHE_DIR, 'varieties-config.json')

// 從農業部 API 取得品種原始資料
async function fetchRawVarietiesData() {
  try {
    console.log('🌱 正在從農業部 API 取得品種資料...')
    const response = await axios.get(VARIETIES_API_URL, {
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
    
    console.log('✅ 成功從農業部 API 取得品種資料')
    return response.data
  } catch (error) {
    console.error('❌ 從農業部 API 取得品種資料失敗:', error.message)
    throw new Error(`無法從農業部 API 取得品種資料: ${error.message}`)
  }
}

// 轉換品種資料格式
function transformVarietiesData(rawData) {
  if (!Array.isArray(rawData)) {
    if (rawData.data && Array.isArray(rawData.data)) {
      rawData = rawData.data
    } else {
      return [rawData]
    }
  }

  return rawData.map((item, index) => ({
    id: `varieties-${index}`,
    category: 'varieties',
    title: item.title || item.品種名稱 || item.品種名 || '未命名品種',
    link: item.link || item.Link || '',
    pubDate: item.pubDate || item.作物類型 || item.作物種類 || '',
    description: item.description || item.品種特性 || item.描述 || item.Description || ''
  }))
}

// 儲存品種資料到快取
async function saveVarietiesToCache(data) {
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
    
    console.log('�� 品種資料已儲存到快取檔案')
  } catch (error) {
    console.error('❌ 儲存品種快取檔案失敗:', error.message)
    throw error
  }
}

// 從快取讀取品種資料
async function loadVarietiesFromCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.log('⚠️ 無法讀取品種快取檔案')
    return null
  }
}

// 檢查品種快取是否有效
async function isVarietiesCacheValid() {
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

// 取得品種資料（主要函數）
async function fetchVarietiesData(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      const cachedData = await loadVarietiesFromCache()
      if (cachedData) {
        console.log('📦 使用品種快取資料')
        return cachedData
      }
    }
    
    // 從 API 取得資料
    console.log('�� 嘗試從農業部 API 取得品種資料...')
    try {
      const rawData = await fetchRawVarietiesData()
      const transformedData = transformVarietiesData(rawData)
      
      await saveVarietiesToCache(transformedData)
      
      console.log('✅ 成功從 API 取得並快取品種資料')
      return transformedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      const cachedData = await loadVarietiesFromCache()
      if (cachedData) {
        console.log('📦 API 失敗，使用品種快取資料作為備案')
        return cachedData
      }
      
      throw new Error('無法取得品種資料：API 不可用且無快取資料')
    }
  } catch (error) {
    console.error('❌ 取得品種資料完全失敗:', error.message)
    throw error
  }
}

// ==================== API 端點 ====================

// GET /api/education/varieties - 取得品種資料
export const getVarieties = async (req, res, next) => {
  try {
    const { refresh } = req.query
    
    console.log('�� 開始取得品種資料...')
    
    const data = await fetchVarietiesData(refresh === 'true')
    
    console.log(`✅ 成功取得 ${data.length} 筆品種資料`)
    
    res.json({
      success: true,
      data: data,
      message: `成功取得 ${data.length} 筆品種資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/varieties/:id - 取得單一品種資料
export const getVarietyById = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const allVarieties = await fetchVarietiesData()
    const variety = allVarieties.find(v => v.id === id)
    
    if (!variety) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到指定的品種'
      })
    }
    
    res.json({
      success: true,
      data: variety,
      message: '成功取得品種資料'
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/education/varieties/cache - 清除品種快取
export const clearVarietiesCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除品種快取...')
    
    await fs.mkdir(CACHE_DIR, { recursive: true })
    
    try {
      await fs.unlink(CACHE_FILE)
      console.log('✅ 品種資料快取已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
    try {
      await fs.unlink(CACHE_CONFIG_FILE)
      console.log('✅ 品種快取配置已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
    res.json({
      success: true,
      message: '品種快取已清除'
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/education/varieties/cache/refresh - 重新整理品種快取
export const refreshVarietiesCache = async (req, res, next) => {
  try {
    console.log('🔄 強制重新整理品種快取')
    
    const data = await fetchVarietiesData(true)
    res.json({
      success: true,
      data: data,
      message: `品種快取已重新整理，取得 ${data.length} 筆資料`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/education/varieties/cache/status - 取得品種快取狀態
export const getVarietiesCacheStatus = async (req, res, next) => {
  try {
    const isValid = await isVarietiesCacheValid()
    const cachedData = await loadVarietiesFromCache()
    
    res.json({
      success: true,
      data: {
        isValid,
        hasCache: !!cachedData,
        dataCount: cachedData ? cachedData.length : 0,
        lastUpdate: cachedData ? (await fs.readFile(CACHE_CONFIG_FILE, 'utf8').then(data => JSON.parse(data).lastUpdate)) : null
      },
      message: '成功取得品種快取狀態'
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