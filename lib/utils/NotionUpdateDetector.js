import { getDataFromCache, setDataToCache } from '@/lib/cache/cache_manager'
import notionImageConverter from './NotionImageConverter'
import { getPage } from '@/lib/notion/getPostBlocks'

/**
 * Notion文章更新检测器
 * 检测文章内容变化并触发图片转换处理
 */
class NotionUpdateDetector {
  constructor() {
    this.checkInterval = 5 * 60 * 1000 // 5分钟检查一次
    this.isRunning = false
    this.processedArticles = new Set()
  }

  /**
   * 启动更新检测
   */
  start() {
    if (this.isRunning) {
      console.log('[更新检测] 检测器已在运行中')
      return
    }

    this.isRunning = true
    console.log('[更新检测] 启动Notion文章更新检测器')
    
    // 立即执行一次检测
    this.checkForUpdates()
    
    // 设置定时检测
    this.intervalId = setInterval(() => {
      this.checkForUpdates()
    }, this.checkInterval)
  }

  /**
   * 停止更新检测
   */
  stop() {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    
    console.log('[更新检测] 停止Notion文章更新检测器')
  }

  /**
   * 检查文章更新
   */
  async checkForUpdates() {
    try {
      console.log('[更新检测] 开始检查文章更新...')
      
      // 获取最近更新的文章列表
      const recentlyUpdated = await this.getRecentlyUpdatedArticles()
      
      if (recentlyUpdated.length === 0) {
        console.log('[更新检测] 没有发现最近更新的文章')
        return
      }

      console.log(`[更新检测] 发现 ${recentlyUpdated.length} 篇最近更新的文章`)

      // 处理每篇更新的文章
      for (const article of recentlyUpdated) {
        await this.processUpdatedArticle(article)
      }

    } catch (error) {
      console.error('[更新检测] 检查更新时出错:', error)
    }
  }

  /**
   * 获取最近更新的文章列表
   * @returns {Promise<Array>} 最近更新的文章列表
   */
  async getRecentlyUpdatedArticles() {
    try {
      // 这里需要根据实际的Notion API实现来获取最近更新的文章
      // 由于NotionNext的架构限制，我们采用缓存对比的方式来检测更新
      
      const cacheKey = 'recent_articles_check'
      const lastCheckTime = await getDataFromCache(cacheKey) || 0
      const currentTime = Date.now()
      
      // 更新检查时间
      await setDataToCache(cacheKey, currentTime, 86400) // 缓存24小时
      
      // 这里返回一个示例列表，实际实现需要根据具体的数据源调整
      // 可以通过以下方式获取更新的文章：
      // 1. 监听Notion webhook（如果有的话）
      // 2. 定期轮询Notion API获取最近修改的页面
      // 3. 通过缓存时间戳对比检测变化
      
      return []
      
    } catch (error) {
      console.error('[更新检测] 获取最近更新文章失败:', error)
      return []
    }
  }

  /**
   * 处理单篇更新的文章
   * @param {Object} article - 文章信息
   */
  async processUpdatedArticle(article) {
    try {
      const articleId = article.id
      
      // 避免重复处理
      if (this.processedArticles.has(articleId)) {
        console.log(`[更新检测] 文章 ${articleId} 已在处理队列中，跳过`)
        return
      }

      this.processedArticles.add(articleId)
      
      console.log(`[更新检测] 开始处理更新的文章: ${articleId}`)

      // 获取文章内容
      const blockMap = await getPage(articleId, 'update_detector')
      
      if (!blockMap) {
        console.warn(`[更新检测] 无法获取文章 ${articleId} 的内容`)
        this.processedArticles.delete(articleId)
        return
      }

      // 检查文章是否有图片需要处理
      const hasImages = await this.checkArticleHasImages(blockMap)
      
      if (!hasImages) {
        console.log(`[更新检测] 文章 ${articleId} 没有图片，跳过处理`)
        this.processedArticles.delete(articleId)
        return
      }

      // 处理文章图片
      const result = await notionImageConverter.processArticleImages(articleId, blockMap)
      
      if (result.success) {
        console.log(`[更新检测] 文章 ${articleId} 图片处理完成: 处理了 ${result.processed} 张图片`)
        
        // 记录处理结果
        await this.recordProcessingResult(articleId, result)
      } else {
        console.error(`[更新检测] 文章 ${articleId} 图片处理失败:`, result.error)
      }

      // 从处理队列中移除
      this.processedArticles.delete(articleId)

    } catch (error) {
      console.error(`[更新检测] 处理文章 ${article.id} 时出错:`, error)
      this.processedArticles.delete(article.id)
    }
  }

  /**
   * 检查文章是否包含图片
   * @param {Object} blockMap - 文章block数据
   * @returns {Promise<boolean>} 是否包含图片
   */
  async checkArticleHasImages(blockMap) {
    try {
      const blocks = blockMap?.block || {}
      
      for (const blockId in blocks) {
        const block = blocks[blockId]
        const blockValue = block?.value
        
        if (!blockValue) continue
        
        // 检查是否为图片相关的block
        if (blockValue.type === 'image') {
          return true
        }
        
        // 检查页面封面
        if (blockValue.type === 'page' && blockValue.format?.page_cover) {
          return true
        }
        
        // 检查callout图标
        if (blockValue.type === 'callout' && blockValue.format?.page_icon) {
          return true
        }
      }
      
      return false
      
    } catch (error) {
      console.error('[更新检测] 检查文章图片时出错:', error)
      return false
    }
  }

  /**
   * 记录处理结果
   * @param {string} articleId - 文章ID
   * @param {Object} result - 处理结果
   */
  async recordProcessingResult(articleId, result) {
    try {
      const cacheKey = `image_processing_result_${articleId}`
      const record = {
        articleId,
        processedAt: new Date().toISOString(),
        totalImages: result.totalImages,
        processed: result.processed,
        errors: result.errors,
        imageMap: result.imageMap
      }
      
      // 缓存处理结果（保存7天）
      await setDataToCache(cacheKey, record, 7 * 24 * 3600)
      
      // 更新全局处理统计
      await this.updateGlobalStats(result)
      
    } catch (error) {
      console.error(`[更新检测] 记录处理结果失败:`, error)
    }
  }

  /**
   * 更新全局处理统计
   * @param {Object} result - 处理结果
   */
  async updateGlobalStats(result) {
    try {
      const statsKey = 'webp_conversion_stats'
      const stats = await getDataFromCache(statsKey) || {
        totalArticles: 0,
        totalImages: 0,
        totalProcessed: 0,
        totalErrors: 0,
        lastUpdated: null
      }
      
      stats.totalArticles += 1
      stats.totalImages += result.totalImages
      stats.totalProcessed += result.processed
      stats.totalErrors += result.errors.length
      stats.lastUpdated = new Date().toISOString()
      
      await setDataToCache(statsKey, stats, 30 * 24 * 3600) // 缓存30天
      
    } catch (error) {
      console.error('[更新检测] 更新全局统计失败:', error)
    }
  }

  /**
   * 手动触发文章处理
   * @param {string} articleId - 文章ID
   * @returns {Promise<Object>} 处理结果
   */
  async manualProcessArticle(articleId) {
    try {
      console.log(`[手动处理] 开始手动处理文章: ${articleId}`)
      
      // 获取文章内容
      const blockMap = await getPage(articleId, 'manual_process')
      
      if (!blockMap) {
        throw new Error(`无法获取文章 ${articleId} 的内容`)
      }

      // 处理文章图片
      const result = await notionImageConverter.processArticleImages(articleId, blockMap)
      
      if (result.success) {
        // 记录处理结果
        await this.recordProcessingResult(articleId, result)
      }
      
      return result
      
    } catch (error) {
      console.error(`[手动处理] 处理文章 ${articleId} 失败:`, error)
      return {
        success: false,
        error: error.message,
        totalImages: 0,
        processed: 0,
        errors: []
      }
    }
  }

  /**
   * 获取处理统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const statsKey = 'webp_conversion_stats'
      const stats = await getDataFromCache(statsKey) || {
        totalArticles: 0,
        totalImages: 0,
        totalProcessed: 0,
        totalErrors: 0,
        lastUpdated: null
      }
      
      return stats
      
    } catch (error) {
      console.error('[统计获取] 获取统计信息失败:', error)
      return {
        totalArticles: 0,
        totalImages: 0,
        totalProcessed: 0,
        totalErrors: 0,
        lastUpdated: null,
        error: error.message
      }
    }
  }
}

// 创建单例实例
const notionUpdateDetector = new NotionUpdateDetector()

export default notionUpdateDetector
export { NotionUpdateDetector }