import axios from 'axios'
import { BaseModel } from '../BaseModel.js'

/**
 * 美食資料 Model
 */
export class FoodModel extends BaseModel {
  constructor() {
    super('food', 'cache/farms')
  }

  // MOA 美食 API URL
  static MOA_API_URL = 'https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvTravelFood.aspx?IsTransData=1&UnitId=193'

  /**
   * 從 MOA API 取得美食資料
   */
  async fetchFromAPI() {
    try {
      console.log('🌐 正在從 MOA API 取得美食資料...')
      const response = await axios.get(FoodModel.MOA_API_URL, {
        timeout: 30000
      })

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('API 回應格式錯誤')
      }

      console.log(`✅ 成功取得 ${response.data.length} 筆美食資料`)
      const transformedData = this.transformData(response.data)
      await this.saveToCache(transformedData)
      
      return transformedData
    } catch (error) {
      console.error('❌ 從 MOA API 取得美食資料失敗:', error.message)
      throw error
    }
  }

  /**
   * 轉換美食資料格式
   */
  transformData(rawData) {
    return rawData.map(food => {
      const transformed = {
        id: food.ID || `food-${food.Name?.replace(/\s+/g, '-') || 'unknown'}`,
        name: food.Name || '',
        address: food.Address || '',
        tel: food.Tel || '',
        host_words: food.HostWords || '',
        price: food.Price || '',
        open_hours: food.OpenHours || '',
        credit_card: food.CreditCard === 'True',
        travel_card: food.TravelCard === 'True',
        traffic_guidelines: food.TrafficGuidelines || '',
        parking_lot: food.ParkingLot || '',
        url: food.Url || '',
        email: food.Email || '',
        pet_notice: food.PetNotice || '',
        reminder: food.Reminder || '',
        food_months: food.FoodMonths || '',
        food_capacity: food.FoodCapacity || '',
        food_feature: food.FoodFeature || '',
        city: food.City || '',
        town: food.Town || '',
        pic_url: food.PicURL || '',
        latitude: parseFloat(food.Latitude) || 0,
        longitude: parseFloat(food.Longitude) || 0,
        blog_url: food.BlogUrl || ''
      }
      
      return this.validateData(transformed)
    })
  }

  /**
   * 驗證資料格式
   */
  validateData(data) {
    if (!data.name || typeof data.name !== 'string') {
      data.name = '未命名美食'
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
   * 根據縣市篩選美食
   */
  async getByCounty(county) {
    const allData = await this.getAll()
    
    return allData.filter(food => 
      food.city === county || food.city.includes(county)
    )
  }

  /**
   * 根據鄉鎮篩選美食
   */
  async getByTown(town) {
    const allData = await this.getAll()
    
    return allData.filter(food => 
      food.town === town || food.town.includes(town)
    )
  }

  /**
   * 搜尋美食
   */
  async search(criteria = {}) {
    const allData = await this.getAll()
    
    return allData.filter(food => {
      // 關鍵字搜尋
      if (criteria.keyword) {
        const searchKeyword = criteria.keyword.toLowerCase()
        const matchName = food.name.toLowerCase().includes(searchKeyword)
        const matchFeature = food.food_feature.toLowerCase().includes(searchKeyword)
        const matchAddress = food.address.toLowerCase().includes(searchKeyword)
        
        if (!matchName && !matchFeature && !matchAddress) {
          return false
        }
      }
      
      // 縣市篩選
      if (criteria.city) {
        if (!food.city || !food.city.includes(criteria.city)) {
          return false
        }
      }
      
      // 鄉鎮篩選
      if (criteria.town) {
        if (!food.town || !food.town.includes(criteria.town)) {
          return false
        }
      }
      
      // 信用卡篩選
      if (criteria.credit_card !== undefined) {
        if (food.credit_card !== criteria.credit_card) {
          return false
        }
      }
      
      // 旅遊卡篩選
      if (criteria.travel_card !== undefined) {
        if (food.travel_card !== criteria.travel_card) {
          return false
        }
      }
      
      return true
    })
  }

  /**
   * 取得所有縣市列表
   */
  async getCities() {
    const allData = await this.getAll()
    const cities = new Set()
    
    allData.forEach(food => {
      if (food.city && food.city !== '未知') {
        cities.add(food.city)
      }
    })
    
    return Array.from(cities).sort()
  }

  /**
   * 取得指定縣市的所有鄉鎮列表
   */
  async getTownsByCity(city) {
    const allData = await this.getAll()
    const towns = new Set()
    
    allData.forEach(food => {
      if (food.city === city && food.town && food.town !== '未知') {
        towns.add(food.town)
      }
    })
    
    return Array.from(towns).sort()
  }

  /**
   * 分頁取得美食
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
   * 取得所有美食資料
   */
  async getAll(forceRefresh = false) {
    // 如果強制刷新，從 API 取得
    if (forceRefresh) {
      return await this.fetchFromAPI()
    }

    // 檢查快取是否有效
    const isValid = await this.isCacheValid()
    if (isValid) {
      console.log('📦 使用快取的美食資料')
      return await this.loadFromCache()
    }

    // 快取無效，從 API 取得
    console.log('⚠️ 快取已過期，從 API 重新取得資料')
    return await this.fetchFromAPI()
  }

  /**
   * 取得美食統計資料
   */
  async getStatistics() {
    const allData = await this.getAll()
    
    const statistics = {
      total: allData.length,
      byCity: {},
      withCreditCard: 0,
      withTravelCard: 0,
      withParking: 0,
      withPetNotice: 0
    }
    
    allData.forEach(food => {
      // 統計縣市
      if (food.city) {
        statistics.byCity[food.city] = (statistics.byCity[food.city] || 0) + 1
      }
      
      // 統計各種設施
      if (food.credit_card) statistics.withCreditCard++
      if (food.travel_card) statistics.withTravelCard++
      if (food.parking_lot) statistics.withParking++
      if (food.pet_notice) statistics.withPetNotice++
    })
    
    return statistics
  }
}