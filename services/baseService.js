import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'

const CACHE_DIR = './cache'
const CACHE_DURATION = 60 * 60 * 1000 // 1小時

export class BaseAPIService {
  constructor(apiUrl, cachePrefix, timeout = 10000) {
    this.apiUrl = apiUrl
    this.cachePrefix = cachePrefix
    this.timeout = timeout
    this.cacheFile = path.join(CACHE_DIR, `${cachePrefix}.json`)
    this.configFile = path.join(CACHE_DIR, `${cachePrefix}-config.json`)
  }

  async fetchData(forceRefresh = false) {
    try {
      // 檢查快取
      if (!forceRefresh) {
        const cachedData = await this.getCachedData()
        if (cachedData) {
          return cachedData
        }
      }


      const response = await axios.get(this.apiUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NongPlan/1.0)'
        }
      })

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error(`農業部${this.cachePrefix}服務回傳資料格式不正確`)
      }

      const data = response.data

      // 儲存快取
      await this.saveCacheData(data)

      return data
    } catch (error) {
      console.error(`❌ 取得${this.cachePrefix}資料失敗:`, error.message)

      if (error.code === 'ECONNABORTED') {
        throw new Error(`農業部${this.cachePrefix}服務連線超時`)
      } else if (error.response?.status >= 400) {
        throw new Error(`農業部${this.cachePrefix}服務錯誤: ${error.response.status}`)
      } else {
        throw new Error(`農業部${this.cachePrefix}服務暫時無法使用: ${error.message}`)
      }
    }
  }

  async refreshCache() {
    return await this.fetchData(true)
  }

  // 快取相關輔助函數
  async getCachedData() {
    try {
      const configExists = await this.fileExists(this.configFile)
      const dataExists = await this.fileExists(this.cacheFile)

      if (!configExists || !dataExists) {
        return null
      }

      const config = JSON.parse(await fs.readFile(this.configFile, 'utf8'))
      const now = Date.now()

      if (now - config.timestamp > CACHE_DURATION) {
        return null
      }

      const data = JSON.parse(await fs.readFile(this.cacheFile, 'utf8'))
      return data
    } catch (error) {
      return null
    }
  }

  async saveCacheData(data) {
    try {
      // 確保快取目錄存在
      await fs.mkdir(CACHE_DIR, { recursive: true })

      // 儲存資料
      await fs.writeFile(this.cacheFile, JSON.stringify(data, null, 2))

      // 儲存快取設定
      const config = {
        timestamp: Date.now(),
        count: data.length,
        lastUpdate: new Date().toISOString()
      }
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2))

    } catch (error) {
      console.error(`❌ 儲存${this.cachePrefix}快取失敗:`, error.message)
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }
}