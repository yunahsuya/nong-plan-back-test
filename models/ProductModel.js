import { BaseModel } from './BaseModel.js'

/**
 * 產品資料 Model - 只負責資料處理和快取
 */
export class ProductModel extends BaseModel {
  constructor() {
    super('product')
  }

  /**
   * 轉換產品資料格式
   */
  transformData(rawData) {
    if (!Array.isArray(rawData)) {
      if (rawData.data && Array.isArray(rawData.data)) {
        rawData = rawData.data
      } else {
        return [rawData]
      }
    }

    return rawData.map((item, index) => {
      const transformed = {
        id: `product-${index}`,
        category: 'product',
        crop: this.extractCrop(item),
        verify_marker: this.extractVerifyMarker(item),
        yield: this.extractYield(item),
        season: this.extractSeason(item),
        shipments_min: this.extractShipmentsMin(item),
        url: this.generateUrl(item)
      }
      
      return this.validateData(transformed)
    })
  }

  /**
   * 驗證資料格式
   */
  validateData(data) {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Invalid product data: missing or invalid id')
    }
    
    if (!data.crop || typeof data.crop !== 'string') {
      data.crop = '未命名產品'
    }
    
    if (typeof data.yield !== 'number' || isNaN(data.yield)) {
      data.yield = 0
    }
    
    if (typeof data.shipments_min !== 'number' || isNaN(data.shipments_min)) {
      data.shipments_min = 0
    }
    
    return data
  }

  /**
   * 提取作物名稱
   */
  extractCrop(item) {
    return item.crop || item.產品名稱 || item.產品名 || '未命名產品'
  }

  /**
   * 提取驗證標章
   */
  extractVerifyMarker(item) {
    return item.verify_marker || item.安全等級 || item.驗證標章 || ''
  }

  /**
   * 提取產量
   */
  extractYield(item) {
    return parseInt(item.yield || item.月供貨量) || 0
  }

  /**
   * 提取產季
   */
  extractSeason(item) {
    const seasonValue = item.season || item.產季 || ''
    return seasonValue === '13' ? '全年' : seasonValue
  }

  /**
   * 提取最小出貨量
   */
  extractShipmentsMin(item) {
    return parseInt(item.shipments_min || item.最小出貨量) || 0
  }

  /**
   * 生成 URL
   */
  generateUrl(item) {
    const crop = item.crop || item.產品名稱 || ''
    return `https://academy.moa.gov.tw/channel.php?theme=member_production&category=PT001&search=${encodeURIComponent(crop)}`
  }

  /**
   * 處理資料（轉換並儲存到快取）
   */
  async processData(rawData) {
    const transformedData = this.transformData(rawData)
    await this.saveToCache(transformedData)
    return transformedData
  }

  /**
   * 取得所有資料（從快取）
   */
  async getAll() {
    const cachedData = await this.loadFromCache()
    if (!cachedData) {
      throw new Error('沒有快取資料，請先從 API 取得資料')
    }
    return cachedData
  }

  /**
   * 根據 ID 取得單一產品資料
   */
  async getById(id) {
    const allData = await this.getAll()
    return allData.find(item => item.id === id) || null
  }

  /**
   * 根據條件搜尋產品資料
   */
  async search(criteria = {}) {
    const allData = await this.getAll()
    
    return allData.filter(item => {
      // 作物名稱搜尋
      if (criteria.crop && !item.crop.toLowerCase().includes(criteria.crop.toLowerCase())) {
        return false
      }
      
      // 驗證標章搜尋
      if (criteria.verify_marker && !item.verify_marker.includes(criteria.verify_marker)) {
        return false
      }
      
      // 產季搜尋
      if (criteria.season && !item.season.includes(criteria.season)) {
        return false
      }
      
      return true
    })
  }

  /**
   * 取得產品統計
   */
  async getStatistics() {
    const allData = await this.getAll()
    
    const seasons = [...new Set(allData.map(item => item.season).filter(Boolean))]
    const verifyMarkers = [...new Set(allData.map(item => item.verify_marker).filter(Boolean))]
    
    return {
      total: allData.length,
      seasons: seasons,
      verifyMarkers: verifyMarkers,
      averageYield: allData.reduce((sum, item) => sum + item.yield, 0) / allData.length,
      averageShipmentsMin: allData.reduce((sum, item) => sum + item.shipments_min, 0) / allData.length
    }
  }
}