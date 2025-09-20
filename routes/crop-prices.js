import express from "express";
import {
  getCropPrices,
  getPricesByCrop,
  getPricesByMarket,
  refreshPriceCache,
} from "../controllers/farmController.js";

const router = express.Router();

// 農作物時價 API
router.get("/", getCropPrices);
router.get("/crop/:crop", getPricesByCrop);
router.get("/market/:market", getPricesByMarket);
router.post("/cache/refresh", refreshPriceCache);

export default router;
