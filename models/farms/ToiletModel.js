// nong-plan-back-test/models/farms/ToiletModel.js
import { BaseModel } from '../BaseModel.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class ToiletModel extends BaseModel {
  constructor() {
    super()
    this.cacheFile = path.join(__dirname, '../../cache/farms/toilets.json')
    this.configFile = path.join(__dirname, '../../cache/farms/toilets-config.json')
    this.cacheValidDuration = 24 * 60 * 60 * 1000 // 24小時
  }

  /**
   * 處理廁所原始資料
   */
  async processData(rawData) {
    try {
      console.log('🔄 開始處理廁所資料...')
      
      const processedData = rawData.map((toilet, index) => ({
        id: `toilet-${index + 1}`,
        項次: toilet.項次 || (index + 1).toString(),
        地點: toilet.地點 || '',
        容納人數: toilet.容納人數 || '',
        category: '廁所',
        tags: ['農科園區', '公共廁所'],
        accessibleFeatures: ['無障礙廁所']
      })).filter(toilet => toilet.地點 && toilet.地點.trim() !== '')

      console.log(`✅ 成功處理 ${processedData.length} 筆廁所資料`)
      
      // 儲存處理後的資料
      await this.saveToCache(processedData)
      
      return processedData
    } catch (error) {
      console.error('❌ 處理廁所資料失敗:', error)
      throw error
    }
  }

  /**
   * 搜尋廁所
   */
  async search(criteria = {}) {
    try {
      const allData = await this.getAll()
      let results = [...allData]

      if (criteria.location) {
        results = results.filter(toilet => 
          toilet.地點.toLowerCase().includes(criteria.location.toLowerCase())
        )
      }

      return results
    } catch (error) {
      console.error('❌ 搜尋廁所失敗:', error)
      throw error
    }
  }

  /**
   * 取得無障礙廁所
   */
  async getAccessibleToilets() {
    try {
      const allData = await this.getAll()
      return allData.filter(toilet => 
        toilet.accessibleFeatures && toilet.accessibleFeatures.length > 0
      )
    } catch (error) {
      console.error('❌ 取得無障礙廁所失敗:', error)
      throw error
    }
  }
}
