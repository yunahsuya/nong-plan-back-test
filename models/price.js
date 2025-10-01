// Price data model and filtering logic
// 只做一件事：定義資料結構和篩選規則

const ALLOWED_CATEGORIES = ["N04", "N05"];
const MIN_VOLUME = 1000;

export function transformPriceData(rawData) {
  return rawData.map((item) => ({
    tradeDate: item["交易日期"],
    categoryCode: item["種類代碼"],
    cropName: item["作物名稱"],
    marketName: item["市場名稱"],
    prices: {
      high: parseFloat(item["上價"]) || 0,
      middle: parseFloat(item["中價"]) || 0,
      low: parseFloat(item["下價"]) || 0,
      average: parseFloat(item["平均價"]) || 0,
    },
    volume: parseFloat(item["交易量"]) || 0,
  }));
}

export function filterPriceData(data) {
  return data.filter((item) => {
    // 1. Category filter: only N04 and N05
    if (!ALLOWED_CATEGORIES.includes(item.categoryCode)) {
      return false;
    }

    // 2. Remove rest day records
    if (item.cropName === "休市") {
      return false;
    }

    // 3. Remove zero volume
    if (item.volume === 0) {
      return false;
    }

    // 4. Remove low volume
    if (item.volume < MIN_VOLUME) {
      return false;
    }

    // 5. Remove invalid price
    if (item.prices.average <= 0) {
      return false;
    }

    // 6. Remove "其他" and "改良種"
    if (item.cropName.includes("其他") || item.cropName.includes("改良種")) {
      return false;
    }

    return true;
  });
}
