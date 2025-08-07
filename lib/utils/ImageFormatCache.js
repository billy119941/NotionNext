/**
 * 图片格式缓存管理工具
 * 用于缓存WebP支持检测结果和格式选择策略
 */
class ImageFormatCache {
  constructor() {
    this.memoryCache = new Map()
    this.cachePrefix = 'image-format-cache'
    this.maxCacheSize = 1000
    this.cacheExpiry = 24 * 60 * 60 * 1000 // 24小时
  }

  /**
   * 生成缓存键
   * @param {string} type - 缓存类型 ('webp-support', 'format-selection', 'image-metadata')
   * @param {string} key - 具体键值
   * @returns {string} 缓存键
   */
  generateCacheKey(type, key) {
    return `${this.cachePrefix}_${type}_${key}`
  }

  /**
   * 设置内存缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 生存时间（毫秒）
   */
  setMemoryCache(key, value, ttl = this.cacheExpiry) {
    // 清理过期缓存
    this.cleanExpiredCache()
    
    // 如果缓存已满，删除最旧的项
    if (this.memoryCache.size >= this.maxCacheSize) {
      const firstKey = this.memoryCache.keys().next().value
      this.memoryCache.delete(firstKey)
    }

    this.memoryCache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * 获取内存缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值或null
   */
  getMemoryCache(key) {
    const cached = this.memoryCache.get(key)
    
    if (!cached) {
      return null
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.memoryCache.delete(key)
      return null
    }

    return cached.value
  }

  /**
   * 设置localStorage缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 生存时间（毫秒）
   */
  setLocalStorageCache(key, value, ttl = this.cacheExpiry) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }

    try {
      const cacheData = {
        value,
        timestamp: Date.now(),
        ttl
      }
      
      localStorage.setItem(key, JSON.stringify(cacheData))
      return true
    } catch (error) {
      console.warn('[ImageFormatCache] localStorage设置失败:', error)
      return false
    }
  }

  /**
   * 获取localStorage缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值或null
   */
  getLocalStorageCache(key) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null
    }

    try {
      const cached = localStorage.getItem(key)
      if (!cached) {
        return null
      }

      const cacheData = JSON.parse(cached)
      
      // 检查是否过期
      if (Date.now() - cacheData.timestamp > cacheData.ttl) {
        localStorage.removeItem(key)
        return null
      }

      return cacheData.value
    } catch (error) {
      console.warn('[ImageFormatCache] localStorage读取失败:', error)
      return null
    }
  }

  /**
   * 缓存WebP支持检测结果
   * @param {string} userAgent - 用户代理字符串
   * @param {boolean} supported - 是否支持WebP
   */
  cacheWebPSupport(userAgent, supported) {
    const key = this.generateCacheKey('webp-support', this.hashString(userAgent))
    
    // 同时缓存到内存和localStorage
    this.setMemoryCache(key, supported, this.cacheExpiry)
    this.setLocalStorageCache(key, supported, this.cacheExpiry)
  }

  /**
   * 获取WebP支持检测结果
   * @param {string} userAgent - 用户代理字符串
   * @returns {boolean|null} 支持结果或null
   */
  getWebPSupport(userAgent) {
    const key = this.generateCacheKey('webp-support', this.hashString(userAgent))
    
    // 优先从内存缓存获取
    let result = this.getMemoryCache(key)
    if (result !== null) {
      return result
    }

    // 从localStorage获取
    result = this.getLocalStorageCache(key)
    if (result !== null) {
      // 同步到内存缓存
      this.setMemoryCache(key, result)
      return result
    }

    return null
  }

  /**
   * 缓存格式选择结果
   * @param {string} imageUrl - 图片URL
   * @param {string} selectedFormat - 选中的格式
   * @param {Object} metadata - 元数据
   */
  cacheFormatSelection(imageUrl, selectedFormat, metadata = {}) {
    const key = this.generateCacheKey('format-selection', this.hashString(imageUrl))
    
    const cacheData = {
      selectedFormat,
      metadata,
      url: imageUrl,
      timestamp: Date.now()
    }

    this.setMemoryCache(key, cacheData, this.cacheExpiry)
    this.setLocalStorageCache(key, cacheData, this.cacheExpiry)
  }

  /**
   * 获取格式选择结果
   * @param {string} imageUrl - 图片URL
   * @returns {Object|null} 格式选择结果或null
   */
  getFormatSelection(imageUrl) {
    const key = this.generateCacheKey('format-selection', this.hashString(imageUrl))
    
    // 优先从内存缓存获取
    let result = this.getMemoryCache(key)
    if (result !== null) {
      return result
    }

    // 从localStorage获取
    result = this.getLocalStorageCache(key)
    if (result !== null) {
      // 同步到内存缓存
      this.setMemoryCache(key, result)
      return result
    }

    return null
  }

  /**
   * 缓存图片元数据
   * @param {string} imageUrl - 图片URL
   * @param {Object} metadata - 图片元数据
   */
  cacheImageMetadata(imageUrl, metadata) {
    const key = this.generateCacheKey('image-metadata', this.hashString(imageUrl))
    
    const cacheData = {
      ...metadata,
      url: imageUrl,
      cachedAt: Date.now()
    }

    this.setMemoryCache(key, cacheData, this.cacheExpiry)
    this.setLocalStorageCache(key, cacheData, this.cacheExpiry)
  }

  /**
   * 获取图片元数据
   * @param {string} imageUrl - 图片URL
   * @returns {Object|null} 图片元数据或null
   */
  getImageMetadata(imageUrl) {
    const key = this.generateCacheKey('image-metadata', this.hashString(imageUrl))
    
    // 优先从内存缓存获取
    let result = this.getMemoryCache(key)
    if (result !== null) {
      return result
    }

    // 从localStorage获取
    result = this.getLocalStorageCache(key)
    if (result !== null) {
      // 同步到内存缓存
      this.setMemoryCache(key, result)
      return result
    }

    return null
  }

  /**
   * 清理过期的内存缓存
   */
  cleanExpiredCache() {
    const now = Date.now()
    
    for (const [key, cached] of this.memoryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.memoryCache.delete(key)
      }
    }
  }

  /**
   * 清理所有缓存
   */
  clearAllCache() {
    // 清理内存缓存
    this.memoryCache.clear()
    
    // 清理localStorage缓存
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(this.cachePrefix)) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('[ImageFormatCache] 清理localStorage失败:', error)
      }
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    const memorySize = this.memoryCache.size
    let localStorageSize = 0
    
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Object.keys(localStorage)
        localStorageSize = keys.filter(key => key.startsWith(this.cachePrefix)).length
      } catch (error) {
        console.warn('[ImageFormatCache] 获取localStorage统计失败:', error)
      }
    }

    return {
      memoryCache: {
        size: memorySize,
        maxSize: this.maxCacheSize,
        usage: `${((memorySize / this.maxCacheSize) * 100).toFixed(1)}%`
      },
      localStorage: {
        size: localStorageSize
      },
      cacheExpiry: this.cacheExpiry,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 简单字符串哈希函数
   * @param {string} str - 输入字符串
   * @returns {string} 哈希值
   */
  hashString(str) {
    let hash = 0
    if (str.length === 0) return hash.toString()
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36)
  }

  /**
   * 预热缓存（批量设置常用数据）
   * @param {Array} preloadData - 预加载数据数组
   */
  preloadCache(preloadData = []) {
    preloadData.forEach(item => {
      const { type, key, value, ttl } = item
      const cacheKey = this.generateCacheKey(type, key)
      
      this.setMemoryCache(cacheKey, value, ttl || this.cacheExpiry)
      this.setLocalStorageCache(cacheKey, value, ttl || this.cacheExpiry)
    })
  }
}

// 创建单例实例
const imageFormatCache = new ImageFormatCache()

export default imageFormatCache
export { ImageFormatCache }