import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 教育資源 API URLs
const EDUCATION_APIS = {
  product: 'https://data.moa.gov.tw/Service/OpenData/MemberProductData.aspx?IsTransData=1&UnitId=173',
  aquaculture: 'https://data.moa.gov.tw/Service/OpenData/Tfrin.aspx?key=1200&IsTransData=1&UnitId=373',
  varieties: 'https://data.moa.gov.tw/Service/OpenData/Tarivariety.aspx?IsTransData=1&UnitId=356'
}

// 快取檔案路徑
const CACHE_DIR = path.join(__dirname, '../cache')
const EDUCATION_CACHE_DIR = path.join(CACHE_DIR, 'education')

// 為每個分類建立獨立的快取檔案路徑
function getCacheFilePath(category) {
  return path.join(EDUCATION_CACHE_DIR, `education-${category}.json`)
}

function getCacheConfigFilePath(category) {
  return path.join(EDUCATION_CACHE_DIR, `education-${category}-config.json`)
}


// 從農業部 API 取得原始資料
async function fetchRawDataFromMOA(category) {
  try {
    const apiUrl = EDUCATION_APIS[category]
    if (!apiUrl) {
      throw new Error(`不支援的分類: ${category}`)
    }

    console.log(`�� 正在從農業部 API 取得 ${category} 資料...`)
    const response = await axios.get(apiUrl, {
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024, // 限制回應大小 10MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    })
    
    if (!response.data) {
      throw new Error('API 回應格式不正確')
    }
    
    console.log(`✅ 成功從農業部 API 取得 ${category} 資料`)
    return response.data
  } catch (error) {
    console.error(`❌ 從農業部 API 取得 ${category} 資料失敗:`, error.message)
    throw new Error(`無法從農業部 API 取得 ${category} 資料: ${error.message}`)
  }
}

// 轉換原始資料格式
function transformEducationData(rawData, category) {
  if (!Array.isArray(rawData)) {
    if (rawData.data && Array.isArray(rawData.data)) {
      rawData = rawData.data
    } else {
      return [rawData]
    }
  }

  // 添加調試資訊來查看原始資料結構
  if (rawData && rawData.length > 0) {
    console.log(`🔍 ${category} 原始資料範例:`, JSON.stringify(rawData[0], null, 2))
    console.log(` ${category} 原始資料欄位:`, Object.keys(rawData[0]))
  }

  return rawData.map((item, index) => {
    const baseItem = {
      id: `${category}-${index}`,
      category: category
    }

    // 根據不同分類處理不同的欄位
    switch (category) {
      case 'product':
        return {
          ...baseItem,
          // 產品名稱
          crop: item.crop || item.產品名稱 || item.產品名 || '未命名產品',
          // 安全等級/驗證標章
          verify_marker: item.verify_marker || item.安全等級 || item.驗證標章 || '',
          // 月供貨量（公斤）
          yield: item.yield || item.月供貨量 || 0,
         // 產季（月份）
         season: (() => {
          const seasonValue = item.season || item.產季 || ''
          return seasonValue === '13' ? '全年' : seasonValue
        })(),
          // 最小出貨量（公斤）
          shipments_min: item.shipments_min || item.最小出貨量 || 0,
          
          // 連結到農民學院官方搜尋頁面
    url: `https://academy.moa.gov.tw/channel.php?theme=member_production&category=PT001&search=${encodeURIComponent(item.crop || item.產品名稱 || '')}`,
   
        }
      
      case 'aquaculture':
        return {
          ...baseItem,
          name: item.遊戲名稱 || item.名稱 || item.Name || item.name || item.GameName || item.gameName || '未命名',
          description: item.描述 || item.說明 || item.Description || item.description || '',
          gameType: item.遊戲類型 || item.類型 || item.GameType || item.gameType || '',
          coordinates: {
            longitude: parseFloat(item.經度 || item.Longitude || item.longitude) || 0,
            latitude: parseFloat(item.緯度 || item.Latitude || item.latitude) || 0
          }
        }
      
      case 'varieties':
        return {
          ...baseItem,
          name: item.品種名稱 || item.品種名 || item.Name || item.name || item.VarietyName || item.varietyName || item.CropType || item.cropType || '未命名品種',
          varietyName: item.品種名稱 || item.VarietyName || item.varietyName || '',
          cropType: item.作物類型 || item.作物種類 || item.CropType || item.cropType || '',
          description: item.品種特性 || item.描述 || item.Description || item.description || '',
          coordinates: {
            longitude: parseFloat(item.經度 || item.Longitude || item.longitude) || 0,
            latitude: parseFloat(item.緯度 || item.Latitude || item.latitude) || 0
          }
        }
      
      default:
        return {
          ...baseItem,
          ...item
        }
    }
  })
}

// 儲存資料到快取檔案
async function saveToCache(category, data) {
  try {
    // 確保教育資源快取目錄存在
    await fs.mkdir(EDUCATION_CACHE_DIR, { recursive: true })
    
    const cacheFile = getCacheFilePath(category)
    const configFile = getCacheConfigFilePath(category)
    
    // 儲存分類資料到獨立檔案
    const jsonData = JSON.stringify(data, null, 2)
    if (jsonData.length > 20 * 1024 * 1024) {
      throw new Error('Cache data too large')
    }
    await fs.writeFile(cacheFile, jsonData, 'utf8')

    // 更新該分類的快取配置
    const cacheConfig = {
      enabled: true,
      ttl: 3600000, // 1 小時
      maxRetries: 3,
      lastUpdate: new Date().toISOString(),
      category: category,
      dataCount: data.length
    }
    await fs.writeFile(configFile, JSON.stringify(cacheConfig, null, 2), 'utf8')
    
    console.log(`💾 ${category} 資料已儲存到獨立快取檔案: education/education-${category}.json`)
  } catch (error) {
    console.error(`❌ 儲存 ${category} 快取檔案失敗:`, error.message)
    throw error
  }
}

// 從快取檔案讀取資料
async function loadFromCache(category) {
  try {
    const cacheFile = getCacheFilePath(category)
    const data = await fs.readFile(cacheFile, 'utf8')
    const cacheData = JSON.parse(data)
    return cacheData
  } catch (error) {
    console.log(`⚠️ 無法讀取 ${category} 快取檔案，將從 API 取得資料`)
    return null
  }
}

// 檢查快取是否有效
async function isCacheValid(category) {
  try {
    const configFile = getCacheConfigFilePath(category)
    const configData = await fs.readFile(configFile, 'utf8')
    const config = JSON.parse(configData)
    
    if (!config.enabled) return false
    
    const lastUpdate = new Date(config.lastUpdate)
    const now = new Date()
    const ttl = config.ttl || 3600000 // 1 小時
    
    return (now - lastUpdate) < ttl
  } catch (error) {
    return false
  }
}


// 從農業部取得教育資源資料（主要函數）
async function fetchEducationDataFromMOA(category, forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      const cachedData = await loadFromCache(category)
      if (cachedData) {
        console.log(`📦 使用 ${category} 快取資料`)
        return cachedData
      }
    }
    
    // 如果沒有快取資料或強制重新整理，嘗試從 API 取得
    console.log(`🌐 嘗試從農業部 API 取得 ${category} 資料...`)
    try {
      const rawData = await fetchRawDataFromMOA(category)
      const transformedData = transformEducationData(rawData, category)
      
      // 儲存到快取
      await saveToCache(category, transformedData)
      
      console.log(`✅ 成功從 API 取得並快取 ${category} 資料`)
      return transformedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用任何可用的快取資料（即使過期）
      const cachedData = await loadFromCache(category)
      if (cachedData) {
        console.log(`📦 API 失敗，使用 ${category} 快取資料作為備案`)
        return cachedData
      }
      
      // 如果連快取都沒有，拋出錯誤
      throw new Error(`無法取得 ${category} 資料：API 不可用且無快取資料`)
    }
  } catch (error) {
    console.error(`❌ 取得 ${category} 資料完全失敗:`, error.message)
    throw error
  }
}


// 取得教育資源資料
export const getEducationData = async (req, res, next) => {
  try {
    const { category } = req.params
    const { refresh } = req.query
    
    if (!category || !EDUCATION_APIS[category]) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的分類名稱'
      })
    }
    
    console.log(`📚 開始取得 ${category} 教育資源資料...`)
    
    const data = await fetchEducationDataFromMOA(category, refresh === 'true')
    
    console.log(`✅ 成功取得 ${data.length} 筆 ${category} 資料`)
    
    res.json({
      success: true,
      data: data,
      message: `成功取得 ${data.length} 筆 ${category} 教育資源資料`,
      timestamp: new Date().toISOString(),
      cached: refresh !== 'true'
    })
  } catch (error) {
    next(error)
  }
}

// 取得所有教育資源分類
// export const getEducationCategories = async (req, res, next) => {
//   try {
//     const categories = [
//       {
//         id: 'product',
//         name: '農民學院找產品',
//         icon: '🌾',
//         description: '農民產品與農產資訊'
//       },
//       {
//         id: 'aquaculture',
//         name: '水產知識淺說',
//         icon: '🐠',
//         description: '水產知識小遊戲'
//       },
//       {
//         id: 'varieties',
//         name: '農業試驗所品種介紹',
//         icon: '🌱',
//         description: '農作品種介紹與資訊'
//       }
//     ]
    
//     res.json({
//       success: true,
//       data: categories,
//       message: '成功取得教育資源分類'
//     })
//   } catch (error) {
//     next(error)
//   }
// }

// 清除教育資源快取
export const clearEducationCache = async (req, res, next) => {
  try {
    const { category } = req.params
    
    console.log(`��️ 正在清除教育資源快取${category ? ` (${category})` : ''}...`)
    
    // 確保快取目錄存在
    await fs.mkdir(EDUCATION_CACHE_DIR, { recursive: true })
    
    if (category) {
      // 清除特定分類的快取
      const cacheFile = getCacheFilePath(category)
      const configFile = getCacheConfigFilePath(category)
      
      try {
        await fs.unlink(cacheFile)
        console.log(`✅ ${category} 資料快取已清除`)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
      
      try {
        await fs.unlink(configFile)
        console.log(`✅ ${category} 快取配置已清除`)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
    } else {
      // 清除所有分類的快取
      for (const cat of Object.keys(EDUCATION_APIS)) {
        const cacheFile = getCacheFilePath(cat)
        const configFile = getCacheConfigFilePath(cat)
        
        try {
          await fs.unlink(cacheFile)
          console.log(`✅ ${cat} 資料快取已清除`)
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error
          }
        }
        
        try {
          await fs.unlink(configFile)
          console.log(`✅ ${cat} 快取配置已清除`)
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error
          }
        }
      }
    }
    
    console.log(`��️ 教育資源快取清除完成`)
    
    res.json({
      success: true,
      message: `教育資源快取已清除${category ? ` (${category})` : ''}`
    })
  } catch (error) {
    next(error)
  }
}

// 強制重新整理教育資源快取
export const refreshEducationCache = async (req, res, next) => {
  try {
    const { category } = req.params
    
    if (category && !EDUCATION_APIS[category]) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的分類名稱'
      })
    }
    
    console.log(`🔄 強制重新整理教育資源快取${category ? ` (${category})` : ''}`)
    
    if (category) {
      // 重新整理特定分類
      const data = await fetchEducationDataFromMOA(category, true)
      res.json({
        success: true,
        data: data,
        message: `${category} 快取已重新整理，取得 ${data.length} 筆資料`,
        timestamp: new Date().toISOString()
      })
    } else {
      // 重新整理所有分類
      const results = {}
      const errors = {}
      
      for (const cat of Object.keys(EDUCATION_APIS)) {
        try {
          results[cat] = await fetchEducationDataFromMOA(cat, true)
        } catch (error) {
          errors[cat] = error.message
        }
      }
      
      res.json({
        success: Object.keys(errors).length === 0,
        data: results,
        errors: errors,
        message: Object.keys(errors).length === 0 ? '所有教育資源快取已重新整理' : '部分教育資源快取重新整理失敗',
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    next(error)
  }
}
