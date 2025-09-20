import { BaseAPIService } from './baseService.js'

// 農業部開放資料 API - 農作物時價資訊
const MOA_PRICES_API_URL = 'https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx?IsTransData=1&UnitId=037'

class PriceService extends BaseAPIService {
  constructor() {
    super(MOA_PRICES_API_URL, 'prices', 15000)
  }

  async getAllPrices(forceRefresh = false) {
    return await this.fetchData(forceRefresh)
  }

  async filterByCrop(cropName, forceRefresh = false) {
    try {
      const prices = await this.getAllPrices(forceRefresh)

      const filtered = prices.filter(price => {
        return price.作物名稱 && price.作物名稱.includes(cropName)
      })

      return filtered
    } catch (error) {
      throw error
    }
  }

  async filterByMarket(marketName, forceRefresh = false) {
    try {
      const prices = await this.getAllPrices(forceRefresh)

      const filtered = prices.filter(price => {
        return price.市場名稱 && price.市場名稱.includes(marketName)
      })

      return filtered
    } catch (error) {
      throw error
    }
  }

  async refreshCache() {
    return await super.refreshCache()
  }
}

// 導出單例
export const priceService = new PriceService()

// 為了向後相容，也導出原有的函數名稱
export const fetchPricesFromMOA = (forceRefresh = false) => priceService.getAllPrices(forceRefresh)
export const filterPricesByCrop = (cropName, forceRefresh = false) => priceService.filterByCrop(cropName, forceRefresh)
export const filterPricesByMarket = (marketName, forceRefresh = false) => priceService.filterByMarket(marketName, forceRefresh)
export const refreshPricesCache = () => priceService.refreshCache()