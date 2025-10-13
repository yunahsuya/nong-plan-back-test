// models/farms/AgriBestItemModel.js
import axios from 'axios'
import { BaseModel } from '../BaseModel.js'

/**
 * 農漁會年度百大農業精品好禮 Model
 */
export class AgriBestItemModel extends BaseModel {
  constructor() {
    super('agri-best-items', 'cache/farms')
  }

  // MOA 農漁會年度百大農業精品好禮 API URL
  static MOA_API_URL = 'https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvAgriBestItem.aspx?IsTransData=1&UnitId=375'

  /**
   * 從 MOA API 取得農漁會年度百大農業精品好禮資料
   */
  async fetchFromAPI() {
    try {
      console.log('🌐 正在從 MOA API 取得農漁會年度百大農業精品好禮資料...')
      const response = await axios.get(AgriBestItemModel.MOA_API_URL, {
        timeout: 30000
      })

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('API 回應格式錯誤')
      }

      console.log(`✅ 成功取得 ${response.data.length} 筆農漁會年度百大農業精品好禮資料`)
      const transformedData = this.transformData(response.data)
      await this.saveToCache(transformedData)
      
      return transformedData
    } catch (error) {
      console.error('❌ 從 MOA API 取得農漁會年度百大農業精品好禮資料失敗:', error.message)
      throw error
    }
  }

  /**
   * 轉換農漁會年度百大農業精品好禮資料格式
   */
  transformData(rawData) {
    return rawData.map(item => ({
      id: `agri-best-${item.AgriBtItemNm}-${item.CountyName}`.replace(/\s+/g, '-'),
      name: item.AgriBtItemNm || '',
      type: item.AgriBtItemTypeNm || '',
      description: item.AgriBtItemCnt || '',
      specification: item.AgriBtItemSpec || '',
      price: item.AgriBtItemCost || '0',
      image: item.Photo || '',
      organization: item.AgriBuyMainName || '',
      address: item.AgriMainAdrs || '',
      phone: item.AgriTel || '',
      website: item.AgriURL || '',
      county: this.getCountyName(item.CountyName),
      township: item.TownshipName || '',
      coordinates: {
        longitude: parseFloat(item.Longitude) || 0,
        latitude: parseFloat(item.Latitude) || 0
      },
      category: '農漁會年度百大農業精品好禮',
      tags: ['百大精品', '農漁會', '優良產品'],
      source: '農漁會年度百大農業精品好禮'
    })).filter(item => item.name && item.name.trim() !== '')
  }

  /**
   * 將縣市代碼轉換為縣市名稱
   */
  getCountyName(countyCode) {
    const countyMap = {
      '10001': '台北市',
      '10002': '新北市',
      '10003': '桃園市',
      '10004': '新竹縣',
      '10005': '新竹市',
      '10006': '苗栗縣',
      '10007': '台中市',
      '10008': '彰化縣',
      '10009': '南投縣',
      '10010': '雲林縣',
      '10011': '嘉義縣',
      '10012': '嘉義市',
      '10013': '台南市',
      '10014': '高雄市',
      '10015': '屏東縣',
      '10016': '宜蘭縣',
      '10017': '花蓮縣',
      '10018': '台東縣',
      '10019': '澎湖縣',
      '10020': '金門縣',
      '10021': '連江縣',
      '63000': '台北市',
      '64000': '新北市',
      '66000': '台中市',
      '67000': '台南市',
      '68000': '高雄市'
    }
    return countyMap[countyCode] || countyCode
  }

  /**
   * 取得所有農漁會年度百大農業精品好禮資料
   */
  async getAll(forceRefresh = false) {
    try {
      // 檢查快取
      if (!forceRefresh && await this.isCacheValid()) {
        console.log('📖 從快取載入農漁會年度百大農業精品好禮資料')
        const cachedData = await this.loadFromCache()
        if (cachedData) {
          return cachedData
        }
      }

      // 從 API 取得資料
      console.log('🔄 重新從 API 取得農漁會年度百大農業精品好禮資料')
      return await this.fetchFromAPI()
    } catch (error) {
      console.error('取得農漁會年度百大農業精品好禮資料失敗:', error)
      
      // 嘗試回傳快取資料
      const cachedData = await this.loadFromCache()
      if (cachedData) {
        console.log('⚠️ 使用快取資料作為備援')
        return cachedData
      }
      
      throw error
    }
  }

  /**
   * 根據縣市篩選農漁會年度百大農業精品好禮
   */
  async getByCounty(county) {
    try {
      const allItems = await this.getAll()
      return allItems.filter(item => 
        item.county === county || 
        (item.county && item.county.includes(county))
      )
    } catch (error) {
      console.error('根據縣市篩選農漁會年度百大農業精品好禮失敗:', error)
      throw error
    }
  }

  /**
   * 根據類型篩選農漁會年度百大農業精品好禮
   */
  async getByType(type) {
    try {
      const allItems = await this.getAll()
      return allItems.filter(item => 
        item.type === type || 
        (item.type && item.type.includes(type))
      )
    } catch (error) {
      console.error('根據類型篩選農漁會年度百大農業精品好禮失敗:', error)
      throw error
    }
  }

  /**
   * 搜尋農漁會年度百大農業精品好禮
   */
  async search(keyword) {
    try {
      const allItems = await this.getAll()
      const lowerKeyword = keyword.toLowerCase()
      
      return allItems.filter(item => 
        item.name.toLowerCase().includes(lowerKeyword) ||
        item.type.toLowerCase().includes(lowerKeyword) ||
        item.description.toLowerCase().includes(lowerKeyword) ||
        item.county.toLowerCase().includes(lowerKeyword) ||
        item.organization.toLowerCase().includes(lowerKeyword)
      )
    } catch (error) {
      console.error('搜尋農漁會年度百大農業精品好禮失敗:', error)
      throw error
    }
  }

  /**
   * 取得縣市列表
   */
  async getCounties() {
    try {
      const allItems = await this.getAll()
      const counties = new Set()
      
      allItems.forEach(item => {
        if (item.county) {
          counties.add(item.county)
        }
      })
      
      return Array.from(counties).sort()
    } catch (error) {
      console.error('取得縣市列表失敗:', error)
      throw error
    }
  }

  /**
   * 取得類型列表
   */
  async getTypes() {
    try {
      const allItems = await this.getAll()
      const types = new Set()
      
      allItems.forEach(item => {
        if (item.type) {
          types.add(item.type)
        }
      })
      
      return Array.from(types).sort()
    } catch (error) {
      console.error('取得類型列表失敗:', error)
      throw error
    }
  }

  /**
   * 取得統計資料
   */
  async getStatistics() {
    try {
      const allItems = await this.getAll()
      
      const statistics = {
        total: allItems.length,
        byCounty: {},
        byType: {},
        bySource: {},
        withImage: 0,
        withCoordinates: 0,
        withWebsite: 0
      }

      allItems.forEach(item => {
        // 按縣市統計
        if (item.county) {
          statistics.byCounty[item.county] = (statistics.byCounty[item.county] || 0) + 1
        }

        // 按類型統計
        if (item.type) {
          statistics.byType[item.type] = (statistics.byType[item.type] || 0) + 1
        }

        // 按來源統計
        if (item.source) {
          statistics.bySource[item.source] = (statistics.bySource[item.source] || 0) + 1
        }

        // 統計有圖片的
        if (item.image) {
          statistics.withImage++
        }

        // 統計有座標的
        if (item.coordinates && item.coordinates.latitude && item.coordinates.longitude) {
          statistics.withCoordinates++
        }

        // 統計有網站的
        if (item.website) {
          statistics.withWebsite++
        }
      })

      return statistics
    } catch (error) {
      console.error('取得統計資料失敗:', error)
      throw error
    }
  }

  /**
   * 驗證資料格式
   */
  validateData(data) {
    if (!Array.isArray(data)) {
      throw new Error('農漁會年度百大農業精品好禮資料必須是陣列格式')
    }

    data.forEach((item, index) => {
      if (!item.name) {
        throw new Error(`第 ${index + 1} 筆資料缺少名稱`)
      }
      if (!item.county) {
        console.warn(`第 ${index + 1} 筆資料缺少縣市資訊: ${item.name}`)
      }
    })

    return true
  }
}