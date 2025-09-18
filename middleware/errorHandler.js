import { StatusCodes } from 'http-status-codes'

const errorHandler = (err, req, res, next) => {
  console.error('❌ 錯誤:', err.message)
  console.error('�� 堆疊:', err.stack)
  
  // 預設錯誤
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR
  let message = '伺服器內部錯誤'
  
  // 根據錯誤類型設定狀態碼和訊息
  if (err.message.includes('農業部服務')) {
    statusCode = StatusCodes.BAD_GATEWAY
    message = '外部服務暫時無法使用，請稍後再試'
  } else if (err.message.includes('超時')) {
    statusCode = StatusCodes.REQUEST_TIMEOUT
    message = '請求超時，請稍後再試'
  } else if (err.message.includes('格式不正確')) {
    statusCode = StatusCodes.BAD_GATEWAY
    message = '外部資料格式錯誤'
  }
  
  // 開發環境顯示詳細錯誤
  const errorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  }
  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.message
    errorResponse.stack = err.stack
  }
  
  res.status(statusCode).json(errorResponse)
}

export default errorHandler