
import { StatusCodes } from 'http-status-codes'

// 取得所有教育資源分類
export const getEducationCategories = async (req, res, next) => {
  try {
    const categories = [
      {
        id: 'product',
        name: '農民學院找產品',
        icon: '🌾',
        description: '農民產品與農產資訊'
      },
      {
        id: 'aquaculture',
        name: '水產知識淺說',
        icon: '��',
        description: '水產知識小遊戲'
      },
      {
        id: 'varieties',
        name: '農業試驗所品種介紹',
        icon: '🌱',
        description: '農作品種介紹與資訊'
      }
    ]
    
    res.json({
      success: true,
      data: categories,
      message: '成功取得教育資源分類'
    })
  } catch (error) {
    next(error)
  }
}