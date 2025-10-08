import { BaseModel } from '../BaseModel.js'

/**
 * 戶外教育農場資料 Model - 負責資料處理和快取
 */
export class OutdoorEduFarmModel extends BaseModel {
  constructor() {
    super('outdoor-edu-farms', 'cache') // 使用 cache 目錄
  }

  /**
   * 轉換戶外教育農場資料格式
   */
  transformData(rawData) {
    return rawData.map(farm => {
      const transformed = {
        id: farm.FarmNm_CH ? `outdoor-${farm.FarmNm_CH}-${farm.County}`.replace(/\s+/g, '-') : `outdoor-${Date.now()}-${Math.random()}`,
        name: farm.FarmNm_CH || '',
        address: farm.Address_CH || '',
        tel: farm.TEL || '',
        website: farm.WebURL || '',
        countyName: farm.County || '',
        township: farm.Township || '',
        farmType: '戶外教育農場',
        serveItems: farm.ServeItem ? farm.ServeItem.split('、') : ['體驗', '導覽', '解說'],
        accessibleItems: farm.ServeItem ? farm.ServeItem.split('、') : ['體驗', '導覽', '解說'],
        coordinates: {
          longitude: parseFloat(farm.Longitude) || 0,
          latitude: parseFloat(farm.Latitude) || 0
        },
        facebook: farm.Facebook || '',
        postalCode: farm.PCODE || ''
      }
      
      return this.validateData(transformed)
    })
  }

  /**
   * 驗證資料格式
   */
  validateData(data) {
    if (!data.name || typeof data.name !== 'string') {
      data.name = '未命名農場'
    }
    
    if (!data.coordinates || typeof data.coordinates !== 'object') {
      data.coordinates = { longitude: 0, latitude: 0 }
    }
    
    if (typeof data.coordinates.longitude !== 'number' || isNaN(data.coordinates.longitude)) {
      data.coordinates.longitude = 0
    }
    
    if (typeof data.coordinates.latitude !== 'number' || isNaN(data.coordinates.latitude)) {
      data.coordinates.latitude = 0
    }
    
    if (!Array.isArray(data.serveItems)) {
      data.serveItems = []
    }
    
    if (!Array.isArray(data.accessibleItems)) {
      data.accessibleItems = []
    }
    
    return data
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
   * 根據縣市篩選農場
   */
  async getByCounty(county) {
    const allData = await this.getAll()
    
    const filteredFarms = allData.filter(farm => {
      const countyName = farm.countyName
      const searchTerm = county.toString().toLowerCase()
      
      return countyName.toLowerCase().includes(searchTerm) ||
             farm.township.toLowerCase().includes(searchTerm)
    })
    
    return filteredFarms
  }

  /**
   * 根據條件搜尋農場
   */
  async search(criteria = {}) {
    const allData = await this.getAll()
    
    return allData.filter(farm => {
      // 農場名稱搜尋
      if (criteria.name && !farm.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false
      }
      
      // 縣市搜尋
      if (criteria.county && !farm.countyName.toLowerCase().includes(criteria.county.toLowerCase())) {
        return false
      }
      
      // 座標範圍搜尋
      if (criteria.coordinates) {
        const { minLat, maxLat, minLng, maxLng } = criteria.coordinates
        if (minLat !== undefined && farm.coordinates.latitude < minLat) return false
        if (maxLat !== undefined && farm.coordinates.latitude > maxLat) return false
        if (minLng !== undefined && farm.coordinates.longitude < minLng) return false
        if (maxLng !== undefined && farm.coordinates.longitude > maxLng) return false
      }
      
      return true
    })
  }

  /**
   * 取得農場統計
   */
  async getStatistics() {
    const allData = await this.getAll()
    
    const counties = [...new Set(allData.map(farm => farm.countyName).filter(Boolean))]
    const serveItems = [...new Set(allData.flatMap(farm => farm.serveItems).filter(Boolean))]
    
    return {
      total: allData.length,
      counties: counties,
      serveItems: serveItems,
      withCoordinates: allData.filter(farm => 
        farm.coordinates.longitude !== 0 || farm.coordinates.latitude !== 0
      ).length,
      averageCoordinates: {
        longitude: allData.reduce((sum, farm) => sum + farm.coordinates.longitude, 0) / allData.length,
        latitude: allData.reduce((sum, farm) => sum + farm.coordinates.latitude, 0) / allData.length
      }
    }
  }
}