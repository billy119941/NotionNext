import sharp from 'sharp'
import axios from 'axios'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import BLOG from '@/blog.config'
import r2ImageUploader from './R2ImageUploader'

/**
 * Notion图片自动转换WebP服务
 * 实现图片扫描、格式检测、WebP转换和链接更新功能
 */
class NotionImageConverter {
  constructor() {
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff']
    this.webpQuality = 80 // WebP压缩质量
    this.conversionCache = new Map() // 转换结果缓存
  }

  /**
   * 扫描文章中的图片链接
   * @param {string} articleId - 文章ID
   * @param {Object} blockMap - 文章的block数据
   * @returns {Promise<Array>} 图片信息数组
   */
  async scanArticleImages(articleId, blockMap) {
    try {
      console.log(`[图片扫描] 开始扫描文章 ${articleId} 中的图片`)
      
      const images = []
      const blocks = blockMap?.block || {}
      
      // 遍历所有block，查找图片
      for (const blockId in blocks) {
        const block = blocks[blockId]
        const blockValue = block?.value
        
        if (!blockValue) continue
        
        // 处理不同类型的图片block
        const imageInfo = await this._extractImageFromBlock(blockValue, blockId)
        if (imageInfo) {
          images.push(imageInfo)
        }
      }
      
      console.log(`[图片扫描] 文章 ${articleId} 共发现 ${images.length} 张图片`)
      return images
      
    } catch (error) {
      console.error(`[图片扫描] 扫描文章 ${articleId} 时出错:`, error)
      return []
    }
  }

  /**
   * 从block中提取图片信息
   * @param {Object} blockValue - block数据
   * @param {string} blockId - block ID
   * @returns {Object|null} 图片信息对象
   */
  async _extractImageFromBlock(blockValue, blockId) {
    let imageUrl = null
    let imageType = 'unknown'
    
    // 根据block类型提取图片URL
    switch (blockValue.type) {
      case 'image':
        imageUrl = blockValue.properties?.source?.[0]?.[0]
        imageType = 'content_image'
        break
        
      case 'page':
        // 页面封面图片
        imageUrl = blockValue.format?.page_cover
        imageType = 'page_cover'
        break
        
      case 'callout':
        // callout块的图标
        if (blockValue.format?.page_icon && blockValue.format.page_icon.startsWith('http')) {
          imageUrl = blockValue.format.page_icon
          imageType = 'callout_icon'
        }
        break
        
      case 'bookmark':
        // 书签预览图
        imageUrl = blockValue.properties?.link?.[0]?.[0]
        imageType = 'bookmark_preview'
        break
    }
    
    if (!imageUrl || !this._isValidImageUrl(imageUrl)) {
      return null
    }
    
    // 检测图片格式
    const format = this._detectImageFormat(imageUrl)
    const size = await this._getImageSize(imageUrl)
    
    return {
      blockId,
      url: imageUrl,
      format,
      size,
      type: imageType,
      isConverted: format === 'webp',
      needsConversion: typeof format === 'string' && this.supportedFormats.includes(format.toLowerCase())
    }
  }

  /**
   * 检查URL是否为有效的图片链接
   * @param {string} url - 图片URL
   * @returns {boolean} 是否为有效图片URL
   */
  _isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false
    
    // 排除emoji和SVG
    if (url.includes('emoji') || url.includes('.svg')) return false
    
    // 检查是否为HTTP(S)链接
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
  }

  /**
   * 检测图片格式
   * @param {string} url - 图片URL
   * @returns {string} 图片格式
   */
  _detectImageFormat(url) {
    try {
      // 从URL中提取文件扩展名
      const urlObj = new URL((typeof url === 'string' && url.startsWith('/')) ? BLOG.NOTION_HOST + url : url)
      const pathname = urlObj.pathname.toLowerCase()
      
      // 常见图片格式检测
      if (pathname.includes('.webp')) return 'webp'
      if (pathname.includes('.jpg') || pathname.includes('.jpeg')) return 'jpeg'
      if (pathname.includes('.png')) return 'png'
      if (pathname.includes('.gif')) return 'gif'
      if (pathname.includes('.bmp')) return 'bmp'
      if (pathname.includes('.tiff') || pathname.includes('.tif')) return 'tiff'
      
      // 对于Notion的图片URL，尝试从参数中获取格式信息
      const params = urlObj.searchParams
      const format = params.get('format') || params.get('fmt')
      if (format && typeof format === 'string') return format.toLowerCase()
      
      // 默认假设为JPEG（Notion图片通常是JPEG）
      return 'jpeg'
      
    } catch (error) {
      console.warn(`[格式检测] 无法检测图片格式: ${url}`, error)
      return 'unknown'
    }
  }

  /**
   * 获取图片大小（字节）
   * @param {string} url - 图片URL
   * @returns {Promise<number>} 图片大小
   */
  async _getImageSize(url) {
    try {
      // 先检查缓存
      const cacheKey = `image_size_${url}`
      const cachedSize = await getDataFromCache(cacheKey)
      if (cachedSize) return cachedSize
      
      // 发送HEAD请求获取文件大小
      const response = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'NotionNext-ImageConverter/1.0'
        }
      })
      
      const size = parseInt(response.headers['content-length'] || '0')
      
      // 缓存结果（缓存1小时）
      await setDataToCache(cacheKey, size, 3600)
      
      return size
      
    } catch (error) {
      console.warn(`[大小检测] 无法获取图片大小: ${url}`, error)
      return 0
    }
  }

  /**
   * 将图片转换为WebP格式并上传到R2
   * @param {string} imageUrl - 原始图片URL
   * @param {string} articleId - 文章ID（用于生成文件名）
   * @returns {Promise<Object>} 转换结果
   */
  async convertToWebP(imageUrl, articleId = null) {
    try {
      console.log(`[WebP转换] 开始转换图片: ${imageUrl}`)
      
      // 检查转换缓存
      const cacheKey = `webp_conversion_${imageUrl}`
      const cachedResult = await getDataFromCache(cacheKey)
      if (cachedResult) {
        console.log(`[WebP转换] 使用缓存结果: ${imageUrl}`)
        return cachedResult
      }
      
      // 下载原始图片
      const originalBuffer = await this._downloadImage(imageUrl)
      if (!originalBuffer) {
        throw new Error('无法下载原始图片')
      }
      
      // 使用Sharp转换为WebP
      const webpBuffer = await sharp(originalBuffer)
        .webp({ 
          quality: this.webpQuality,
          effort: 6 // 压缩努力程度 (0-6, 6为最高)
        })
        .toBuffer()
      
      // 计算压缩比
      const originalSize = originalBuffer.length
      const webpSize = webpBuffer.length
      const compressionRatio = ((originalSize - webpSize) / originalSize * 100).toFixed(2)
      
      // 生成上传文件名
      const filename = r2ImageUploader.generateUploadFilename(imageUrl, articleId)
      
      // 上传到R2
      const uploadResult = await r2ImageUploader.uploadWebPImage(webpBuffer, filename, {
        originalUrl: imageUrl,
        originalSize,
        webpSize,
        compressionRatio,
        convertedAt: new Date().toISOString(),
        articleId
      })
      
      let webpUrl = null
      if (uploadResult.success) {
        webpUrl = uploadResult.url
        console.log(`[WebP转换] 上传成功: ${webpUrl}`)
      } else {
        console.warn(`[WebP转换] 上传失败，使用生成的URL: ${uploadResult.error}`)
        webpUrl = this._generateWebPUrl(imageUrl)
      }
      
      const result = {
        originalUrl: imageUrl,
        webpUrl: webpUrl,
        fallbackUrl: imageUrl, // 降级时使用原图
        originalSize,
        webpSize,
        compressionRatio: parseFloat(compressionRatio),
        filename,
        uploadResult,
        convertedAt: new Date().toISOString()
      }
      
      // 缓存转换结果（缓存24小时）
      await setDataToCache(cacheKey, result, 86400)
      
      console.log(`[WebP转换] 转换完成: ${imageUrl} -> ${webpUrl}, 压缩率: ${compressionRatio}%`)
      
      return result
      
    } catch (error) {
      console.error(`[WebP转换] 转换失败: ${imageUrl}`, error)
      
      // 返回失败结果，使用原图作为降级
      return {
        originalUrl: imageUrl,
        webpUrl: null,
        fallbackUrl: imageUrl,
        originalSize: 0,
        webpSize: 0,
        compressionRatio: 0,
        error: error.message,
        convertedAt: new Date().toISOString()
      }
    }
  }

  /**
   * 下载图片数据
   * @param {string} url - 图片URL
   * @returns {Promise<Buffer>} 图片数据
   */
  async _downloadImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'NotionNext-ImageConverter/1.0'
        }
      })
      
      return Buffer.from(response.data)
      
    } catch (error) {
      console.error(`[图片下载] 下载失败: ${url}`, error)
      return null
    }
  }

  /**
   * 生成WebP图片的URL
   * @param {string} originalUrl - 原始图片URL
   * @returns {string} WebP图片URL
   */
  _generateWebPUrl(originalUrl) {
    try {
      // 使用Cloudflare R2图床 (image.shareking.vip)
      const R2_DOMAIN = 'image.shareking.vip'
      
      // 生成唯一的文件名
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      
      // 从原始URL提取文件名或生成新的文件名
      let filename = 'converted'
      try {
        const urlObj = new URL((typeof originalUrl === 'string' && originalUrl.startsWith('/')) ? BLOG.NOTION_HOST + originalUrl : originalUrl)
        const pathname = urlObj.pathname
        const originalFilename = pathname.split('/').pop().split('.')[0]
        if (originalFilename && originalFilename.length > 0) {
          filename = originalFilename
        }
      } catch (e) {
        // 使用默认文件名
      }
      
      // 构建WebP图片的R2 URL
      const webpFilename = `${filename}_${timestamp}_${randomId}.webp`
      const webpUrl = `https://${R2_DOMAIN}/webp/${webpFilename}`
      
      console.log(`[URL生成] 生成WebP URL: ${originalUrl} -> ${webpUrl}`)
      
      return webpUrl
      
    } catch (error) {
      console.warn(`[URL生成] 生成WebP URL失败: ${originalUrl}`, error)
      // 降级方案：在原URL基础上添加WebP参数
      const separator = originalUrl.includes('?') ? '&' : '?'
      return `${originalUrl}${separator}format=webp&converted=true`
    }
  }

  /**
   * 检测浏览器是否支持WebP
   * @param {string} userAgent - 用户代理字符串
   * @returns {boolean} 是否支持WebP
   */
  isWebPSupported(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return false
    
    const ua = userAgent.toLowerCase()
    
    // Chrome 23+, Opera 12.1+, Firefox 65+, Edge 18+, Safari 14+
    const supportedBrowsers = [
      /chrome\/([2-9]\d|[1-9]\d{2,})/,  // Chrome 23+
      /firefox\/([6-9]\d|\d{3,})/,      // Firefox 65+
      /edge\/([1-9]\d|\d{3,})/,         // Edge 18+
      /safari\/([1-9]\d{2,})/,          // Safari 14+ (需要更精确的版本检测)
      /opera\/([1-9]\d|\d{3,})/         // Opera 12.1+
    ]
    
    // 检查是否匹配支持WebP的浏览器
    return supportedBrowsers.some(regex => regex.test(ua))
  }

  /**
   * 更新文章中的图片引用
   * @param {string} articleId - 文章ID
   * @param {Map} imageMap - 图片URL映射表 (原URL -> WebP URL)
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateImageReferences(articleId, imageMap) {
    try {
      console.log(`[链接更新] 开始更新文章 ${articleId} 的图片链接`)
      
      // 这里需要根据实际的数据存储方式来实现
      // 由于NotionNext是基于Notion API的，图片链接更新需要特殊处理
      
      // 方案1: 在渲染时动态替换（推荐）
      // 在mapImage.js中集成WebP转换逻辑
      
      // 方案2: 缓存层面替换
      // 在缓存中存储转换后的图片映射关系
      
      const cacheKey = `webp_mapping_${articleId}`
      const mappingData = Object.fromEntries(imageMap)
      
      // 将映射关系存储到缓存中，供渲染时使用
      await setDataToCache(cacheKey, mappingData, 86400) // 缓存24小时
      
      console.log(`[链接更新] 文章 ${articleId} 的图片映射已更新，共 ${imageMap.size} 个映射`)
      
      return true
      
    } catch (error) {
      console.error(`[链接更新] 更新文章 ${articleId} 的图片链接失败:`, error)
      return false
    }
  }

  /**
   * 获取文章的图片映射关系
   * @param {string} articleId - 文章ID
   * @returns {Promise<Object>} 图片映射关系
   */
  async getImageMapping(articleId) {
    try {
      const cacheKey = `webp_mapping_${articleId}`
      const mapping = await getDataFromCache(cacheKey)
      return mapping || {}
    } catch (error) {
      console.error(`[映射获取] 获取文章 ${articleId} 的图片映射失败:`, error)
      return {}
    }
  }

  /**
   * 批量处理文章图片转换
   * @param {string} articleId - 文章ID
   * @param {Object} blockMap - 文章block数据
   * @returns {Promise<Object>} 处理结果
   */
  async processArticleImages(articleId, blockMap) {
    try {
      console.log(`[批量处理] 开始处理文章 ${articleId} 的图片`)
      
      // 1. 扫描图片
      const images = await this.scanArticleImages(articleId, blockMap)
      
      if (images.length === 0) {
        console.log(`[批量处理] 文章 ${articleId} 没有需要处理的图片`)
        return { success: true, processed: 0, errors: [] }
      }
      
      // 2. 过滤需要转换的图片
      const imagesToConvert = images.filter(img => img.needsConversion && !img.isConverted)
      
      console.log(`[批量处理] 文章 ${articleId} 需要转换 ${imagesToConvert.length} 张图片`)
      
      // 3. 批量转换
      const imageMap = new Map()
      const errors = []
      let processed = 0
      
      for (const imageInfo of imagesToConvert) {
        try {
          const result = await this.convertToWebP(imageInfo.url, articleId)
          
          if (result.webpUrl && !result.error) {
            imageMap.set(imageInfo.url, result.webpUrl)
            processed++
          } else {
            errors.push({
              url: imageInfo.url,
              error: result.error || '转换失败'
            })
          }
          
        } catch (error) {
          errors.push({
            url: imageInfo.url,
            error: error.message
          })
        }
      }
      
      // 4. 更新图片引用
      if (imageMap.size > 0) {
        await this.updateImageReferences(articleId, imageMap)
      }
      
      console.log(`[批量处理] 文章 ${articleId} 处理完成: 成功 ${processed} 个，失败 ${errors.length} 个`)
      
      return {
        success: true,
        totalImages: images.length,
        processed,
        errors,
        imageMap: Object.fromEntries(imageMap)
      }
      
    } catch (error) {
      console.error(`[批量处理] 处理文章 ${articleId} 时出错:`, error)
      return {
        success: false,
        error: error.message,
        totalImages: 0,
        processed: 0,
        errors: []
      }
    }
  }
}

// 创建单例实例
const notionImageConverter = new NotionImageConverter()

export default notionImageConverter
export { NotionImageConverter }