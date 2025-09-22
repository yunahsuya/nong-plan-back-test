import { StatusCodes } from 'http-status-codes'
import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 農委會無障礙農場 API URL
const MOA_API_URL = 'https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvAccessibleFarm.aspx?IsTransData=1&UnitId=241'

// 快取檔案路徑
const CACHE_DIR = path.join(__dirname, '../cache')
const FARMS_CACHE_FILE = path.join(CACHE_DIR, 'farms.json')
const CACHE_CONFIG_FILE = path.join(CACHE_DIR, 'cache-config.json')

// 縣市代碼對應表
const COUNTY_MAP = {
  '10001': '基隆市',
  '10002': '宜蘭縣',
  '10003': '新北市',
  '10004': '新竹縣',
  '10005': '苗栗縣',
  '10006': '新竹市',
  '10007': '彰化縣',
  '10008': '南投縣',
  '10009': '雲林縣',
  '10010': '嘉義縣',
  '10011': '嘉義市',
  '10012': '台南市',
  '10013': '高雄市',
  '10014': '台東縣',
  '10015': '花蓮縣',
  '10016': '屏東縣',
  '10017': '澎湖縣',
  '10018': '金門縣',
  '10019': '連江縣',
  '64000': '高雄市',
  '66000': '台中市',
  '67000': '台南市'
}

// 從農委會 API 取得原始資料
async function fetchRawDataFromMOA() {
  try {
    console.log('🌐 正在從農委會 API 取得資料...')
    const response = await axios.get(MOA_API_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('API 回應格式不正確')
    }
    
    console.log(`✅ 成功從農委會 API 取得 ${response.data.length} 筆資料`)
    return response.data
  } catch (error) {
    console.error('❌ 從農委會 API 取得資料失敗:', error.message)
    throw new Error(`無法從農委會 API 取得資料: ${error.message}`)
  }
}

// 轉換原始資料格式
function transformFarmData(rawData) {
  return rawData.map(farm => {
    // 解析無障礙設施
    const accessibleItems = farm.AccessibleItem 
      ? farm.AccessibleItem.split('、').filter(item => item.trim())
      : []
    
    // 取得縣市名稱
    const countyName = COUNTY_MAP[farm.County] || farm.County
    
    return {
      id: `${farm.County}-${farm.FarmNm_CH}`,
      name: farm.FarmNm_CH,
      tel: farm.TEL || '',
      fax: farm.FAX || '',
      postalCode: farm.PCode || '',
      county: farm.County,
      countyName: countyName,
      township: farm.Township || '',
      address: {
        chinese: farm.Address_CH || '',
        english: farm.Address_EN || ''
      },
      website: farm.WebURL || '',
      coordinates: {
        longitude: parseFloat(farm.Longitude) || 0,
        latitude: parseFloat(farm.Latitude) || 0
      },
      accessibleItems: accessibleItems
    }
  })
}

// 儲存資料到快取檔案
async function saveToCache(farms) {
  try {
    // 確保快取目錄存在
    await fs.mkdir(CACHE_DIR, { recursive: true })
    
    // 儲存農場資料
    await fs.writeFile(FARMS_CACHE_FILE, JSON.stringify(farms, null, 2), 'utf8')
    
    // 更新快取配置
    const cacheConfig = {
      enabled: true,
      ttl: 86400000, // 24 小時
      maxRetries: 3,
      lastUpdate: new Date().toISOString()
    }
    await fs.writeFile(CACHE_CONFIG_FILE, JSON.stringify(cacheConfig, null, 2), 'utf8')
    
    console.log('�� 資料已儲存到快取檔案')
  } catch (error) {
    console.error('❌ 儲存快取檔案失敗:', error.message)
    throw error
  }
}

// 從快取檔案讀取資料
async function loadFromCache() {
  try {
    const data = await fs.readFile(FARMS_CACHE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.log('⚠️ 無法讀取快取檔案，將從 API 取得資料')
    return null
  }
}

// 檢查快取是否有效
async function isCacheValid() {
  try {
    const configData = await fs.readFile(CACHE_CONFIG_FILE, 'utf8')
    const config = JSON.parse(configData)
    
    if (!config.enabled) return false
    
    const lastUpdate = new Date(config.lastUpdate)
    const now = new Date()
    const ttl = config.ttl || 86400000 // 預設 24 小時
    
    return (now - lastUpdate) < ttl
  } catch (error) {
    return false
  }
}

// 從農委會取得農場資料（主要函數）
async function fetchFarmsFromMOA(forceRefresh = false) {
  try {
    // 如果不是強制重新整理，先檢查快取
    if (!forceRefresh) {
      const isValid = await isCacheValid()
      if (isValid) {
        const cachedData = await loadFromCache()
        if (cachedData) {
          console.log('📦 使用快取資料')
          return cachedData
        }
      }
    }
    
    // 從 API 取得資料
    const rawData = await fetchRawDataFromMOA()
    const transformedData = transformFarmData(rawData)
    
    // 儲存到快取
    await saveToCache(transformedData)
    
    return transformedData
  } catch (error) {
    console.error('❌ 取得農場資料失敗:', error.message)
    
    // 如果 API 失敗，嘗試使用快取資料
    const cachedData = await loadFromCache()
    if (cachedData) {
      console.log('⚠️ API 失敗，使用快取資料')
      return cachedData
    }
    
    throw error
  }
}

// 根據縣市篩選農場
async function filterFarmsByCounty(county, forceRefresh = false) {
  try {
    const allFarms = await fetchFarmsFromMOA(forceRefresh)
    
    // 支援縣市代碼和縣市名稱搜尋
    const filteredFarms = allFarms.filter(farm => {
      const countyCode = farm.county
      const countyName = farm.countyName
      const searchTerm = county.toString().toLowerCase()
      
      return countyCode.toLowerCase().includes(searchTerm) ||
             countyName.toLowerCase().includes(searchTerm) ||
             farm.township.toLowerCase().includes(searchTerm)
    })
    
    return filteredFarms
  } catch (error) {
    console.error('❌ 篩選農場失敗:', error.message)
    throw error
  }
}

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
    // 檢查快取檔案是否存在
    const farmsExists = await fs.access(FARMS_CACHE_FILE).then(() => true).catch(() => false)
    const configExists = await fs.access(CACHE_CONFIG_FILE).then(() => true).catch(() => false)
    
    if (!farmsExists || !configExists) {
      return res.json({
        success: true,
        data: {
          exists: false,
          enabled: false,
          lastUpdate: null,
          ttl: null,
          farmCount: 0,
          message: '快取檔案不存在'
        },
        message: '快取狀態查詢成功'
      })
    }
    
    // 讀取快取配置
    const configData = await fs.readFile(CACHE_CONFIG_FILE, 'utf8')
    const config = JSON.parse(configData)
    
    // 讀取農場資料以取得數量
    const farmsData = await fs.readFile(FARMS_CACHE_FILE, 'utf8')
    const farms = JSON.parse(farmsData)
    
    // 計算快取年齡
    const lastUpdate = new Date(config.lastUpdate)
    const now = new Date()
    const ageInHours = Math.floor((now - lastUpdate) / (1000 * 60 * 60))
    const ageInMinutes = Math.floor((now - lastUpdate) / (1000 * 60))
    
    const status = {
      exists: true,
      enabled: config.enabled,
      lastUpdate: config.lastUpdate,
      ttl: config.ttl,
      farmCount: farms.length,
      ageInHours: ageInHours,
      ageInMinutes: ageInMinutes,
      isValid: (now - lastUpdate) < config.ttl,
      message: `快取包含 ${farms.length} 筆農場資料，${ageInHours > 0 ? `${ageInHours} 小時` : `${ageInMinutes} 分鐘`}前更新`
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
export const clearFarmCache = async (req, res, next) => {
  try {
    console.log('🗑️ 正在清除快取...')
    
    // 確保快取目錄存在
    await fs.mkdir(CACHE_DIR, { recursive: true })
    
    // 清除農場資料檔案
    try {
      await fs.unlink(FARMS_CACHE_FILE)
      console.log('✅ 農場資料快取已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
    // 清除快取配置檔案
    try {
      await fs.unlink(CACHE_CONFIG_FILE)
      console.log('✅ 快取配置已清除')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
    
    console.log('🗑️ 所有快取已清除')
    
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
    const farms = await fetchFarmsFromMOA(true)
    
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