// Price API error handler
// 統一錯誤格式，不要廢話

import { StatusCodes } from "http-status-codes";

export function handlePriceError(err, req, res, next) {
  console.error("Price API error:", err.message);

  // API fetch error
  if (err.message.includes("無法從農委會 API")) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      message: "農委會 API 無法連線",
      error: err.message,
    });
  }

  // Cache error
  if (err.message.includes("快取")) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "快取操作失敗",
      error: err.message,
    });
  }

  // Default error
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "伺服器錯誤",
    error: err.message,
  });
}
