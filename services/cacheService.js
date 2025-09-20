import fs from 'fs/promises'
import path from 'path'

const CACHE_DIR = './cache'
const CACHE_DURATION = 60 * 60 * 1000 // 1小時

// 通用快取管理類
class CacheManager {
  constructor(cacheType) {
    this.cacheType = cacheType
    this.cacheFile = path.join(CACHE_DIR, `${cacheType}.json`)
    this.configFile = path.join(CACHE_DIR, `${cacheType}-config.json`)
  }

  async getStatus() {
    try {
      const configExists = await fileExists(this.configFile)
      const dataExists = await fileExists(this.cacheFile)

      if (!configExists || !dataExists) {
        return {
          cached: false,
          message: `沒有${this.cacheType}快取資料`
        }
      }

      const config = JSON.parse(await fs.readFile(this.configFile, 'utf8'))
      const now = Date.now()
      const age = now - config.timestamp
      const isExpired = age > CACHE_DURATION

      const stats = await fs.stat(this.cacheFile)

      return {
        cached: true,
        expired: isExpired,
        count: config.count || 0,
        lastUpdate: config.lastUpdate,
        ageInMinutes: Math.floor(age / (1000 * 60)),
        maxAgeInMinutes: Math.floor(CACHE_DURATION / (1000 * 60)),
        fileSizeKB: Math.floor(stats.size / 1024),
        nextRefreshIn: isExpired ? 0 : Math.floor((CACHE_DURATION - age) / (1000 * 60))
      }
    } catch (error) {
      return {
        cached: false,
        error: error.message,
        message: `讀取${this.cacheType}快取狀態失敗`
      }
    }
  }

  async clear() {
    try {
      const files = [this.cacheFile, this.configFile]

      for (const file of files) {
        if (await fileExists(file)) {
          await fs.unlink(file)
        }
      }

      return true
    } catch (error) {
      console.error(`❌ 清除${this.cacheType}快取失敗:`, error.message)
      throw new Error(`清除${this.cacheType}快取失敗: ${error.message}`)
    }
  }
}

// 農場快取管理器
const farmCacheManager = new CacheManager('farms')
// 時價快取管理器
const priceCacheManager = new CacheManager('prices')

// 導出農場快取相關函數 (向後相容)
export const getCacheStatus = () => farmCacheManager.getStatus()
export const clearCache = () => farmCacheManager.clear()

// 導出時價快取相關函數
export const getPriceCacheStatus = () => priceCacheManager.getStatus()
export const clearPriceCache = () => priceCacheManager.clear()

// 清除所有快取
export const clearAllCache = async () => {
  try {
    await farmCacheManager.clear()
    await priceCacheManager.clear()

    // 如果快取目錄為空，也刪除它
    try {
      const items = await fs.readdir(CACHE_DIR)
      if (items.length === 0) {
        await fs.rmdir(CACHE_DIR)
      }
    } catch {
      // 目錄可能不存在或不為空，忽略錯誤
    }

    return true
  } catch (error) {
    console.error('❌ 清除所有快取失敗:', error.message)
    throw new Error(`清除所有快取失敗: ${error.message}`)
  }
}

// 輔助函數
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}