import { BaseModel } from '../BaseModel.js'

export class ParkingModel extends BaseModel {
  constructor() {
    super('parking-lots', 'cache/parking-lots.json')
  }

  /**
   * 處理停車場原始資料
   */
  processData(rawData) {
    if (!Array.isArray(rawData)) {
      throw new Error('停車場資料格式不正確')
    }

    return rawData.map((parking, index) => {
      // 解析停車格數量
      const parkingSpaces = this.parseParkingSpaces(parking.停車格數量)
      
      return {
        id: `parking-${index + 1}`,
        itemNumber: parking.項次,
        location: parking.地點,
        parkingSpaces: parkingSpaces,
        totalSpaces: this.calculateTotalSpaces(parkingSpaces),
        category: '停車場',
        tags: ['農科園區', '停車場'],
        accessibleFeatures: parkingSpaces.disabled > 0 ? ['無障礙停車位'] : [],
        coordinates: {
          // 注意：此 API 沒有提供座標，可能需要手動添加或使用地理編碼
          longitude: null,
          latitude: null
        }
      }
    })
  }

  /**
   * 解析停車格數量字串
   */
  parseParkingSpaces(spaceString) {
    const spaces = {
      car: 0,
      disabled: 0,
      motorcycle: 0,
      bus: 0
    }

    if (!spaceString) return spaces

    // 解析小客車
    const carMatch = spaceString.match(/小客車(\d+)/)
    if (carMatch) spaces.car = parseInt(carMatch[1])

    // 解析身心障礙
    const disabledMatch = spaceString.match(/身心障礙(\d+)/)
    if (disabledMatch) spaces.disabled = parseInt(disabledMatch[1])

    // 解析摩托車
    const motorcycleMatch = spaceString.match(/摩托車(\d+)/)
    if (motorcycleMatch) spaces.motorcycle = parseInt(motorcycleMatch[1])

    // 解析遊覽車
    const busMatch = spaceString.match(/遊覽車(\d+)/)
    if (busMatch) spaces.bus = parseInt(busMatch[1])

    return spaces
  }

  /**
   * 計算總停車格數
   */
  calculateTotalSpaces(parkingSpaces) {
    return parkingSpaces.car + parkingSpaces.disabled + parkingSpaces.motorcycle + parkingSpaces.bus
  }

  /**
   * 根據地點搜尋停車場
   */
  async searchByLocation(location) {
    const allData = await this.getAll()
    return allData.filter(parking => 
      parking.location.includes(location)
    )
  }

  /**
   * 取得有無障礙設施的停車場
   */
  async getAccessibleParking() {
    const allData = await this.getAll()
    return allData.filter(parking => 
      parking.accessibleFeatures.length > 0
    )
  }

  /**
   * 根據停車格數量篩選
   */
  async filterByCapacity(minCapacity = 0) {
    const allData = await this.getAll()
    return allData.filter(parking => 
      parking.totalSpaces >= minCapacity
    )
  }
}