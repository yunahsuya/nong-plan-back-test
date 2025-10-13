// controllers/agriBestItemController.js
import { AgriBestItemModel } from '../../models/farms/AgriBestItemModel.js'

const agriBestItemModel = new AgriBestItemModel()

export class AgriBestItemController {
  // 取得所有農漁會年度百大農業精品好禮
  async getAllItems(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true'
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 12
      const keyword = req.query.keyword || ''
      const county = req.query.county || ''
      const type = req.query.type || ''
      const offset = (page - 1) * limit
      
      let items = await agriBestItemModel.getAll(forceRefresh)
      
      // 在後端進行篩選
      if (county) {
        items = items.filter(item => item.county === county)
      }
      
      if (type) {
        items = items.filter(item => item.type === type)
      }
      
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase()
        items = items.filter(item => 
          item.name?.toLowerCase().includes(lowerKeyword) ||
          item.type?.toLowerCase().includes(lowerKeyword) ||
          item.description?.toLowerCase().includes(lowerKeyword) ||
          item.county?.toLowerCase().includes(lowerKeyword) ||
          item.organization?.toLowerCase().includes(lowerKeyword)
        )
      }
      
      // 分頁處理
      const paginatedItems = items.slice(offset, offset + limit)
      const totalPages = Math.ceil(items.length / limit)
      
      res.json({
        success: true,
        data: paginatedItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: items.length,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          startItem: items.length > 0 ? offset + 1 : 0,
          endItem: Math.min(offset + limit, items.length)
        },
        message: `成功取得第 ${page} 頁的 ${paginatedItems.length} 筆農漁會年度百大農業精品好禮資料`,
        cached: !forceRefresh,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得農漁會年度百大農業精品好禮失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得農漁會年度百大農業精品好禮資料失敗',
        error: error.message
      })
    }
  }

  // 根據縣市篩選
  async getItemsByCounty(req, res) {
    try {
      const { county } = req.params
      const filteredItems = await agriBestItemModel.getByCounty(county)
      
      res.json({
        success: true,
        data: filteredItems,
        message: `找到 ${filteredItems.length} 筆 ${county} 的農漁會年度百大農業精品好禮`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據縣市篩選農漁會年度百大農業精品好禮失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據縣市篩選農漁會年度百大農業精品好禮失敗',
        error: error.message
      })
    }
  }

  // 根據類型篩選
  async getItemsByType(req, res) {
    try {
      const { type } = req.params
      const filteredItems = await agriBestItemModel.getByType(type)
      
      res.json({
        success: true,
        data: filteredItems,
        message: `找到 ${filteredItems.length} 筆 ${type} 類型的農漁會年度百大農業精品好禮`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據類型篩選農漁會年度百大農業精品好禮失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據類型篩選農漁會年度百大農業精品好禮失敗',
        error: error.message
      })
    }
  }

  // 搜尋
  async searchItems(req, res) {
    try {
      const { keyword } = req.query
      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: '請提供搜尋關鍵字'
        })
      }

      const searchResults = await agriBestItemModel.search(keyword)
      
      res.json({
        success: true,
        data: searchResults,
        message: `找到 ${searchResults.length} 筆符合 "${keyword}" 的農漁會年度百大農業精品好禮`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('搜尋農漁會年度百大農業精品好禮失敗:', error)
      res.status(500).json({
        success: false,
        message: '搜尋農漁會年度百大農業精品好禮失敗',
        error: error.message
      })
    }
  }

  // 取得縣市列表
  async getCounties(req, res) {
    try {
      const counties = await agriBestItemModel.getCounties()
      
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

  // 取得類型列表
  async getTypes(req, res) {
    try {
      const types = await agriBestItemModel.getTypes()
      
      res.json({
        success: true,
        data: types,
        message: `取得 ${types.length} 個類型`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得類型列表失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得類型列表失敗',
        error: error.message
      })
    }
  }

  // 取得統計資料
  async getStatistics(req, res) {
    try {
      const statistics = await agriBestItemModel.getStatistics()
      
      res.json({
        success: true,
        data: statistics,
        message: '取得農漁會年度百大農業精品好禮統計資料成功',
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
      await agriBestItemModel.clearCache()
      
      res.json({
        success: true,
        message: '農漁會年度百大農業精品好禮快取已清除'
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
      const cacheStatus = await agriBestItemModel.getCacheStatus()
      
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
const controller = new AgriBestItemController()

export const getAllItems = controller.getAllItems.bind(controller)
export const getItemsByCounty = controller.getItemsByCounty.bind(controller)
export const getItemsByType = controller.getItemsByType.bind(controller)
export const searchItems = controller.searchItems.bind(controller)
export const getCounties = controller.getCounties.bind(controller)
export const getTypes = controller.getTypes.bind(controller)
export const getStatistics = controller.getStatistics.bind(controller)
export const clearCache = controller.clearCache.bind(controller)
export const getCacheStatus = controller.getCacheStatus.bind(controller)