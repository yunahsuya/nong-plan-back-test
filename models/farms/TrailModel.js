import { BaseModel } from '../BaseModel.js'

export class TrailModel extends BaseModel {
  constructor() {
    super('trails', 'cache')
  }

  /**
   * 轉換步道資料格式
   */
  transformData(rawData) {
    return rawData
      .filter(item => item.Name && item.AreaLocation)
      .map(trail => ({
        id: `trail-${trail.Name}-${trail.County}`.replace(/\s+/g, '-'),
        name: trail.Name,
        areaLocation: trail.AreaLocation,
        maintainUnit: trail.MaintainUnit,
        tel: trail.Tel,
        feature: trail.Feature,
        price: trail.Price,
        stayTime: trail.StayTime,
        travelMonths: trail.TravelMonths,
        trafficGuidelines: trail.TrafficGuidelines,
        parkingLot: trail.ParkingLot,
        reminder: trail.Reminder,
        equipment: trail.Equipment,
        url: trail.Url,
        county: trail.County,
        town: trail.Town,
        coordinates: {
          longitude: trail.Longitude ? parseFloat(trail.Longitude) : null,
          latitude: trail.Latitude ? parseFloat(trail.Latitude) : null
        },
        category: '步道',
        tags: ['農村旅遊', '步道', '自然景觀']
      }))
  }

  /**
   * 驗證資料格式
   */
  validateData(data) {
    // 基本驗證
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
      throw new Error('沒有可用的快取資料')
    }
    return cachedData
  }

  /**
   * 根據縣市篩選步道
   */
  async getByCounty(county) {
    const allTrails = await this.getAll()
    return allTrails.filter(trail => 
      trail.county === county || 
      trail.areaLocation?.includes(county)
    )
  }

  /**
   * 搜尋步道
   */
  async search(filters = {}) {
    const allTrails = await this.getAll()
    let filteredTrails = allTrails

    if (filters.county) {
      filteredTrails = filteredTrails.filter(trail => 
        trail.county === filters.county
      )
    }

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase()
      filteredTrails = filteredTrails.filter(trail => 
        trail.name?.toLowerCase().includes(keyword) ||
        trail.areaLocation?.toLowerCase().includes(keyword) ||
        trail.feature?.toLowerCase().includes(keyword)
      )
    }

    return filteredTrails
  }
}