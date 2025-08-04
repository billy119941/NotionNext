import { withErrorHandler } from '@/lib/utils/apiErrorHandler'

/**
 * 错误报告API - 接收客户端错误报告
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: '方法不被允许' })
  }

  const errorReport = req.body
  
  // 验证错误报告格式
  if (!errorReport || typeof errorReport !== 'object') {
    return res.status(400).json({ error: true, message: '无效的错误报告格式' })
  }

  // 记录错误到服务器日志
  console.error('Client Error Report:', {
    timestamp: new Date().toISOString(),
    clientIP: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    ...errorReport
  })

  // 这里可以将错误发送到外部监控服务
  // 例如：Sentry, LogRocket, DataDog等
  
  // 如果是5xx错误，可以触发告警
  if (errorReport.statusCode >= 500 && errorReport.statusCode < 600) {
    console.error('🚨 CRITICAL ERROR DETECTED:', errorReport)
    // 这里可以发送邮件、Slack通知等
  }

  res.status(200).json({ 
    success: true, 
    message: '错误报告已收到',
    reportId: Date.now()
  })
}

export default withErrorHandler(handler)