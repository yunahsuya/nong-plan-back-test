import axios from 'axios'
import { BaseModel } from '../BaseModel.js'

/**
 * 農民市集資料 Model
 */
export class MarketModel extends BaseModel {
  constructor() {
    super('markets', 'cache/farms')
  }

  // MOA API URL
static MOA_API_URL = 'https://data.moa.gov.tw/Service/OpenData/MarketUnitData.aspx?IsTransData=1&UnitId=178'
  /**
   * 從 MOA API 取得農民市集資料
   */
  async fetchFromAPI() {
    try {
      console.log('🌐 正在從 MOA API 取得農民市集資料...')
      const response = await axios.get(MarketModel.MOA_API_URL, {
        timeout: 30000
      })

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('API 回應格式錯誤')
      }

      console.log(`✅ 成功取得 ${response.data.length} 筆農民市集資料`)
      const transformedData = this.transformData(response.data)
      await this.saveToCache(transformedData)
      
      return transformedData
    } catch (error) {
      console.error('❌ 從 MOA API 取得市集資料失敗:', error.message)
      throw error
    }
  }

  
  /**
   * 轉換市集資料格式
   */
  transformData(rawData) {
    return rawData.map(market => {
      const transformed = {
        id: `market-${market.name?.replace(/\s+/g, '-') || 'unknown'}`,
        name: market.name || '',
        contact_tel: market.contact_tel || '',
        rules: market.rules || '',
        product: market.product || '',
        verify_marker: market.verify_marker || '',
        longitude: parseFloat(market.longitude) || 0,
        latitude: parseFloat(market.latitude) || 0,
        update_time: market.update_time || '',
        // 新增縣市資訊
        county: this.extractCountyFromAddress(market.address || market.rules || market.name),
        address: market.address || ''
      }
      
      return this.validateData(transformed)
    })
  }

/**
 * 從地址或規則中提取縣市資訊
 */
extractCountyFromAddress(text) {
  if (!text) return '未知'
  
  // 台灣縣市列表
  const counties = [
    '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
    '基隆市', '新竹市', '嘉義市',
    '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣', '嘉義縣',
    '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '澎湖縣', '金門縣', '連江縣'
  ]
  
  // 搜尋縣市名稱
  for (const county of counties) {
    if (text.includes(county)) {
      return county
    }
  }
  
  return '未知'
}

/**
 * 根據縣市篩選市集
 */
async getByCounty(county) {
  const allData = await this.getAll()
  
  return allData.filter(market => 
    market.county === county || market.county.includes(county)
  )
}

/**
 * 搜尋市集（加入縣市篩選）
 */
async search(criteria = {}) {
  const allData = await this.getAll()
  
  return allData.filter(market => {
    // 關鍵字搜尋
    if (criteria.keyword) {
      const searchKeyword = criteria.keyword.toLowerCase()
      const matchName = market.name.toLowerCase().includes(searchKeyword)
      const matchProduct = market.product.toLowerCase().includes(searchKeyword)
      const matchRules = market.rules.toLowerCase().includes(searchKeyword)
      
      if (!matchName && !matchProduct && !matchRules) {
        return false
      }
    }
    
    // 認證標章篩選
    if (criteria.certification) {
      if (!market.verify_marker || 
          !market.verify_marker.toLowerCase().includes(criteria.certification.toLowerCase())) {
        return false
      }
    }
    
    // 縣市篩選
    if (criteria.county) {
      if (!market.county || 
          !market.county.includes(criteria.county)) {
        return false
      }
    }
    
    return true
  })
}

/**
 * 取得所有縣市列表
 */
async getCounties() {
  const allData = await this.getAll()
  const counties = new Set()
  
  allData.forEach(market => {
    if (market.county && market.county !== '未知') {
      counties.add(market.county)
    }
  })
  
  return Array.from(counties).sort()
}

/**
 * 分頁取得市集（加入縣市篩選）
 */
async getPaginated(page = 1, limit = 9, criteria = {}) {
  let filteredData = await this.search(criteria)
  
  const totalItems = filteredData.length
  const totalPages = Math.ceil(totalItems / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  
  const data = filteredData.slice(startIndex, endIndex)
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  }
}

  /**
   * 驗證資料格式
   */
  validateData(data) {
    if (!data.name || typeof data.name !== 'string') {
      data.name = '未命名市集'
    }
    
    if (typeof data.longitude !== 'number' || isNaN(data.longitude)) {
      data.longitude = 0
    }
    
    if (typeof data.latitude !== 'number' || isNaN(data.latitude)) {
      data.latitude = 0
    }
    
    return data
  }

  /**
   * 取得所有市集資料
   */
  async getAll(forceRefresh = false) {
    // 如果強制刷新，從 API 取得
    if (forceRefresh) {
      return await this.fetchFromAPI()
    }

    // 檢查快取是否有效
    const isValid = await this.isCacheValid()
    if (isValid) {
      console.log('📦 使用快取的農民市集資料')
      return await this.loadFromCache()
    }

    // 快取無效，從 API 取得
    console.log('⚠️ 快取已過期，從 API 重新取得資料')
    return await this.fetchFromAPI()
  }

  /**
   * 根據認證標章篩選市集
   */
  async getByCertification(certification) {
    const allData = await this.getAll()
    
    return allData.filter(market => 
      market.verify_marker && 
      market.verify_marker.toLowerCase().includes(certification.toLowerCase())
    )
  }

  /**
   * 搜尋市集
   */
  async search(criteria = {}) {
    const allData = await this.getAll()
    
    return allData.filter(market => {
      // 關鍵字搜尋
      if (criteria.keyword) {
        const searchKeyword = criteria.keyword.toLowerCase()
        const matchName = market.name.toLowerCase().includes(searchKeyword)
        const matchProduct = market.product.toLowerCase().includes(searchKeyword)
        const matchRules = market.rules.toLowerCase().includes(searchKeyword)
        
        if (!matchName && !matchProduct && !matchRules) {
          return false
        }
      }
      
      // 認證標章篩選
      if (criteria.certification) {
        if (!market.verify_marker || 
            !market.verify_marker.toLowerCase().includes(criteria.certification.toLowerCase())) {
          return false
        }
      }
      
      return true
    })
  }

  /**
   * 取得市集統計資料
   */
  async getStatistics() {
    const allData = await this.getAll()
    
    const statistics = {
      total: allData.length,
      byCertification: {},
      withRules: 0,
      withProducts: 0
    }
    
    allData.forEach(market => {
      // 統計認證標章
      if (market.verify_marker) {
        const certifications = market.verify_marker.split(',')
        certifications.forEach(cert => {
          cert = cert.trim()
          statistics.byCertification[cert] = (statistics.byCertification[cert] || 0) + 1
        })
      }
      
      // 統計有規則的市集
      if (market.rules) {
        statistics.withRules++
      }
      
      // 統計有產品資訊的市集
      if (market.product) {
        statistics.withProducts++
      }
    })
    
    return statistics
  }

    /**
   * 分頁取得市集資料
   */
    async getPaginated(page = 1, limit = 9, criteria = {}) {
      const allData = await this.search(criteria)
      
      const totalItems = allData.length
      const totalPages = Math.ceil(totalItems / limit)
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      
      const paginatedData = allData.slice(startIndex, endIndex)
      
      return {
        data: paginatedData,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    }
}