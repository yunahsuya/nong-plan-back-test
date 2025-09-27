import { BaseModel } from './BaseModel.js'

/**
 * 水產資料 Model - 只負責資料處理和快取
 */
export class AquacultureModel extends BaseModel {
  constructor() {
    super('aquaculture')
  }

  /**
   * 轉換水產資料格式
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
        id: `aquaculture-${index}`,
        category: 'aquaculture',
        title: this.extractTitle(item),
        description: this.extractDescription(item),
        link: this.extractLink(item),
        pubDate: this.extractPubDate(item),
        coordinates: {
          longitude: parseFloat(item.經度 || item.Longitude || item.longitude) || 0,
          latitude: parseFloat(item.緯度 || item.Latitude || item.latitude) || 0
        }
      }
      
      return this.validateData(transformed)
    })
  }

  /**
   * 驗證資料格式
   */
  validateData(data) {
    // 基本驗證
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Invalid aquaculture data: missing or invalid id')
    }
    
    if (!data.title || typeof data.title !== 'string') {
      data.title = '未命名'
    }
    
    if (!data.coordinates || typeof data.coordinates !== 'object') {
      data.coordinates = { longitude: 0, latitude: 0 }
    }
    
    // 座標驗證
    if (typeof data.coordinates.longitude !== 'number' || isNaN(data.coordinates.longitude)) {
      data.coordinates.longitude = 0
    }
    
    if (typeof data.coordinates.latitude !== 'number' || isNaN(data.coordinates.latitude)) {
      data.coordinates.latitude = 0
    }
    
    return data
  }

  /**
   * 提取標題
   */
  extractTitle(item) {
    return item.遊戲名稱 || item.名稱 || item.title || '未命名'
  }

  /**
   * 提取描述
   */
  extractDescription(item) {
    return item.描述 || item.說明 || item.Description || item.description || ''
  }

  /**
   * 提取連結
   */
  extractLink(item) {
    return item.遊戲類型 || item.類型 || item.link || ''
  }

  /**
   * 提取發布日期
   */
  extractPubDate(item) {
    return item.遊戲類型 || item.類型 || item.pubDate || ''
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
   * 根據 ID 取得單一水產資料
   */
  async getById(id) {
    const allData = await this.getAll()
    return allData.find(item => item.id === id) || null
  }

  /**
   * 根據條件搜尋水產資料
   */
  async search(criteria = {}) {
    const allData = await this.getAll()
    
    return allData.filter(item => {
      // 標題搜尋
      if (criteria.title && !item.title.toLowerCase().includes(criteria.title.toLowerCase())) {
        return false
      }
      
      // 類別搜尋
      if (criteria.category && item.category !== criteria.category) {
        return false
      }
      
      // 座標範圍搜尋
      if (criteria.coordinates) {
        const { minLat, maxLat, minLng, maxLng } = criteria.coordinates
        if (minLat !== undefined && item.coordinates.latitude < minLat) return false
        if (maxLat !== undefined && item.coordinates.latitude > maxLat) return false
        if (minLng !== undefined && item.coordinates.longitude < minLng) return false
        if (maxLng !== undefined && item.coordinates.longitude > maxLng) return false
      }
      
      return true
    })
  }

  /**
   * 取得資料統計
   */
  async getStatistics() {
    const allData = await this.getAll()
    
    return {
      total: allData.length,
      withCoordinates: allData.filter(item => 
        item.coordinates.longitude !== 0 || item.coordinates.latitude !== 0
      ).length,
      categories: [...new Set(allData.map(item => item.category))],
      averageCoordinates: {
        longitude: allData.reduce((sum, item) => sum + item.coordinates.longitude, 0) / allData.length,
        latitude: allData.reduce((sum, item) => sum + item.coordinates.latitude, 0) / allData.length
      }
    }
  }
}