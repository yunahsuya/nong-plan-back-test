import { FoodModel } from '../../models/farms/FoodModel.js'

const foodModel = new FoodModel()

export class FoodController {
  // 取得所有美食
  async getAllFoods(req, res) {
    try {
      const forceRefresh = req.query.refresh === 'true'
      const foods = await foodModel.getAll(forceRefresh)
      
      res.json({
        success: true,
        data: foods,
        message: `成功取得 ${foods.length} 筆美食資料`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得美食失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得美食資料失敗',
        error: error.message
      })
    }
  }

  // 根據縣市篩選美食
  async getFoodsByCity(req, res) {
    try {
      const { city } = req.params
      const filteredFoods = await foodModel.getByCounty(city)
      
      res.json({
        success: true,
        data: filteredFoods,
        message: `找到 ${filteredFoods.length} 筆 ${city} 的美食`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據縣市篩選美食失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據縣市篩選美食失敗',
        error: error.message
      })
    }
  }

  // 根據鄉鎮篩選美食
  async getFoodsByTown(req, res) {
    try {
      const { city, town } = req.params
      const filteredFoods = await foodModel.getByTown(town)
      
      // 如果指定了縣市，進一步篩選
      const finalFoods = city ? 
        filteredFoods.filter(food => food.city === city) : 
        filteredFoods
      
      res.json({
        success: true,
        data: finalFoods,
        message: `找到 ${finalFoods.length} 筆 ${town} 的美食`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('根據鄉鎮篩選美食失敗:', error)
      res.status(500).json({
        success: false,
        message: '根據鄉鎮篩選美食失敗',
        error: error.message
      })
    }
  }

  // 搜尋美食
  async searchFoods(req, res) {
    try {
      const { keyword, city, town, credit_card, travel_card } = req.query
      const criteria = {}
      
      if (keyword) criteria.keyword = keyword
      if (city) criteria.city = city
      if (town) criteria.town = town
      if (credit_card !== undefined) criteria.credit_card = credit_card === 'true'
      if (travel_card !== undefined) criteria.travel_card = travel_card === 'true'
      
      const filteredFoods = await foodModel.search(criteria)
      
      res.json({
        success: true,
        data: filteredFoods,
        message: `搜尋到 ${filteredFoods.length} 筆符合條件的美食`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('搜尋美食失敗:', error)
      res.status(500).json({
        success: false,
        message: '搜尋美食失敗',
        error: error.message
      })
    }
  }

  // 取得美食統計資料
  async getFoodStatistics(req, res) {
    try {
      const statistics = await foodModel.getStatistics()
      
      res.json({
        success: true,
        data: statistics,
        message: '美食統計資料載入成功',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得美食統計失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得美食統計失敗',
        error: error.message
      })
    }
  }

  // 分頁取得美食
  async getPaginatedFoods(req, res) {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 9
      const { keyword, city, town, credit_card, travel_card } = req.query
      
      const criteria = {}
      if (keyword) criteria.keyword = keyword
      if (city) criteria.city = city
      if (town) criteria.town = town
      if (credit_card !== undefined) criteria.credit_card = credit_card === 'true'
      if (travel_card !== undefined) criteria.travel_card = travel_card === 'true'
      
      const result = await foodModel.getPaginated(page, limit, criteria)
      
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: `成功取得第 ${page} 頁的美食資料`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('分頁取得美食失敗:', error)
      res.status(500).json({
        success: false,
        message: '分頁取得美食資料失敗',
        error: error.message
      })
    }
  }

  // 取得縣市列表
  async getCities(req, res) {
    try {
      const cities = await foodModel.getCities()
      
      res.json({
        success: true,
        data: cities,
        message: `成功取得 ${cities.length} 個縣市`,
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

  // 取得指定縣市的鄉鎮列表
  async getTownsByCity(req, res) {
    try {
      const { city } = req.params
      const towns = await foodModel.getTownsByCity(city)
      
      res.json({
        success: true,
        data: towns,
        message: `成功取得 ${city} 的 ${towns.length} 個鄉鎮`,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('取得鄉鎮列表失敗:', error)
      res.status(500).json({
        success: false,
        message: '取得鄉鎮列表失敗',
        error: error.message
      })
    }
  }
}

// 命名導出函數
export const getPaginatedFoods = async (req, res) => {
  const controller = new FoodController()
  return await controller.getPaginatedFoods(req, res)
}

export const getAllFoods = async (req, res) => {
  const controller = new FoodController()
  return await controller.getAllFoods(req, res)
}

export const getFoodsByCity = async (req, res) => {
  const controller = new FoodController()
  return await controller.getFoodsByCity(req, res)
}

export const getFoodsByTown = async (req, res) => {
  const controller = new FoodController()
  return await controller.getFoodsByTown(req, res)
}

export const searchFoods = async (req, res) => {
  const controller = new FoodController()
  return await controller.searchFoods(req, res)
}

export const getFoodStatistics = async (req, res) => {
  const controller = new FoodController()
  return await controller.getFoodStatistics(req, res)
}

export const getCities = async (req, res) => {
  const controller = new FoodController()
  return await controller.getCities(req, res)
}

export const getTownsByCity = async (req, res) => {
  const controller = new FoodController()
  return await controller.getTownsByCity(req, res)
}