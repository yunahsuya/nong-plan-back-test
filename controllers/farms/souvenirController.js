// controllers/farms/souvenirController.js
import { SouvenirModel } from '../../models/farms/SouvenirModel.js'

const souvenirModel = new SouvenirModel()

export class SouvenirController {
  // 取得所有伴手禮
  async getAllSouvenirs(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true'
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 12
      const keyword = req.query.keyword || ''
      const county = req.query.county || ''
      const offset = (page - 1) * limit
      
      let souvenirs = await souvenirModel.getAll(forceRefresh)
      
      // 在後端進行篩選
      if (county) {
        souvenirs = souvenirs.filter(item => item.county === county)
      }
      
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase()
        souvenirs = souvenirs.filter(item => 
          item.name?.toLowerCase().includes(lowerKeyword) ||
          item.county?.toLowerCase().includes(lowerKeyword) ||
          item.feature?.toLowerCase().includes(lowerKeyword) ||
          item.salePlace?.toLowerCase().includes(lowerKeyword) ||
          item.produceOrg?.toLowerCase().includes(lowerKeyword)
        )
      }
      
      // 分頁處理
      const paginatedSouvenirs = souvenirs.slice(offset, offset + limit)
      const totalPages = Math.ceil(souvenirs.length / limit)
      
      res.json({
        success: true,
        data: paginatedSouvenirs,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: souvenirs.length,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          startItem: souvenirs.length > 0 ? offset + 1 : 0,
          endItem: Math.min(offset + limit, souvenirs.length)
        },
        message: `成功取得第 ${page} 頁的 ${paginatedSouvenirs.length} 筆伴手禮資料`,
        cached: !forceRefresh,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得伴手禮失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得伴手禮資料失敗',
        error: error.message
      })
    }
  }

  // 根據縣市篩選伴手禮
  async getSouvenirsByCounty(req, res) {
    try {
      const { county } = req.params
      const filteredSouvenirs = await souvenirModel.getByCounty(county)
      
      res.json({
        success: true,
        data: filteredSouvenirs,
        message: `找到 ${filteredSouvenirs.length} 筆 ${county} 的伴手禮`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據縣市篩選伴手禮失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據縣市篩選伴手禮失敗',
        error: error.message
      })
    }
  }

  // 搜尋伴手禮
  async searchSouvenirs(req, res) {
    try {
      const { keyword } = req.query
      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: '請提供搜尋關鍵字'
        })
      }

      const searchResults = await souvenirModel.search(keyword)
      
      res.json({
        success: true,
        data: searchResults,
        message: `找到 ${searchResults.length} 筆符合 "${keyword}" 的伴手禮`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('搜尋伴手禮失敗:', error)
      res.status(500).json({
        success: false,
        message: '搜尋伴手禮失敗',
        error: error.message
      })
    }
  }

  // 取得縣市列表
  async getCounties(req, res) {
    try {
      const counties = await souvenirModel.getCounties()
      
      res.json({
        success: true,
        data: counties,
        message: `取得 ${counties.length} 個縣市`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得縣市列表失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得縣市列表失敗',
        error: error.message
      })
    }
  }

  // 取得統計資料
  async getStatistics(req, res) {
    try {
      const statistics = await souvenirModel.getStatistics()
      
      res.json({
        success: true,
        data: statistics,
        message: '取得伴手禮統計資料成功',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得統計資料失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得統計資料失敗',
        error: error.message
      })
    }
  }

  // 清除快取
  async clearCache(req, res) {
    try {
      await souvenirModel.clearCache()
      
      res.json({
        success: true,
        message: '伴手禮快取已清除'
      })
    } catch (error) {
      console.error('清除快取失敗:', error)
      res.status(500).json({
        success: false,
        message: '清除快取失敗',
        error: error.message
      })
    }
  }

  

  // 取得快取狀態
  async getCacheStatus(req, res) {
    try {
      const cacheStatus = await souvenirModel.getCacheStatus()
      
      res.json({
        success: true,
        data: cacheStatus,
        message: '取得快取狀態成功'
      })
    } catch (error) {
      console.error('取得快取狀態失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得快取狀態失敗',
        error: error.message
      })
    }
  }
}

// 建立控制器實例並匯出函數
const controller = new SouvenirController()

export const getAllSouvenirs = controller.getAllSouvenirs.bind(controller)
export const getSouvenirsByCounty = controller.getSouvenirsByCounty.bind(controller)
export const searchSouvenirs = controller.searchSouvenirs.bind(controller)
export const getCounties = controller.getCounties.bind(controller)
export const getStatistics = controller.getStatistics.bind(controller)
export const clearCache = controller.clearCache.bind(controller)
export const getCacheStatus = controller.getCacheStatus.bind(controller)