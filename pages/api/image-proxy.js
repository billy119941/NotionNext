import { withErrorHandler, ValidationError, TimeoutError } from '@/lib/utils/apiErrorHandler'

/**
 * 图片代理API - 解决Notion图片URL过期419错误
 * 
 * 使用方法:
 * /api/image-proxy?url=https://file.notion.so/...
 */
async function handler(req, res) {
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  // 验证URL参数
  if (!url) {
    throw new ValidationError('缺少url参数')
  }

  // 验证是否为Notion图片URL
  if (!isNotionImageUrl(url)) {
    throw new ValidationError('无效的Notion图片URL')
  }

  // 设置缓存头
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400') // 24小时缓存
  res.setHeader('CDN-Cache-Control', 'public, max-age=86400')
  
  // 创建AbortController用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
  
  try {
    // 代理请求到Notion
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NotionNext/1.0)',
        'Accept': 'image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    // 检查响应状态
    if (!response.ok) {
      console.error(`Image proxy failed: ${response.status} ${response.statusText} for URL: ${url}`)
      
      // 如果是419错误，抛出特定错误
      if (response.status === 419) {
        const error = new Error('图片URL已过期')
        error.statusCode = 419
        error.code = 'IMAGE_EXPIRED'
        throw error
      }
      
      // 其他HTTP错误
      const error = new Error(`获取图片失败: ${response.statusText}`)
      error.statusCode = response.status
      throw error
    }

    // 获取内容类型
    const contentType = response.headers.get('content-type') || 'image/png'
    
    // 验证是否为图片类型
    if (!contentType.startsWith('image/')) {
      throw new ValidationError('响应内容不是图片格式')
    }

    // 设置响应头
    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    
    // 获取图片数据
    const imageBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(imageBuffer)
    
    // 返回图片数据
    res.status(200).send(buffer)

  } catch (error) {
    clearTimeout(timeoutId)
    
    // 处理超时错误
    if (error.name === 'AbortError') {
      throw new TimeoutError('图片加载超时')
    }
    
    // 重新抛出错误，让错误处理中间件处理
    throw error
  }
}

/**
 * 验证是否为有效的Notion图片URL
 */
function isNotionImageUrl(url) {
  try {
    const urlObj = new URL(url)
    
    // 检查域名
    const validDomains = [
      'file.notion.so',
      's3.us-west-2.amazonaws.com',
      'prod-files-secure.s3.us-west-2.amazonaws.com'
    ]
    
    if (!validDomains.some(domain => urlObj.hostname.includes(domain))) {
      return false
    }
    
    // 检查路径格式
    if (urlObj.hostname === 'file.notion.so') {
      return urlObj.pathname.startsWith('/f/f/')
    }
    
    return true
  } catch (error) {
    return false
  }
}

export default withErrorHandler(handler)

// 导出配置
export const config = {
  api: {
    responseLimit: '10mb', // 允许最大10MB的图片
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
}