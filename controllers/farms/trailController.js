import { StatusCodes } from 'http-status-codes'
import axios from 'axios'

// MOA API URL for trails
const MOA_TRAIL_API_URL = 'https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvMovingRoad.aspx?IsTransData=1&UnitId=195'

/**
 * 從農業部 API 取得原始步道資料
 */
async function fetchRawTrailData() {
  try {
    console.log('🌐 正在從農業部 API 取得步道資料...')
    const response = await axios.get(MOA_TRAIL_API_URL, {
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('API 回應格式不正確')
    }
    
    console.log(`✅ 成功從農業部 API 取得 ${response.data.length} 筆步道資料`)
    return response.data
  } catch (error) {
    console.error('❌ 從農業部 API 取得步道資料失敗:', error.message)
    throw new Error(`無法從農業部 API 取得步道資料: ${error.message}`)
  }
}

/**
 * 取得步道資料（主要函數）
 */
async function fetchTrailData(trailModel, forceRefresh = false) {
  try {
    // 如果不是強制重新整理，優先嘗試使用快取資料
    if (!forceRefresh) {
      try {
        const cachedData = await trailModel.getAll()
        console.log('📦 使用步道快取資料')
        return cachedData
      } catch (error) {
        console.log('⚠️ 沒有快取資料，將從 API 取得')
      }
    }
    
    // 從 API 取得資料
    console.log('🌐 嘗試從農業部 API 取得步道資料...')
    try {
      const rawData = await fetchRawTrailData()
      const processedData = await trailModel.processData(rawData)
      
      console.log('✅ 成功從 API 取得並快取步道資料')
      return processedData
    } catch (apiError) {
      console.log(`⚠️ API 失敗: ${apiError.message}`)
      
      // API 失敗時，嘗試使用快取資料
      try {
        const cachedData = await trailModel.getAll()
        console.log('📦 API 失敗，使用步道快取資料作為備案')
        return cachedData
      } catch (cacheError) {
        throw new Error('無法取得步道資料：API 不可用且無快取資料')
      }
    }
  } catch (error) {
    console.error('❌ 取得步道資料完全失敗:', error.message)
    throw error
  }
}


export class TrailController {
  constructor(trailModel) {
    this.trailModel = trailModel
  }

  // 取得所有步道（支援分頁）
  async getAllTrails(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true'
      
      // 分頁參數
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 9
      const offset = (page - 1) * limit
      
      const trails = await fetchTrailData(this.trailModel, forceRefresh)
      
      // 計算分頁資訊
      const totalItems = trails.length
      const totalPages = Math.ceil(totalItems / limit)
      const paginatedTrails = trails.slice(offset, offset + limit)
      
      res.json({
        success: true,
        data: paginatedTrails,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        message: `成功取得第 ${page} 頁，共 ${paginatedTrails.length} 筆步道資料`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '取得步道資料失敗',
        error: error.message
      })
    }
  }

  // 根據縣市取得步道（支援分頁）
  async getTrailsByCounty(req, res) {
    try {
      const { county } = req.params
      
      // 分頁參數
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 9
      const offset = (page - 1) * limit
      
      const trails = await this.trailModel.getByCounty(county)
      
      // 計算分頁資訊
      const totalItems = trails.length
      const totalPages = Math.ceil(totalItems / limit)
      const paginatedTrails = trails.slice(offset, offset + limit)
      
      res.json({
        success: true,
        data: paginatedTrails,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        message: `成功取得 ${county} 第 ${page} 頁，共 ${paginatedTrails.length} 筆步道資料`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '取得步道資料失敗',
        error: error.message
      })
    }
  }

  // 搜尋步道（支援分頁）
  async searchTrails(req, res) {
    try {
      const filters = req.query
      
      // 分頁參數
      const page = parseInt(filters.page) || 1
      const limit = parseInt(filters.limit) || 9
      const offset = (page - 1) * limit
      
      // 移除分頁參數，避免影響搜尋
      const searchFilters = { ...filters }
      delete searchFilters.page
      delete searchFilters.limit
      
      const trails = await this.trailModel.search(searchFilters)
      
      // 計算分頁資訊
      const totalItems = trails.length
      const totalPages = Math.ceil(totalItems / limit)
      const paginatedTrails = trails.slice(offset, offset + limit)
      
      res.json({
        success: true,
        data: paginatedTrails,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        message: `搜尋到第 ${page} 頁，共 ${paginatedTrails.length} 筆步道資料`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '搜尋步道失敗',
        error: error.message
      })
    }
  }
}