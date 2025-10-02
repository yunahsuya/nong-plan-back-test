import { StatusCodes } from "http-status-codes";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { transformPriceData, filterPriceData } from "../models/price.js";
import { shouldUpdateCache } from "../middleware/priceCache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOA_API_URL =
  "https://data.moa.gov.tw/Service/OpenData/FromM/FarmTransData.aspx?IsTransData=1&UnitId=037";

const CACHE_DIR = path.join(__dirname, "../cache");
const CACHE_FILE = path.join(CACHE_DIR, "prices.json");
const CONFIG_FILE = path.join(CACHE_DIR, "price-config.json");

// Core functions
async function fetchFromAPI() {
  const response = await axios.get(MOA_API_URL, {
    timeout: 60000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.data || !Array.isArray(response.data)) {
    throw new Error("API 回應格式不正確");
  }

  return response.data;
}

async function saveCache(data) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), "utf8");

  const config = {
    enabled: true,
    lastUpdate: new Date().toISOString(),
  };
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

async function loadCache() {
  try {
    const data = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function getPriceData(forceRefresh = false) {
  // Check cache validity
  if (!forceRefresh) {
    const needUpdate = await shouldUpdateCache(CONFIG_FILE);
    if (!needUpdate) {
      const cached = await loadCache();
      if (cached) {
        return cached;
      }
    }
  }

  // Fetch and process
  try {
    const raw = await fetchFromAPI();
    const transformed = transformPriceData(raw);
    const filtered = filterPriceData(transformed);

    await saveCache(filtered);
    return filtered;
  } catch (error) {
    // Fallback to cache on error
    const cached = await loadCache();
    if (cached) {
      console.log("API failed, using cache");
      return cached;
    }
    throw new Error(`無法從農業部 API 取得交易資料: ${error.message}`);
  }
}

// Controllers
export const getAllPrices = async (req, res, next) => {
  try {
    const { refresh } = req.query;
    const data = await getPriceData(refresh === "true");

    res.json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getPricesByCrop = async (req, res, next) => {
  try {
    const { crop } = req.params;
    const { refresh } = req.query;

    if (!crop?.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "請提供作物名稱",
      });
    }

    let data = await getPriceData(refresh === "true");
    const term = crop.toLowerCase();
    data = data.filter((item) => item.cropName.toLowerCase().includes(term));

    res.json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getPricesByMarket = async (req, res, next) => {
  try {
    const { market } = req.params;
    const { refresh } = req.query;

    if (!market?.trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "請提供市場名稱",
      });
    }

    let data = await getPriceData(refresh === "true");
    const term = market.toLowerCase();
    data = data.filter((item) => item.marketName.toLowerCase().includes(term));

    res.json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

export const getCacheStatus = async (req, res, next) => {
  try {
    const exists = await fs
      .access(CACHE_FILE)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      return res.json({
        success: true,
        data: { exists: false },
      });
    }

    const configData = await fs.readFile(CONFIG_FILE, "utf8");
    const config = JSON.parse(configData);
    const cacheData = await fs.readFile(CACHE_FILE, "utf8");
    const cache = JSON.parse(cacheData);

    res.json({
      success: true,
      data: {
        exists: true,
        lastUpdate: config.lastUpdate,
        recordCount: cache.length,
        needUpdate: await shouldUpdateCache(CONFIG_FILE),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const clearCache = async (req, res, next) => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });

    try {
      await fs.unlink(CACHE_FILE);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    try {
      await fs.unlink(CONFIG_FILE);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    res.json({
      success: true,
      message: "快取已清除",
    });
  } catch (error) {
    next(error);
  }
};

export const refreshCache = async (req, res, next) => {
  try {
    const data = await getPriceData(true);

    res.json({
      success: true,
      data,
      count: data.length,
      message: "快取已更新",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};
