// Price data model and filtering logic
// 只做一件事：定義資料結構和篩選規則

const MIN_VOLUME = 1000;
const INVALID_CROP_PATTERNS = ["休市", "其他"];

export function transformPriceData(rawData) {
  return rawData.map((item) => ({
    tradeDate: item["交易日期"],
    goodsName: item["貨物名稱"],
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

export function isValidPriceRecord(item) {
  return (
    item.volume >= MIN_VOLUME &&
    item.prices.average > 0 &&
    !hasInvalidCropName(item.goodsName)
  );
}

function hasInvalidCropName(name) {
  return INVALID_CROP_PATTERNS.some((pattern) => name.includes(pattern));
}

export function filterPriceData(data) {
  return data.filter(isValidPriceRecord);
}
