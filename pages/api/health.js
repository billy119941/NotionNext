import { withErrorHandler } from '@/lib/utils/apiErrorHandler'
import notionAPI from '@/lib/notion/getNotionAPI'
import BLOG from '@/blog.config'

/**
 * 健康检查API - 监控系统各组件状态
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: true, message: '方法不被允许' })
  }

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  }

  // 检查Notion API连接
  try {
    const start = Date.now()
    await notionAPI.getPage(BLOG.NOTION_PAGE_ID)
    const duration = Date.now() - start
    
    healthStatus.checks.notion = {
      status: 'healthy',
      responseTime: `${duration}ms`,
      message: 'Notion API连接正常'
    }
  } catch (error) {
    healthStatus.status = 'unhealthy'
    healthStatus.checks.notion = {
      status: 'unhealthy',
      error: error.message,
      message: 'Notion API连接失败'
    }
  }

  // 检查内存使用情况
  const memUsage = process.memoryUsage()
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  }

  healthStatus.checks.memory = {
    status: memUsageMB.heapUsed < 500 ? 'healthy' : 'warning',
    usage: memUsageMB,
    message: `内存使用: ${memUsageMB.heapUsed}MB`
  }

  // 检查环境变量
  const requiredEnvVars = ['NOTION_PAGE_ID']
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar] && !BLOG[envVar])
  
  healthStatus.checks.environment = {
    status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
    missing: missingEnvVars,
    message: missingEnvVars.length === 0 ? '环境变量配置正常' : `缺少环境变量: ${missingEnvVars.join(', ')}`
  }

  // 设置响应状态码
  const statusCode = healthStatus.status === 'healthy' ? 200 : 503

  res.status(statusCode).json(healthStatus)
}

export default withErrorHandler(handler)