/**
 * 缓存统计API端点
 * 提供缓存性能监控和管理功能
 */

import { getCacheStats, clearCache, warmupCache } from '../../lib/middleware/cache'

export default async function handler(req, res) {
  const { method, query } = req

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    switch (method) {
      case 'GET':
        // 获取缓存统计信息
        const stats = getCacheStats()
        
        res.status(200).json({
          success: true,
          data: {
            ...stats,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
          }
        })
        break

      case 'POST':
        // 预热缓存
        const { paths } = req.body || {}
        
        await warmupCache(paths)
        
        res.status(200).json({
          success: true,
          message: '缓存预热完成',
          data: getCacheStats()
        })
        break

      case 'DELETE':
        // 清空缓存
        clearCache()
        
        res.status(200).json({
          success: true,
          message: '缓存已清空',
          data: getCacheStats()
        })
        break

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
        res.status(405).json({
          success: false,
          error: `方法 ${method} 不被允许`
        })
        break
    }
  } catch (error) {
    console.error('[Cache API] 错误:', error)
    
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error.message
    })
  }
}