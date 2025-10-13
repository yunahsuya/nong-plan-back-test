// models/farms/SouvenirModel.js
import axios from 'axios'
import { BaseModel } from '../BaseModel.js'

/**
 * 伴手禮資料 Model
 */
export class SouvenirModel extends BaseModel {
  constructor() {
    super('souvenirs', 'cache/farms')
  }

  // MOA 伴手禮 API URL
  static MOA_API_URL = 'https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvAgriculturalProduce.aspx?IsTransData=1&UnitId=197'

  /**
   * 從 MOA API 取得伴手禮資料
   */
  async fetchFromAPI() {
    try {
      console.log('🌐 正在從 MOA API 取得伴手禮資料...')
      const response = await axios.get(SouvenirModel.MOA_API_URL, {
        timeout: 30000
      })

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('API 回應格式錯誤')
      }

      console.log(`✅ 成功取得 ${response.data.length} 筆伴手禮資料`)
      const transformedData = this.transformData(response.data)
      await this.saveToCache(transformedData)
      
      return transformedData
    } catch (error) {
      console.error('❌ 從 MOA API 取得伴手禮資料失敗:', error.message)
      throw error
    }
  }

  /**
   * 轉換伴手禮資料格式
   */
  transformData(rawData) {
    return rawData.map(item => ({
      id: `souvenir-${item.Name}-${item.County}`.replace(/\s+/g, '-'),
      name: item.Name || '',
      feature: item.Feature || '',
      salePlace: item.SalePlace || '',
      produceOrg: item.ProduceOrg || '',
      price: item.SpecAndPrice || '',
      contactTel: item.ContactTel || '',
      orderUrl: item.OrderUrl || '',
      image: item.Column1 || '',
      county: item.County || '',
      township: item.Township || '',
      coordinates: {
        longitude: parseFloat(item.Longitude) || 0,
        latitude: parseFloat(item.Latitude) || 0
      },
      website: item.Website || '',
      category: '伴手禮',
      tags: ['農村伴手禮', '優良產品'],
      source: '農村伴手禮'
    })).filter(item => item.name && item.name.trim() !== '')
  }

  /**
   * 取得所有伴手禮資料
   */
  async getAll(forceRefresh = false) {
    try {
      // 檢查快取
      if (!forceRefresh && await this.isCacheValid()) {
        console.log('📖 從快取載入伴手禮資料')
        const cachedData = await this.loadFromCache()
        if (cachedData) {
          return cachedData
        }
      }

      // 從 API 取得資料
      console.log('🔄 重新從 API 取得伴手禮資料')
      return await this.fetchFromAPI()
    } catch (error) {
      console.error('取得伴手禮資料失敗:', error)
      
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
   * 根據縣市篩選伴手禮
   */
  async getByCounty(county) {
    try {
      const allSouvenirs = await this.getAll()
      return allSouvenirs.filter(souvenir => 
        souvenir.county === county || 
        (souvenir.county && souvenir.county.includes(county))
      )
    } catch (error) {
      console.error('根據縣市篩選伴手禮失敗:', error)
      throw error
    }
  }

  /**
   * 搜尋伴手禮
   */
  async search(keyword) {
    try {
      const allSouvenirs = await this.getAll()
      const lowerKeyword = keyword.toLowerCase()
      
      return allSouvenirs.filter(souvenir => 
        souvenir.name.toLowerCase().includes(lowerKeyword) ||
        souvenir.feature.toLowerCase().includes(lowerKeyword) ||
        souvenir.county.toLowerCase().includes(lowerKeyword) ||
        souvenir.salePlace.toLowerCase().includes(lowerKeyword) ||
        souvenir.produceOrg.toLowerCase().includes(lowerKeyword)
      )
    } catch (error) {
      console.error('搜尋伴手禮失敗:', error)
      throw error
    }
  }

  /**
   * 取得縣市列表
   */
  async getCounties() {
    try {
      const allSouvenirs = await this.getAll()
      const counties = new Set()
      
      allSouvenirs.forEach(souvenir => {
        if (souvenir.county) {
          counties.add(souvenir.county)
        }
      })
      
      return Array.from(counties).sort()
    } catch (error) {
      console.error('取得縣市列表失敗:', error)
      throw error
    }
  }

  /**
   * 取得統計資料
   */
  async getStatistics() {
    try {
      const allSouvenirs = await this.getAll()
      
      const statistics = {
        total: allSouvenirs.length,
        byCounty: {},
        bySource: {},
        withImage: 0,
        withCoordinates: 0,
        withWebsite: 0
      }

      allSouvenirs.forEach(souvenir => {
        // 按縣市統計
        if (souvenir.county) {
          statistics.byCounty[souvenir.county] = (statistics.byCounty[souvenir.county] || 0) + 1
        }

        // 按來源統計
        if (souvenir.source) {
          statistics.bySource[souvenir.source] = (statistics.bySource[souvenir.source] || 0) + 1
        }

        // 統計有圖片的
        if (souvenir.image) {
          statistics.withImage++
        }

        // 統計有座標的
        if (souvenir.coordinates && souvenir.coordinates.latitude && souvenir.coordinates.longitude) {
          statistics.withCoordinates++
        }

        // 統計有網站的
        if (souvenir.website) {
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
      throw new Error('伴手禮資料必須是陣列格式')
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