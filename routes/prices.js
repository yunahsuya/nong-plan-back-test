import express from "express";
import {
  getAllPrices,
  getPricesByCrop,
  getPricesByMarket,
  getCacheStatus,
  clearCache,
  refreshCache,
} from "../controllers/priceController.js";
import { handlePriceError } from "../middleware/priceError.js";

const router = express.Router();

// Price routes
router.get("/", getAllPrices);
router.get("/crop/:crop", getPricesByCrop);
router.get("/market/:market", getPricesByMarket);

// Cache management
router.get("/cache/status", getCacheStatus);
router.delete("/cache", clearCache);
router.post("/cache/refresh", refreshCache);

// Error handler
router.use(handlePriceError);

export default router;
