// models/education/MemberProductModel.js
import axios from 'axios'
import { BaseModel } from '../BaseModel.js'

/**
 * 農民學院找產品 Model
 */
export class MemberProductModel extends BaseModel {
  constructor() {
    super('member-product', 'cache')
  }

  // MOA 農民學院找產品 API URL
  static MOA_API_URL = 'https://data.moa.gov.tw/Service/OpenData/MemberProductData.aspx?IsTransData=1&UnitId=173'

  /**
   * 從 MOA API 取得農民學院找產品資料
   */
  async fetchFromAPI() {
    try {
      console.log('🌐 正在從 MOA API 取得農民學院找產品資料...')
      const response = await axios.get(MemberProductModel.MOA_API_URL, {
        timeout: 30000
      })

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('API 回應格式錯誤')
      }

      console.log(`✅ 成功取得 ${response.data.length} 筆農民學院找產品資料`)
      const transformedData = this.transformData(response.data)
      await this.saveToCache(transformedData)
      
      return transformedData
    } catch (error) {
      console.error('❌ 從 MOA API 取得農民學院找產品資料失敗:', error.message)
      throw error
    }
  }

  /**
   * 轉換農民學院找產品資料格式
   */
  transformData(rawData) {
    return rawData.map(item => ({
      id: `member-product-${item.member_name}-${item.crop}`.replace(/\s+/g, '-').replace(/[^\w\-]/g, ''),
      memberName: item.member_name || '',
      crop: item.crop || '',
      verifyMarker: item.verify_marker || '',
      yield: parseInt(item.yield) || 0,
      season: this.parseSeason(item.season),
      shipmentsMin: parseInt(item.shipments_min) || 0,
      category: this.getCategoryFromVerifyMarker(item.verify_marker),
      tags: this.generateTags(item),
      source: '農民學院找產品',
      isAvailable: this.checkAvailability(item.season)
    })).filter(item => item.memberName && item.crop)
  }

  /**
   * 解析季節資料
   */
  parseSeason(seasonString) {
    if (!seasonString) return []
    
    const monthMap = {
      '01': '一月', '02': '二月', '03': '三月', '04': '四月',
      '05': '五月', '06': '六月', '07': '七月', '08': '八月',
      '09': '九月', '10': '十月', '11': '十一月', '12': '十二月',
      '13': '全年'
    }

    if (seasonString === '13') {
      return ['全年']
    }

    return seasonString.split(',').map(month => monthMap[month] || month).filter(Boolean)
  }

  /**
   * 根據驗證標章取得分類
   */
  getCategoryFromVerifyMarker(verifyMarker) {
    const categoryMap = {
      'TAP': '產銷履歷',
      'organic': '有機認證',
      'preorganic': '有機轉型期',
      'NOpesticide': '無農藥'
    }
    return categoryMap[verifyMarker] || '其他'
  }

  /**
   * 產生標籤
   */
  generateTags(item) {
    const tags = []
    
    // 驗證標章標籤
    const verifyTags = {
      'TAP': '產銷履歷',
      'organic': '有機',
      'preorganic': '轉型期',
      'NOpesticide': '無農藥'
    }
    if (verifyTags[item.verify_marker]) {
      tags.push(verifyTags[item.verify_marker])
    }

    // 產量標籤
    if (item.yield >= 10000) {
      tags.push('大宗產量')
    } else if (item.yield >= 1000) {
      tags.push('中量產')
    } else {
      tags.push('小量產')
    }

    // 季節標籤
    if (item.season === '13') {
      tags.push('全年供應')
    } else {
      tags.push('季節性')
    }

    return tags
  }

  /**
   * 檢查產品是否可用（根據季節）
   */
  checkAvailability(seasonString) {
    if (seasonString === '13') return true
    
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const availableMonths = seasonString.split(',')
    
    return availableMonths.includes(currentMonth)
  }

  /**
   * 取得所有農民學院找產品資料
   */
  async getAll(forceRefresh = false) {
    try {
      // 檢查快取
      if (!forceRefresh && await this.isCacheValid()) {
        console.log('📖 從快取載入農民學院找產品資料')
        const cachedData = await this.loadFromCache()
        if (cachedData) {
          return cachedData
        }
      }

      // 從 API 取得資料
      console.log('🔄 重新從 API 取得農民學院找產品資料')
      return await this.fetchFromAPI()
    } catch (error) {
      console.error('取得農民學院找產品資料失敗:', error)
      
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
   * 根據農民姓名篩選
   */
  async getByMember(memberName) {
    try {
      const allItems = await this.getAll()
      return allItems.filter(item => 
        item.memberName === memberName || 
        (item.memberName && item.memberName.includes(memberName))
      )
    } catch (error) {
      console.error('根據農民姓名篩選失敗:', error)
      throw error
    }
  }

  /**
   * 根據作物篩選
   */
  async getByCrop(crop) {
    try {
      const allItems = await this.getAll()
      return allItems.filter(item => 
        item.crop === crop || 
        (item.crop && item.crop.includes(crop))
      )
    } catch (error) {
      console.error('根據作物篩選失敗:', error)
      throw error
    }
  }

  /**
   * 根據驗證標章篩選
   */
  async getByVerifyMarker(verifyMarker) {
    try {
      const allItems = await this.getAll()
      return allItems.filter(item => 
        item.verifyMarker === verifyMarker || 
        (item.verifyMarker && item.verifyMarker.includes(verifyMarker))
      )
    } catch (error) {
      console.error('根據驗證標章篩選失敗:', error)
      throw error
    }
  }

  /**
   * 根據分類篩選
   */
  async getByCategory(category) {
    try {
      const allItems = await this.getAll()
      return allItems.filter(item => 
        item.category === category || 
        (item.category && item.category.includes(category))
      )
    } catch (error) {
      console.error('根據分類篩選失敗:', error)
      throw error
    }
  }

  /**
   * 搜尋農民學院找產品
   */
  async search(keyword) {
    try {
      const allItems = await this.getAll()
      const lowerKeyword = keyword.toLowerCase()
      
      return allItems.filter(item => 
        item.memberName.toLowerCase().includes(lowerKeyword) ||
        item.crop.toLowerCase().includes(lowerKeyword) ||
        item.category.toLowerCase().includes(lowerKeyword) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
      )
    } catch (error) {
      console.error('搜尋農民學院找產品失敗:', error)
      throw error
    }
  }

  /**
   * 取得農民列表
   */
  async getMembers() {
    try {
      const allItems = await this.getAll()
      const members = new Set()
      
      allItems.forEach(item => {
        if (item.memberName) {
          members.add(item.memberName)
        }
      })
      
      return Array.from(members).sort()
    } catch (error) {
      console.error('取得農民列表失敗:', error)
      throw error
    }
  }

  /**
   * 取得作物列表
   */
  async getCrops() {
    try {
      const allItems = await this.getAll()
      const crops = new Set()
      
      allItems.forEach(item => {
        if (item.crop) {
          crops.add(item.crop)
        }
      })
      
      return Array.from(crops).sort()
    } catch (error) {
      console.error('取得作物列表失敗:', error)
      throw error
    }
  }

  /**
   * 取得驗證標章列表
   */
  async getVerifyMarkers() {
    try {
      const allItems = await this.getAll()
      const verifyMarkers = new Set()
      
      allItems.forEach(item => {
        if (item.verifyMarker) {
          verifyMarkers.add(item.verifyMarker)
        }
      })
      
      return Array.from(verifyMarkers).sort()
    } catch (error) {
      console.error('取得驗證標章列表失敗:', error)
      throw error
    }
  }

  /**
   * 取得分類列表
   */
  async getCategories() {
    try {
      const allItems = await this.getAll()
      const categories = new Set()
      
      allItems.forEach(item => {
        if (item.category) {
          categories.add(item.category)
        }
      })
      
      return Array.from(categories).sort()
    } catch (error) {
      console.error('取得分類列表失敗:', error)
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
        byMember: {},
        byCrop: {},
        byVerifyMarker: {},
        byCategory: {},
        byYield: {
          high: 0,    // >= 10000
          medium: 0,  // 1000-9999
          low: 0      // < 1000
        },
        available: 0,
        seasonal: 0
      }

      allItems.forEach(item => {
        // 按農民統計
        if (item.memberName) {
          statistics.byMember[item.memberName] = (statistics.byMember[item.memberName] || 0) + 1
        }

        // 按作物統計
        if (item.crop) {
          statistics.byCrop[item.crop] = (statistics.byCrop[item.crop] || 0) + 1
        }

        // 按驗證標章統計
        if (item.verifyMarker) {
          statistics.byVerifyMarker[item.verifyMarker] = (statistics.byVerifyMarker[item.verifyMarker] || 0) + 1
        }

        // 按分類統計
        if (item.category) {
          statistics.byCategory[item.category] = (statistics.byCategory[item.category] || 0) + 1
        }

        // 按產量統計
        if (item.yield >= 10000) {
          statistics.byYield.high++
        } else if (item.yield >= 1000) {
          statistics.byYield.medium++
        } else {
          statistics.byYield.low++
        }

        // 可用性統計
        if (item.isAvailable) {
          statistics.available++
        }

        if (item.season.length > 0 && !item.season.includes('全年')) {
          statistics.seasonal++
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
      throw new Error('農民學院找產品資料必須是陣列格式')
    }

    data.forEach((item, index) => {
      if (!item.memberName) {
        throw new Error(`第 ${index + 1} 筆資料缺少農民姓名`)
      }
      if (!item.crop) {
        throw new Error(`第 ${index + 1} 筆資料缺少作物名稱`)
      }
    })

    return true
  }
}