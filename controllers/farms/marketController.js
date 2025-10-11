import { marketModel } from '../../index.js'

export class MarketController {
  // 取得所有農民市集
  async getAllMarkets(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true'
      const markets = await marketModel.getAll(forceRefresh)
      
      res.json({
        success: true,
        data: markets,
        message: `成功取得 ${markets.length} 筆農民市集資料`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得農民市集失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得農民市集資料失敗',
        error: error.message
      })
    }
  }

  // 根據驗證標章篩選市集
  async getMarketsByCertification(req, res) {
    try {
      const { certification } = req.params
      const filteredMarkets = await marketModel.getByCertification(certification)
      
      res.json({
        success: true,
        data: filteredMarkets,
        message: `找到 ${filteredMarkets.length} 筆具有 ${certification} 認證的市集`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('篩選市集失敗:', error)
      res.status(500).json({
        success: false,
        message: '篩選市集資料失敗',
        error: error.message
      })
    }
  }

  // 搜尋市集
  async searchMarkets(req, res) {
    try {
      const { keyword, certification } = req.query
      const filteredMarkets = await marketModel.search({ keyword, certification })
      
      res.json({
        success: true,
        data: filteredMarkets,
        message: `搜尋到 ${filteredMarkets.length} 筆符合條件的市集`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('搜尋市集失敗:', error)
      res.status(500).json({
        success: false,
        message: '搜尋市集失敗',
        error: error.message
      })
    }
  }

  // 取得市集統計資料
  async getMarketStatistics(req, res) {
    try {
      const statistics = await marketModel.getStatistics()
      
      res.json({
        success: true,
        data: statistics,
        message: '市集統計資料載入成功',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得市集統計失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得市集統計失敗',
        error: error.message
      })
    }
  }

  // 分頁取得市集
  async getPaginatedMarkets(req, res) {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 9
      const { keyword, certification } = req.query
      
      const criteria = {}
      if (keyword) criteria.keyword = keyword
      if (certification) criteria.certification = certification
      
      const result = await marketModel.getPaginated(page, limit, criteria)
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `成功取得第 ${page} 頁的市集資料`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('分頁取得市集失敗:', error)
      res.status(500).json({
        success: false,
        message: '分頁取得市集資料失敗',
        error: error.message
      })
    }
  }
}

// 命名導出函數
export const getPaginatedMarkets = async (req, res) => {
  const controller = new MarketController()
  return await controller.getPaginatedMarkets(req, res)
}

export const getAllMarkets = async (req, res) => {
  const controller = new MarketController()
  return await controller.getAllMarkets(req, res)
}

export const getMarketsByCertification = async (req, res) => {
  const controller = new MarketController()
  return await controller.getMarketsByCertification(req, res)
}

export const searchMarkets = async (req, res) => {
  const controller = new MarketController()
  return await controller.searchMarkets(req, res)
}

export const getMarketStatistics = async (req, res) => {
  const controller = new MarketController()
  return await controller.getMarketStatistics(req, res)
}

// 新增：根據縣市篩選市集
export const getMarketsByCounty = async (req, res) => {
  try {
    const { county } = req.params
    const markets = await marketModel.getByCounty(county)
    
    res.json({
      success: true,
      data: markets,
      message: `找到 ${markets.length} 筆 ${county} 的市集`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('根據縣市篩選市集失敗:', error)
    res.status(500).json({
      success: false,
      message: '根據縣市篩選市集失敗',
      error: error.message
    })
  }
}

// 新增：取得縣市列表
export const getCounties = async (req, res) => {
  try {
    const counties = await marketModel.getCounties()
    
    res.json({
      success: true,
      data: counties,
      message: `成功取得 ${counties.length} 個縣市`,
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