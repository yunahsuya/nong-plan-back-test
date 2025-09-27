import { BaseModel } from './BaseModel.js'

/**
 * 品種資料 Model - 只負責資料處理和快取
 */
export class VarietiesModel extends BaseModel {
  constructor() {
    super('varieties')
  }

  /**
   * 轉換品種資料格式
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
        id: `varieties-${index}`,
        category: 'varieties',
        title: this.extractTitle(item),
        link: this.extractLink(item),
        pubDate: this.extractPubDate(item),
        description: this.extractDescription(item)
      }
      
      return this.validateData(transformed)
    })
  }

  /**
   * 驗證資料格式
   */
  validateData(data) {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Invalid varieties data: missing or invalid id')
    }
    
    if (!data.title || typeof data.title !== 'string') {
      data.title = '未命名品種'
    }
    
    return data
  }

  /**
   * 提取品種名稱
   */
  extractTitle(item) {
    return item.title || item.品種名稱 || item.品種名 || '未命名品種'
  }

  /**
   * 提取連結
   */
  extractLink(item) {
    return item.link || item.Link || ''
  }

  /**
   * 提取發布日期/作物類型
   */
  extractPubDate(item) {
    return item.pubDate || item.作物類型 || item.作物種類 || ''
  }

  /**
   * 提取描述
   */
  extractDescription(item) {
    return item.description || item.品種特性 || item.描述 || item.Description || ''
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
   * 根據 ID 取得單一品種資料
   */
  async getById(id) {
    const allData = await this.getAll()
    return allData.find(item => item.id === id) || null
  }

  /**
   * 根據條件搜尋品種資料
   */
  async search(criteria = {}) {
    const allData = await this.getAll()
    
    return allData.filter(item => {
      // 品種名稱搜尋
      if (criteria.title && !item.title.toLowerCase().includes(criteria.title.toLowerCase())) {
        return false
      }
      
      // 作物類型搜尋
      if (criteria.pubDate && !item.pubDate.includes(criteria.pubDate)) {
        return false
      }
      
      // 描述搜尋
      if (criteria.description && !item.description.toLowerCase().includes(criteria.description.toLowerCase())) {
        return false
      }
      
      return true
    })
  }

  /**
   * 取得品種統計
   */
  async getStatistics() {
    const allData = await this.getAll()
    
    const categories = [...new Set(allData.map(item => item.pubDate).filter(Boolean))]
    
    return {
      total: allData.length,
      categories: categories,
      withDescription: allData.filter(item => item.description && item.description.length > 0).length
    }
  }
}