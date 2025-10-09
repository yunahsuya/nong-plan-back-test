import express from "express";
import {
  getAllPrices,
  getPricesByGoods,
  getPricesByMarket,
  getCacheStatus,
  clearCache,
  refreshCache,
} from "../controllers/fishPricesController.js";

const router = express.Router();

// Price routes
router.get("/", getAllPrices);
router.get("/goods/:goodsName", getPricesByGoods);
router.get("/market/:marketName", getPricesByMarket);

// Cache management
router.get("/cache/status", getCacheStatus);
router.delete("/cache", clearCache);
router.post("/cache/refresh", refreshCache);

export default router;
