import { BaseModel } from '../BaseModel.js'

/**
 * 農場資料 Model - 只負責資料處理和快取
 */
export class FarmModel extends BaseModel {
  constructor() {
    super('farms', 'cache') // 使用不同的快取目錄
  }

  // 縣市代碼對應表
  static COUNTY_MAP = {
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

  /**
   * 轉換農場資料格式
   */
  transformData(rawData) {
    return rawData.map(farm => {
      // 解析無障礙設施
      const accessibleItems = (farm.AccessibleItem || '').split('、').filter(Boolean)
      
      // 取得縣市名稱
      const countyName = FarmModel.COUNTY_MAP[farm.County] || farm.County
      
      const transformed = {
        name: farm.FarmNm_CH,
        countyName: countyName,
        township: farm.Township || '',
        address: {
          chinese: farm.Address_CH || ''
        },
        website: farm.WebURL || '',
        coordinates: {
          longitude: parseFloat(farm.Longitude) || 0,
          latitude: parseFloat(farm.Latitude) || 0
        },
        accessibleItems: accessibleItems
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
      
      // 無障礙設施搜尋
      if (criteria.accessibleItem) {
        const hasItem = farm.accessibleItems.some(item => 
          item.toLowerCase().includes(criteria.accessibleItem.toLowerCase())
        )
        if (!hasItem) return false
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
    const accessibleItems = [...new Set(allData.flatMap(farm => farm.accessibleItems).filter(Boolean))]
    
    return {
      total: allData.length,
      counties: counties,
      accessibleItems: accessibleItems,
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