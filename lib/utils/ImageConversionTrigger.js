import notionImageConverter from './NotionImageConverter'
import notionUpdateDetector from './NotionUpdateDetector'
import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'

/**
 * 图片转换触发器
 * 负责在适当的时机触发图片转换任务
 */
class ImageConversionTrigger {
  constructor() {
    this.isProcessing = false
    this.processingQueue = new Set()
    this.maxConcurrentProcessing = 2 // 最大并发处理数
  }

  /**
   * 触发文章图片转换（异步，不阻塞页面渲染）
   * @param {string} articleId - 文章ID
   * @param {Object} blockMap - 文章block数据
   * @param {string} userAgent - 用户代理
   */
  async triggerImageConversion(articleId, blockMap, userAgent = null) {
    try {
      // 检查是否启用WebP转换
      if (!this._isWebPConversionEnabled()) {
        return
      }

      // 检查用户浏览器是否支持WebP
      if (userAgent && !notionImageConverter.isWebPSupported(userAgent)) {
        console.log(`[转换触发] 用户浏览器不支持WebP，跳过转换: ${articleId}`)
        return
      }

      // 避免重复处理
      if (this.processingQueue.has(articleId)) {
        console.log(`[转换触发] 文章 ${articleId} 已在处理队列中`)
        return
      }

      // 检查是否最近已经处理过
      const lastProcessedKey = `last_processed_${articleId}`
      const lastProcessed = await getDataFromCache(lastProcessedKey)
      const now = Date.now()
      const processInterval = 24 * 60 * 60 * 1000 // 24小时内不重复处理

      if (lastProcessed && (now - lastProcessed) < processInterval) {
        console.log(`[转换触发] 文章 ${articleId} 最近已处理过，跳过`)
        return
      }

      // 添加到处理队列
      this.processingQueue.add(articleId)

      // 异步处理，不阻塞主流程
      this._processImageConversionAsync(articleId, blockMap, userAgent)
        .finally(() => {
          this.processingQueue.delete(articleId)
        })

      console.log(`[转换触发] 已触发文章 ${articleId} 的图片转换任务`)

    } catch (error) {
      console.error(`[转换触发] 触发转换失败: ${articleId}`, error)
    }
  }

  /**
   * 异步处理图片转换
   * @param {string} articleId - 文章ID
   * @param {Object} blockMap - 文章block数据
   * @param {string} userAgent - 用户代理
   */
  async _processImageConversionAsync(articleId, blockMap, userAgent) {
    try {
      console.log(`[异步转换] 开始处理文章 ${articleId} 的图片转换`)

      // 扫描文章中的图片
      const images = await notionImageConverter.scanArticleImages(articleId, blockMap)
      
      if (images.length === 0) {
        console.log(`[异步转换] 文章 ${articleId} 没有图片需要处理`)
        return
      }

      // 过滤需要转换的图片
      const imagesToConvert = images.filter(img => 
        img.needsConversion && 
        !img.isConverted &&
        this._shouldConvertImage(img.url)
      )

      if (imagesToConvert.length === 0) {
        console.log(`[异步转换] 文章 ${articleId} 没有需要转换的图片`)
        return
      }

      console.log(`[异步转换] 文章 ${articleId} 需要转换 ${imagesToConvert.length} 张图片`)

      // 批量转换图片
      const imageMap = new Map()
      const errors = []
      let processed = 0

      for (const imageInfo of imagesToConvert) {
        try {
          // 添加延迟，避免过于频繁的转换请求
          if (processed > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }

          const result = await notionImageConverter.convertToWebP(imageInfo.url, articleId)
          
          if (result.webpUrl && !result.error) {
            imageMap.set(imageInfo.url, result.webpUrl)
            processed++
            console.log(`[异步转换] 成功转换图片 ${processed}/${imagesToConvert.length}: ${imageInfo.url}`)
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
          console.error(`[异步转换] 转换图片失败: ${imageInfo.url}`, error)
        }
      }

      // 更新图片映射关系
      if (imageMap.size > 0) {
        await notionImageConverter.updateImageReferences(articleId, imageMap)
        console.log(`[异步转换] 已更新文章 ${articleId} 的图片映射，共 ${imageMap.size} 个`)
      }

      // 记录处理时间
      const lastProcessedKey = `last_processed_${articleId}`
      await setDataToCache(lastProcessedKey, Date.now(), 7 * 24 * 3600) // 缓存7天

      // 记录处理结果
      const resultKey = `conversion_result_${articleId}`
      const result = {
        processedAt: new Date().toISOString(),
        totalImages: images.length,
        processed,
        errors: errors.length,
        imageMap: Object.fromEntries(imageMap)
      }
      await setDataToCache(resultKey, result, 7 * 24 * 3600) // 缓存7天

      console.log(`[异步转换] 文章 ${articleId} 转换完成: 成功 ${processed} 个，失败 ${errors.length} 个`)

    } catch (error) {
      console.error(`[异步转换] 处理文章 ${articleId} 时出错:`, error)
    }
  }

  /**
   * 检查是否应该转换特定图片
   * @param {string} imageUrl - 图片URL
   * @returns {boolean} 是否应该转换
   */
  _shouldConvertImage(imageUrl) {
    try {
      // 添加类型检查
      if (!imageUrl || typeof imageUrl !== 'string') {
        return false
      }
      
      // 跳过已经是WebP格式的图片
      if (imageUrl.toLowerCase().includes('.webp')) {
        return false
      }

      // 跳过SVG图片
      if (imageUrl.toLowerCase().includes('.svg')) {
        return false
      }

      // 跳过emoji相关图片
      if (imageUrl.includes('emoji')) {
        return false
      }

      // 跳过过小的图片（可能是图标）
      const url = new URL(imageUrl)
      const width = url.searchParams.get('width') || url.searchParams.get('w')
      if (width && parseInt(width) < 100) {
        return false
      }

      return true

    } catch (error) {
      console.warn(`[转换判断] 判断是否转换图片失败: ${imageUrl}`, error)
      return false
    }
  }

  /**
   * 检查是否启用WebP转换
   * @returns {boolean} 是否启用
   */
  _isWebPConversionEnabled() {
    return process.env.WEBP_ENABLE_AUTO_CONVERSION === 'true' || 
           process.env.NEXT_PUBLIC_WEBP_ENABLE_AUTO_CONVERSION === 'true'
  }

  /**
   * 获取处理队列状态
   * @returns {Object} 队列状态
   */
  getQueueStatus() {
    return {
      isProcessing: this.isProcessing,
      queueSize: this.processingQueue.size,
      processingArticles: Array.from(this.processingQueue)
    }
  }

  /**
   * 手动触发文章转换（同步）
   * @param {string} articleId - 文章ID
   * @returns {Promise<Object>} 转换结果
   */
  async manualConvertArticle(articleId) {
    try {
      console.log(`[手动转换] 开始手动转换文章: ${articleId}`)
      
      const result = await notionUpdateDetector.manualProcessArticle(articleId)
      
      console.log(`[手动转换] 文章 ${articleId} 转换完成:`, result)
      
      return result
      
    } catch (error) {
      console.error(`[手动转换] 手动转换文章 ${articleId} 失败:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 清理过期的处理记录
   */
  async cleanupExpiredRecords() {
    try {
      console.log('[清理] 开始清理过期的转换记录')
      
      // 这里可以实现清理逻辑，由于使用了缓存TTL，大部分清理会自动进行
      // 如果需要手动清理，可以在这里实现
      
      console.log('[清理] 清理完成')
      
    } catch (error) {
      console.error('[清理] 清理过期记录失败:', error)
    }
  }
}

// 创建单例实例
const imageConversionTrigger = new ImageConversionTrigger()

export default imageConversionTrigger
export { ImageConversionTrigger }