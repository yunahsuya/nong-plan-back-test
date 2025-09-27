import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 基礎 Model 類別
 * 提供共用的快取、檔案操作等功能
 */
export class BaseModel {
  constructor(modelName, cacheDir = path.join(__dirname, '../cache/education')) {
    this.modelName = modelName
    this.cacheDir = cacheDir
    this.cacheFile = path.join(cacheDir, `${modelName}.json`)
    this.cacheConfigFile = path.join(cacheDir, `${modelName}-config.json`)
  }

  /**
   * 確保快取目錄存在
   */
  async ensureCacheDir() {
    await fs.mkdir(this.cacheDir, { recursive: true })
  }

  /**
   * 儲存資料到快取
   */
  async saveToCache(data) {
    try {
      await this.ensureCacheDir()
      
      const jsonData = JSON.stringify(data, null, 2)
      if (jsonData.length > 20 * 1024 * 1024) {
        throw new Error('Cache data too large')
      }
      await fs.writeFile(this.cacheFile, jsonData, 'utf8')

      const cacheConfig = {
        enabled: true,
        ttl: 3600000, // 1 小時
        lastUpdate: new Date().toISOString(),
        dataCount: data.length
      }
      await fs.writeFile(this.cacheConfigFile, JSON.stringify(cacheConfig, null, 2), 'utf8')
      
      console.log(`📦 ${this.modelName} 資料已儲存到快取檔案`)
    } catch (error) {
      console.error(`❌ 儲存 ${this.modelName} 快取檔案失敗:`, error.message)
      throw error
    }
  }

  /**
   * 從快取讀取資料
   */
  async loadFromCache() {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.log(`⚠️ 無法讀取 ${this.modelName} 快取檔案`)
      return null
    }
  }

  /**
   * 檢查快取是否有效
   */
  async isCacheValid() {
    try {
      const configData = await fs.readFile(this.cacheConfigFile, 'utf8')
      const config = JSON.parse(configData)
      
      if (!config.enabled) return false
      
      const lastUpdate = new Date(config.lastUpdate)
      const now = new Date()
      const ttl = config.ttl || 3600000
      
      return (now - lastUpdate) < ttl
    } catch (error) {
      return false
    }
  }

  /**
   * 清除快取
   */
  async clearCache() {
    try {
      await this.ensureCacheDir()
      
      try {
        await fs.unlink(this.cacheFile)
        console.log(`✅ ${this.modelName} 資料快取已清除`)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
      
      try {
        await fs.unlink(this.cacheConfigFile)
        console.log(`✅ ${this.modelName} 快取配置已清除`)
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error
        }
      }
    } catch (error) {
      console.error(`❌ 清除 ${this.modelName} 快取失敗:`, error.message)
      throw error
    }
  }

  /**
   * 取得快取狀態
   */
  async getCacheStatus() {
    try {
      const isValid = await this.isCacheValid()
      const cachedData = await this.loadFromCache()
      
      return {
        isValid,
        hasCache: !!cachedData,
        dataCount: cachedData ? cachedData.length : 0,
        lastUpdate: cachedData ? (await fs.readFile(this.cacheConfigFile, 'utf8').then(data => JSON.parse(data).lastUpdate)) : null
      }
    } catch (error) {
      return {
        isValid: false,
        hasCache: false,
        dataCount: 0,
        lastUpdate: null
      }
    }
  }

  /**
   * 驗證資料格式（子類別需實作）
   */
  validateData(data) {
    throw new Error('validateData method must be implemented by subclass')
  }

  /**
   * 轉換資料格式（子類別需實作）
   */
  transformData(rawData) {
    throw new Error('transformData method must be implemented by subclass')
  }
}