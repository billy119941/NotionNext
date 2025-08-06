import imageConversionTrigger from '@/lib/utils/ImageConversionTrigger'
import notionImageConverter from '@/lib/utils/NotionImageConverter'
import notionUpdateDetector from '@/lib/utils/NotionUpdateDetector'
import { getPage } from '@/lib/notion/getPostBlocks'

/**
 * WebP转换API端点
 * 支持手动触发转换、查看状态等操作
 */
export default async function handler(req, res) {
  const { method, query, body } = req

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res, query)
      case 'POST':
        return await handlePost(req, res, body)
      default:
        return res.status(405).json({ error: '方法不被支持' })
    }
  } catch (error) {
    console.error('[WebP API] 处理请求时出错:', error)
    return res.status(500).json({ 
      error: '服务器内部错误',
      message: error.message 
    })
  }
}

/**
 * 处理GET请求
 */
async function handleGet(req, res, query) {
  const { action, articleId } = query

  switch (action) {
    case 'status':
      // 获取转换状态
      const queueStatus = imageConversionTrigger.getQueueStatus()
      const stats = await notionUpdateDetector.getStats()
      
      return res.status(200).json({
        success: true,
        data: {
          queue: queueStatus,
          stats,
          timestamp: new Date().toISOString()
        }
      })

    case 'article-status':
      // 获取特定文章的转换状态
      if (!articleId) {
        return res.status(400).json({ error: '缺少articleId参数' })
      }

      const articleMapping = await notionImageConverter.getImageMapping(articleId)
      
      return res.status(200).json({
        success: true,
        data: {
          articleId,
          imageMapping: articleMapping,
          hasMapping: Object.keys(articleMapping).length > 0,
          timestamp: new Date().toISOString()
        }
      })

    case 'config':
      // 获取配置信息
      const r2Config = {
        domain: 'image.shareking.vip',
        webpEnabled: process.env.WEBP_ENABLE_AUTO_CONVERSION === 'true',
        hasUploadConfig: !!(process.env.R2_UPLOAD_ENDPOINT && process.env.R2_API_KEY)
      }
      
      return res.status(200).json({
        success: true,
        data: {
          config: r2Config,
          timestamp: new Date().toISOString()
        }
      })

    default:
      return res.status(400).json({ error: '无效的action参数' })
  }
}

/**
 * 处理POST请求
 */
async function handlePost(req, res, body) {
  const { action, articleId, imageUrl } = body

  switch (action) {
    case 'convert-article':
      // 手动转换文章图片
      if (!articleId) {
        return res.status(400).json({ error: '缺少articleId参数' })
      }

      console.log(`[WebP API] 开始手动转换文章: ${articleId}`)
      
      const result = await imageConversionTrigger.manualConvertArticle(articleId)
      
      return res.status(200).json({
        success: result.success,
        data: result,
        message: result.success ? '转换任务已启动' : '转换失败',
        timestamp: new Date().toISOString()
      })

    case 'convert-image':
      // 手动转换单张图片
      if (!imageUrl) {
        return res.status(400).json({ error: '缺少imageUrl参数' })
      }

      console.log(`[WebP API] 开始手动转换图片: ${imageUrl}`)
      
      const conversionResult = await notionImageConverter.convertToWebP(imageUrl, articleId)
      
      return res.status(200).json({
        success: !conversionResult.error,
        data: conversionResult,
        message: conversionResult.error ? '转换失败' : '转换成功',
        timestamp: new Date().toISOString()
      })

    case 'scan-article':
      // 扫描文章图片
      if (!articleId) {
        return res.status(400).json({ error: '缺少articleId参数' })
      }

      console.log(`[WebP API] 开始扫描文章图片: ${articleId}`)
      
      try {
        const blockMap = await getPage(articleId, 'api_scan')
        if (!blockMap) {
          return res.status(404).json({ error: '文章不存在' })
        }

        const images = await notionImageConverter.scanArticleImages(articleId, blockMap)
        
        return res.status(200).json({
          success: true,
          data: {
            articleId,
            images,
            totalImages: images.length,
            needsConversion: images.filter(img => img.needsConversion).length,
            alreadyWebP: images.filter(img => img.isConverted).length
          },
          message: `扫描完成，发现 ${images.length} 张图片`,
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        return res.status(500).json({ 
          error: '扫描失败',
          message: error.message 
        })
      }

    case 'trigger-conversion':
      // 触发文章转换（异步）
      if (!articleId) {
        return res.status(400).json({ error: '缺少articleId参数' })
      }

      try {
        const blockMap = await getPage(articleId, 'api_trigger')
        if (!blockMap) {
          return res.status(404).json({ error: '文章不存在' })
        }

        const userAgent = req.headers['user-agent']
        await imageConversionTrigger.triggerImageConversion(articleId, blockMap, userAgent)
        
        return res.status(200).json({
          success: true,
          data: { articleId },
          message: '转换任务已触发',
          timestamp: new Date().toISOString()
        })
        
      } catch (error) {
        return res.status(500).json({ 
          error: '触发转换失败',
          message: error.message 
        })
      }

    default:
      return res.status(400).json({ error: '无效的action参数' })
  }
}

/**
 * 获取请求的用户代理
 */
function getUserAgent(req) {
  return req.headers['user-agent'] || ''
}