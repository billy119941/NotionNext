import { withErrorHandler } from '@/lib/utils/apiErrorHandler'

/**
 * 错误统计API - 提供错误统计信息
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: '方法不被允许' })
  }

  // 这里应该从数据库或日志文件中获取错误统计
  // 目前返回模拟数据，你可以根据实际需求修改
  
  const stats = {
    summary: {
      total24h: 0,
      total7d: 0,
      criticalErrors: 0,
      mostCommonError: 'None'
    },
    statusCodes: {
      '500': 0,
      '502': 0,
      '503': 0,
      '504': 0
    },
    trends: {
      hourly: Array(24).fill(0),
      daily: Array(7).fill(0)
    },
    topErrors: [],
    recentErrors: []
  }

  // 添加健康状态
  const healthStatus = stats.summary.criticalErrors === 0 ? 'healthy' : 
                      stats.summary.criticalErrors < 10 ? 'warning' : 'critical'

  res.status(200).json({
    ...stats,
    healthStatus,
    lastUpdated: new Date().toISOString()
  })
}

export default withErrorHandler(handler)