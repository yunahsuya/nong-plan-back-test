import { BaseAPIService } from "./baseService.js";

// 農業部開放資料 API - 無障礙休閒農場
const MOA_FARMS_API_URL =
  "https://data.moa.gov.tw/Service/OpenData/ODwsv/ODwsvAccessibleFarm.aspx?&UnitId=241";

class FarmService extends BaseAPIService {
  constructor() {
    super(MOA_FARMS_API_URL, "farms", 10000);
  }

  async getAllFarms(forceRefresh = false) {
    return await this.fetchData(forceRefresh);
  }

  async filterByCounty(county, forceRefresh = false) {
    try {
      const farms = await this.getAllFarms(forceRefresh);

      // 正規化縣市名稱 (移除「縣」、「市」等後綴)
      const normalizedCounty = county.replace(/[縣市]/g, "");

      const filtered = farms.filter((farm) => {
        const farmCounty =
          farm.County?.replace(/[縣市]/g, "") ||
          farm.Township?.replace(/[縣市]/g, "") ||
          farm.Address_CH?.substring(0, 3).replace(/[縣市]/g, "") ||
          "";

        return (
          farmCounty.includes(normalizedCounty) ||
          normalizedCounty.includes(farmCounty)
        );
      });

      return filtered;
    } catch (error) {
      throw error;
    }
  }

  async refreshCache() {
    return await super.refreshCache();
  }
}

// 導出單例
export const farmService = new FarmService();

// 為了向後相容，也導出原有的函數名稱
export const fetchFarmsFromMOA = (forceRefresh = false) =>
  farmService.getAllFarms(forceRefresh);
export const filterFarmsByCounty = (county, forceRefresh = false) =>
  farmService.filterByCounty(county, forceRefresh);
export const refreshCache = () => farmService.refreshCache();
