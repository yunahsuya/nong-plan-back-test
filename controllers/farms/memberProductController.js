// controllers/education/memberProductController.js
import { MemberProductModel } from '../../models/farms/MemberProductModel.js'

const memberProductModel = new MemberProductModel()

export class MemberProductController {
  // 取得所有農民學院找產品
  async getAllItems(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true'
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 12
      const keyword = req.query.keyword || ''
      const member = req.query.member || ''
      const crop = req.query.crop || ''
      const verifyMarker = req.query.verifyMarker || ''
      const category = req.query.category || ''
      const offset = (page - 1) * limit
      
      let items = await memberProductModel.getAll(forceRefresh)
      
      // 在後端進行篩選
      if (member) {
        items = items.filter(item => item.memberName === member)
      }
      
      if (crop) {
        items = items.filter(item => item.crop === crop)
      }
      
      if (verifyMarker) {
        items = items.filter(item => item.verifyMarker === verifyMarker)
      }
      
      if (category) {
        items = items.filter(item => item.category === category)
      }
      
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase()
        items = items.filter(item => 
          item.memberName?.toLowerCase().includes(lowerKeyword) ||
          item.crop?.toLowerCase().includes(lowerKeyword) ||
          item.category?.toLowerCase().includes(lowerKeyword) ||
          item.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))
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
        message: `成功取得第 ${page} 頁的 ${paginatedItems.length} 筆農民學院找產品資料`,
        cached: !forceRefresh,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得農民學院找產品失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得農民學院找產品資料失敗',
        error: error.message
      })
    }
  }

  // 根據農民姓名篩選
  async getItemsByMember(req, res) {
    try {
      const { member } = req.params
      const filteredItems = await memberProductModel.getByMember(member)
      
      res.json({
        success: true,
        data: filteredItems,
        message: `找到 ${filteredItems.length} 筆 ${member} 的產品`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據農民姓名篩選失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據農民姓名篩選失敗',
        error: error.message
      })
    }
  }

  // 根據作物篩選
  async getItemsByCrop(req, res) {
    try {
      const { crop } = req.params
      const filteredItems = await memberProductModel.getByCrop(crop)
      
      res.json({
        success: true,
        data: filteredItems,
        message: `找到 ${filteredItems.length} 筆 ${crop} 產品`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據作物篩選失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據作物篩選失敗',
        error: error.message
      })
    }
  }

  // 根據驗證標章篩選
  async getItemsByVerifyMarker(req, res) {
    try {
      const { verifyMarker } = req.params
      const filteredItems = await memberProductModel.getByVerifyMarker(verifyMarker)
      
      res.json({
        success: true,
        data: filteredItems,
        message: `找到 ${filteredItems.length} 筆 ${verifyMarker} 驗證產品`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據驗證標章篩選失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據驗證標章篩選失敗',
        error: error.message
      })
    }
  }

  // 根據分類篩選
  async getItemsByCategory(req, res) {
    try {
      const { category } = req.params
      const filteredItems = await memberProductModel.getByCategory(category)
      
      res.json({
        success: true,
        data: filteredItems,
        message: `找到 ${filteredItems.length} 筆 ${category} 產品`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據分類篩選失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據分類篩選失敗',
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

      const searchResults = await memberProductModel.search(keyword)
      
      res.json({
        success: true,
        data: searchResults,
        message: `找到 ${searchResults.length} 筆符合 "${keyword}" 的產品`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('搜尋失敗:', error)
      res.status(500).json({
        success: false,
        message: '搜尋失敗',
        error: error.message
      })
    }
  }

  // 取得農民列表
  async getMembers(req, res) {
    try {
      const members = await memberProductModel.getMembers()
      
      res.json({
        success: true,
        data: members,
        message: `取得 ${members.length} 個農民`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得農民列表失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得農民列表失敗',
        error: error.message
      })
    }
  }

  // 取得作物列表
  async getCrops(req, res) {
    try {
      const crops = await memberProductModel.getCrops()
      
      res.json({
        success: true,
        data: crops,
        message: `取得 ${crops.length} 種作物`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得作物列表失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得作物列表失敗',
        error: error.message
      })
    }
  }

  // 取得驗證標章列表
  async getVerifyMarkers(req, res) {
    try {
      const verifyMarkers = await memberProductModel.getVerifyMarkers()
      
      res.json({
        success: true,
        data: verifyMarkers,
        message: `取得 ${verifyMarkers.length} 種驗證標章`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得驗證標章列表失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得驗證標章列表失敗',
        error: error.message
      })
    }
  }

  // 取得分類列表
  async getCategories(req, res) {
    try {
      const categories = await memberProductModel.getCategories()
      
      res.json({
        success: true,
        data: categories,
        message: `取得 ${categories.length} 個分類`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得分類列表失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得分類列表失敗',
        error: error.message
      })
    }
  }

  // 取得統計資料
  async getStatistics(req, res) {
    try {
      const statistics = await memberProductModel.getStatistics()
      
      res.json({
        success: true,
        data: statistics,
        message: '取得農民學院找產品統計資料成功',
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
      await memberProductModel.clearCache()
      
      res.json({
        success: true,
        message: '農民學院找產品快取已清除'
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
      const cacheStatus = await memberProductModel.getCacheStatus()
      
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
const controller = new MemberProductController()

export const getAllItems = controller.getAllItems.bind(controller)
export const getItemsByMember = controller.getItemsByMember.bind(controller)
export const getItemsByCrop = controller.getItemsByCrop.bind(controller)
export const getItemsByVerifyMarker = controller.getItemsByVerifyMarker.bind(controller)
export const getItemsByCategory = controller.getItemsByCategory.bind(controller)
export const searchItems = controller.searchItems.bind(controller)
export const getMembers = controller.getMembers.bind(controller)
export const getCrops = controller.getCrops.bind(controller)
export const getVerifyMarkers = controller.getVerifyMarkers.bind(controller)
export const getCategories = controller.getCategories.bind(controller)
export const getStatistics = controller.getStatistics.bind(controller)
export const clearCache = controller.clearCache.bind(controller)
export const getCacheStatus = controller.getCacheStatus.bind(controller)