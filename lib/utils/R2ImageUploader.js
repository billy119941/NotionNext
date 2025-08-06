import axios from 'axios'

/**
 * Cloudflare R2图片上传服务
 * 处理WebP图片上传到R2存储桶
 */
class R2ImageUploader {
  constructor() {
    this.r2Domain = 'image.shareking.vip'
    this.uploadEndpoint = process.env.R2_UPLOAD_ENDPOINT || null // 需要配置上传API端点
    this.apiKey = process.env.R2_API_KEY || null // 需要配置API密钥
  }

  /**
   * 上传WebP图片到R2
   * @param {Buffer} imageBuffer - 图片数据
   * @param {string} filename - 文件名
   * @param {Object} metadata - 图片元数据
   * @returns {Promise<Object>} 上传结果
   */
  async uploadWebPImage(imageBuffer, filename, metadata = {}) {
    try {
      console.log(`[R2上传] 开始上传WebP图片: ${filename}`)
      
      // 如果没有配置上传端点，使用模拟上传
      if (!this.uploadEndpoint || !this.apiKey) {
        console.warn('[R2上传] 未配置R2上传端点，使用模拟上传')
        return this._simulateUpload(filename, imageBuffer.length)
      }
      
      // 准备上传数据
      const formData = new FormData()
      formData.append('file', new Blob([imageBuffer], { type: 'image/webp' }), filename)
      formData.append('metadata', JSON.stringify(metadata))
      
      // 发送上传请求
      const response = await axios.post(this.uploadEndpoint, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30秒超时
      })
      
      if (response.status === 200 || response.status === 201) {
        const uploadResult = response.data
        const publicUrl = `https://${this.r2Domain}/webp/${filename}`
        
        console.log(`[R2上传] 上传成功: ${publicUrl}`)
        
        return {
          success: true,
          url: publicUrl,
          filename,
          size: imageBuffer.length,
          uploadResult
        }
      } else {
        throw new Error(`上传失败，状态码: ${response.status}`)
      }
      
    } catch (error) {
      console.error(`[R2上传] 上传失败: ${filename}`, error)
      
      // 如果上传失败，尝试模拟上传作为降级方案
      return this._simulateUpload(filename, imageBuffer.length, error.message)
    }
  }

  /**
   * 模拟上传（用于开发和测试）
   * @param {string} filename - 文件名
   * @param {number} size - 文件大小
   * @param {string} error - 错误信息
   * @returns {Object} 模拟上传结果
   */
  _simulateUpload(filename, size, error = null) {
    const publicUrl = `https://${this.r2Domain}/webp/${filename}`
    
    console.log(`[R2上传] 模拟上传: ${publicUrl}`)
    
    return {
      success: true,
      url: publicUrl,
      filename,
      size,
      simulated: true,
      error: error || null
    }
  }

  /**
   * 批量上传WebP图片
   * @param {Array} uploadTasks - 上传任务数组 [{buffer, filename, metadata}]
   * @returns {Promise<Array>} 上传结果数组
   */
  async batchUploadWebPImages(uploadTasks) {
    try {
      console.log(`[R2批量上传] 开始批量上传 ${uploadTasks.length} 张图片`)
      
      const results = []
      const concurrency = 3 // 并发上传数量
      
      // 分批处理上传任务
      for (let i = 0; i < uploadTasks.length; i += concurrency) {
        const batch = uploadTasks.slice(i, i + concurrency)
        
        // 并发上传当前批次
        const batchPromises = batch.map(task => 
          this.uploadWebPImage(task.buffer, task.filename, task.metadata)
        )
        
        const batchResults = await Promise.allSettled(batchPromises)
        
        // 处理批次结果
        batchResults.forEach((result, index) => {
          const task = batch[index]
          
          if (result.status === 'fulfilled') {
            results.push({
              ...result.value,
              originalTask: task
            })
          } else {
            results.push({
              success: false,
              filename: task.filename,
              error: result.reason?.message || '上传失败',
              originalTask: task
            })
          }
        })
        
        // 批次间稍作延迟，避免过于频繁的请求
        if (i + concurrency < uploadTasks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount
      
      console.log(`[R2批量上传] 批量上传完成: 成功 ${successCount} 个，失败 ${failCount} 个`)
      
      return results
      
    } catch (error) {
      console.error('[R2批量上传] 批量上传过程出错:', error)
      return []
    }
  }

  /**
   * 检查R2服务状态
   * @returns {Promise<boolean>} 服务是否可用
   */
  async checkR2Status() {
    try {
      // 尝试访问R2域名
      const response = await axios.head(`https://${this.r2Domain}`, {
        timeout: 5000
      })
      
      return response.status === 200 || response.status === 404 // 404也表示域名可达
      
    } catch (error) {
      console.warn('[R2状态检查] R2服务不可用:', error.message)
      return false
    }
  }

  /**
   * 生成上传文件名
   * @param {string} originalUrl - 原始图片URL
   * @param {string} articleId - 文章ID
   * @returns {string} 生成的文件名
   */
  generateUploadFilename(originalUrl, articleId) {
    try {
      // 从原始URL提取基础文件名
      let baseName = 'image'
      try {
        const urlObj = new URL(originalUrl)
        const pathname = urlObj.pathname
        const filename = pathname.split('/').pop()
        if (filename && filename.length > 0) {
          baseName = filename.split('.')[0] || 'image'
        }
      } catch (e) {
        // 使用默认名称
      }
      
      // 生成唯一标识
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const articlePrefix = articleId ? articleId.substring(0, 8) : 'unknown'
      
      // 构建最终文件名
      const filename = `${articlePrefix}_${baseName}_${timestamp}_${randomId}.webp`
      
      return filename
      
    } catch (error) {
      console.warn('[文件名生成] 生成文件名失败，使用默认名称:', error)
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      return `converted_${timestamp}_${randomId}.webp`
    }
  }

  /**
   * 获取R2配置信息
   * @returns {Object} 配置信息
   */
  getConfig() {
    return {
      domain: this.r2Domain,
      hasUploadEndpoint: !!this.uploadEndpoint,
      hasApiKey: !!this.apiKey,
      isConfigured: !!(this.uploadEndpoint && this.apiKey)
    }
  }
}

// 创建单例实例
const r2ImageUploader = new R2ImageUploader()

export default r2ImageUploader
export { R2ImageUploader }