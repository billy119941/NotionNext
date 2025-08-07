/**
 * 压缩格式支持检测工具
 * 用于检测浏览器对Brotli和Gzip的支持情况
 */

/**
 * 检测浏览器压缩支持情况
 * @returns {Promise<Object>} 支持情况对象
 */
export async function detectCompressionSupport() {
  if (typeof window === 'undefined') {
    return {
      brotli: false,
      gzip: false,
      deflate: false,
      environment: 'server'
    }
  }

  const support = {
    brotli: false,
    gzip: false,
    deflate: false,
    environment: 'browser',
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  }

  try {
    // 方法1: 检查fetch API支持的压缩格式
    if (typeof fetch !== 'undefined') {
      try {
        const testResponse = await fetch('/api/compression-test?format=stats', {
          method: 'HEAD',
          headers: {
            'Accept-Encoding': 'br, gzip, deflate'
          }
        })
        
        const contentEncoding = testResponse.headers.get('content-encoding')
        if (contentEncoding) {
          support.brotli = contentEncoding.includes('br')
          support.gzip = contentEncoding.includes('gzip')
          support.deflate = contentEncoding.includes('deflate')
        }
      } catch (error) {
        console.warn('[CompressionDetection] Fetch检测失败:', error)
      }
    }

    // 方法2: 基于User Agent的启发式检测
    const userAgent = navigator.userAgent.toLowerCase()
    
    // Brotli支持检测 (Chrome 50+, Firefox 44+, Safari 14+, Edge 15+)
    if (!support.brotli) {
      support.brotli = detectBrotliFromUserAgent(userAgent)
    }
    
    // Gzip支持检测 (几乎所有现代浏览器都支持)
    if (!support.gzip) {
      support.gzip = detectGzipFromUserAgent(userAgent)
    }
    
    // Deflate支持检测
    if (!support.deflate) {
      support.deflate = detectDeflateFromUserAgent(userAgent)
    }

    // 方法3: 特性检测
    if (typeof CompressionStream !== 'undefined') {
      try {
        // 检测浏览器原生压缩API支持
        const brotliStream = new CompressionStream('gzip')
        support.nativeCompression = true
        brotliStream.readable.cancel()
      } catch (error) {
        support.nativeCompression = false
      }
    }

  } catch (error) {
    console.error('[CompressionDetection] 检测过程出错:', error)
  }

  return support
}

/**
 * 基于User Agent检测Brotli支持
 * @param {string} userAgent - 用户代理字符串
 * @returns {boolean} 是否支持Brotli
 */
function detectBrotliFromUserAgent(userAgent) {
  // Chrome 50+ (发布于2016年4月)
  const chromeMatch = userAgent.match(/chrome\/(\d+)/)
  if (chromeMatch && parseInt(chromeMatch[1]) >= 50) {
    return true
  }

  // Firefox 44+ (发布于2016年1月)
  const firefoxMatch = userAgent.match(/firefox\/(\d+)/)
  if (firefoxMatch && parseInt(firefoxMatch[1]) >= 44) {
    return true
  }

  // Safari 14+ (发布于2020年9月)
  const safariMatch = userAgent.match(/version\/(\d+).*safari/)
  if (safariMatch && parseInt(safariMatch[1]) >= 14) {
    return true
  }

  // Edge 15+ (发布于2017年4月)
  const edgeMatch = userAgent.match(/edge\/(\d+)/)
  if (edgeMatch && parseInt(edgeMatch[1]) >= 15) {
    return true
  }

  // Opera 36+ (基于Chromium)
  const operaMatch = userAgent.match(/opr\/(\d+)/)
  if (operaMatch && parseInt(operaMatch[1]) >= 36) {
    return true
  }

  return false
}

/**
 * 基于User Agent检测Gzip支持
 * @param {string} userAgent - 用户代理字符串
 * @returns {boolean} 是否支持Gzip
 */
function detectGzipFromUserAgent(userAgent) {
  // 几乎所有现代浏览器都支持Gzip
  // 只排除非常老的浏览器
  
  // IE 6+ 支持Gzip
  const ieMatch = userAgent.match(/msie (\d+)/)
  if (ieMatch && parseInt(ieMatch[1]) >= 6) {
    return true
  }

  // 所有现代浏览器都支持
  if (userAgent.includes('chrome') || 
      userAgent.includes('firefox') || 
      userAgent.includes('safari') || 
      userAgent.includes('edge') || 
      userAgent.includes('opera')) {
    return true
  }

  // 默认假设支持（保守估计）
  return true
}

/**
 * 基于User Agent检测Deflate支持
 * @param {string} userAgent - 用户代理字符串
 * @returns {boolean} 是否支持Deflate
 */
function detectDeflateFromUserAgent(userAgent) {
  // Deflate支持比Gzip更广泛，几乎所有浏览器都支持
  return detectGzipFromUserAgent(userAgent)
}

/**
 * 获取推荐的压缩格式
 * @param {Object} support - 支持情况对象
 * @returns {string} 推荐的压缩格式
 */
export function getRecommendedCompression(support) {
  if (support.brotli) {
    return 'brotli'
  } else if (support.gzip) {
    return 'gzip'
  } else if (support.deflate) {
    return 'deflate'
  } else {
    return 'none'
  }
}

/**
 * 缓存压缩支持检测结果
 */
class CompressionSupportCache {
  constructor() {
    this.cache = new Map()
    this.cacheExpiry = 24 * 60 * 60 * 1000 // 24小时
  }

  /**
   * 获取缓存的支持情况
   * @param {string} userAgent - 用户代理字符串
   * @returns {Object|null} 缓存的支持情况或null
   */
  get(userAgent) {
    const key = this.generateKey(userAgent)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  /**
   * 设置缓存
   * @param {string} userAgent - 用户代理字符串
   * @param {Object} support - 支持情况对象
   */
  set(userAgent, support) {
    const key = this.generateKey(userAgent)
    this.cache.set(key, {
      data: support,
      timestamp: Date.now()
    })
    
    // 清理过期缓存
    this.cleanup()
  }

  /**
   * 生成缓存键
   * @param {string} userAgent - 用户代理字符串
   * @returns {string} 缓存键
   */
  generateKey(userAgent) {
    // 简化User Agent以减少缓存键的数量
    const simplified = userAgent
      .toLowerCase()
      .replace(/\d+\.\d+\.\d+/g, 'x.x.x') // 替换版本号
      .replace(/\s+/g, ' ')
      .trim()
    
    return simplified
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.cacheExpiry) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 获取缓存统计
   * @returns {Object} 缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      expiry: this.cacheExpiry,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 创建全局缓存实例
const compressionSupportCache = new CompressionSupportCache()

/**
 * 带缓存的压缩支持检测
 * @returns {Promise<Object>} 支持情况对象
 */
export async function detectCompressionSupportCached() {
  if (typeof window === 'undefined') {
    return detectCompressionSupport()
  }

  const userAgent = navigator.userAgent
  
  // 尝试从缓存获取
  const cached = compressionSupportCache.get(userAgent)
  if (cached) {
    return { ...cached, fromCache: true }
  }

  // 执行检测
  const support = await detectCompressionSupport()
  
  // 缓存结果
  compressionSupportCache.set(userAgent, support)
  
  return { ...support, fromCache: false }
}

/**
 * 测试压缩效果
 * @param {string} testData - 测试数据
 * @returns {Promise<Object>} 压缩测试结果
 */
export async function testCompressionEffectiveness(testData = null) {
  const defaultTestData = testData || 'This is a test string for compression effectiveness. '.repeat(100)
  
  try {
    const response = await fetch('/api/compression-test?format=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'br, gzip, deflate'
      },
      body: JSON.stringify({ testData: defaultTestData })
    })

    const contentEncoding = response.headers.get('content-encoding')
    const contentLength = response.headers.get('content-length')
    const originalSize = response.headers.get('x-original-size')
    const compressionRatio = response.headers.get('x-compression-ratio')

    return {
      success: true,
      encoding: contentEncoding,
      compressedSize: parseInt(contentLength) || 0,
      originalSize: parseInt(originalSize) || 0,
      compressionRatio: parseFloat(compressionRatio) || 0,
      testDataSize: defaultTestData.length,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

export { compressionSupportCache }