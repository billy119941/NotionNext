/**
 * 压缩中间件
 * 支持Brotli和Gzip压缩，自动选择最优压缩格式
 */

const zlib = require('zlib')
const { promisify } = require('util')

// 压缩配置
const COMPRESSION_CONFIG = {
  brotli: {
    enabled: true,
    quality: 6, // Brotli质量 (0-11, 11为最高)
    threshold: 1024, // 最小压缩阈值 (bytes)
    chunkSize: 16 * 1024, // 16KB chunks
    windowBits: 22, // 窗口大小 (10-24)
    mode: zlib.constants.BROTLI_MODE_TEXT // 文本模式
  },
  gzip: {
    enabled: true,
    level: 6, // Gzip压缩级别 (1-9, 9为最高)
    threshold: 1024, // 最小压缩阈值 (bytes)
    chunkSize: 16 * 1024, // 16KB chunks
    windowBits: 15,
    memLevel: 8
  },
  // 可压缩的MIME类型
  compressibleTypes: [
    'text/html',
    'text/css',
    'text/javascript',
    'text/xml',
    'text/plain',
    'application/javascript',
    'application/json',
    'application/xml',
    'application/rss+xml',
    'application/atom+xml',
    'image/svg+xml',
    'application/font-woff',
    'application/font-woff2',
    'font/woff',
    'font/woff2',
    'application/vnd.ms-fontobject',
    'font/ttf',
    'font/otf'
  ]
}

/**
 * 检测浏览器是否支持Brotli压缩
 * @param {string} acceptEncoding - Accept-Encoding头
 * @returns {boolean} 是否支持Brotli
 */
function supportsBrotli(acceptEncoding) {
  if (!acceptEncoding) return false
  return acceptEncoding.toLowerCase().includes('br')
}

/**
 * 检测浏览器是否支持Gzip压缩
 * @param {string} acceptEncoding - Accept-Encoding头
 * @returns {boolean} 是否支持Gzip
 */
function supportsGzip(acceptEncoding) {
  if (!acceptEncoding) return false
  return acceptEncoding.toLowerCase().includes('gzip')
}

/**
 * 检查内容类型是否可压缩
 * @param {string} contentType - 内容类型
 * @returns {boolean} 是否可压缩
 */
function isCompressible(contentType) {
  if (!contentType) return false
  
  const type = contentType.toLowerCase().split(';')[0].trim()
  return COMPRESSION_CONFIG.compressibleTypes.includes(type) ||
         type.startsWith('text/') ||
         type.includes('json') ||
         type.includes('xml')
}

/**
 * 检查内容是否应该被压缩
 * @param {number} contentLength - 内容长度
 * @param {string} contentType - 内容类型
 * @param {string} compressionType - 压缩类型 ('brotli' | 'gzip')
 * @returns {boolean} 是否应该压缩
 */
function shouldCompress(contentLength, contentType, compressionType = 'gzip') {
  const config = COMPRESSION_CONFIG[compressionType]
  
  if (!config || !config.enabled) return false
  if (!isCompressible(contentType)) return false
  if (contentLength < config.threshold) return false
  
  return true
}

/**
 * Brotli压缩函数
 * @param {Buffer} buffer - 要压缩的数据
 * @returns {Promise<Buffer>} 压缩后的数据
 */
async function compressBrotli(buffer) {
  const brotliCompress = promisify(zlib.brotliCompress)
  
  const options = {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: COMPRESSION_CONFIG.brotli.quality,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
      [zlib.constants.BROTLI_PARAM_MODE]: COMPRESSION_CONFIG.brotli.mode,
      [zlib.constants.BROTLI_PARAM_LGWIN]: COMPRESSION_CONFIG.brotli.windowBits
    },
    chunkSize: COMPRESSION_CONFIG.brotli.chunkSize
  }
  
  try {
    const compressed = await brotliCompress(buffer, options)
    return compressed
  } catch (error) {
    console.error('[Compression] Brotli压缩失败:', error)
    throw error
  }
}

/**
 * Gzip压缩函数
 * @param {Buffer} buffer - 要压缩的数据
 * @returns {Promise<Buffer>} 压缩后的数据
 */
async function compressGzip(buffer) {
  const gzipCompress = promisify(zlib.gzip)
  
  const options = {
    level: COMPRESSION_CONFIG.gzip.level,
    chunkSize: COMPRESSION_CONFIG.gzip.chunkSize,
    windowBits: COMPRESSION_CONFIG.gzip.windowBits,
    memLevel: COMPRESSION_CONFIG.gzip.memLevel
  }
  
  try {
    const compressed = await gzipCompress(buffer, options)
    return compressed
  } catch (error) {
    console.error('[Compression] Gzip压缩失败:', error)
    throw error
  }
}

/**
 * 选择最优压缩格式
 * @param {string} acceptEncoding - Accept-Encoding头
 * @returns {string|null} 选择的压缩格式
 */
function selectCompressionFormat(acceptEncoding) {
  if (!acceptEncoding) return null
  
  // 优先选择Brotli（压缩率更高）
  if (COMPRESSION_CONFIG.brotli.enabled && supportsBrotli(acceptEncoding)) {
    return 'brotli'
  }
  
  // 降级到Gzip
  if (COMPRESSION_CONFIG.gzip.enabled && supportsGzip(acceptEncoding)) {
    return 'gzip'
  }
  
  return null
}

/**
 * 压缩响应数据
 * @param {Buffer} buffer - 响应数据
 * @param {string} format - 压缩格式
 * @returns {Promise<{data: Buffer, encoding: string}>} 压缩结果
 */
async function compressResponse(buffer, format) {
  const startTime = Date.now()
  
  try {
    let compressedData
    let encoding
    
    switch (format) {
      case 'brotli':
        compressedData = await compressBrotli(buffer)
        encoding = 'br'
        break
      case 'gzip':
        compressedData = await compressGzip(buffer)
        encoding = 'gzip'
        break
      default:
        throw new Error(`不支持的压缩格式: ${format}`)
    }
    
    const compressionTime = Date.now() - startTime
    const originalSize = buffer.length
    const compressedSize = compressedData.length
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2)
    
    // 开发环境输出压缩统计
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Compression] ${format.toUpperCase()}压缩完成:`)
      console.log(`  - 原始大小: ${(originalSize / 1024).toFixed(2)} KB`)
      console.log(`  - 压缩大小: ${(compressedSize / 1024).toFixed(2)} KB`)
      console.log(`  - 压缩率: ${compressionRatio}%`)
      console.log(`  - 压缩时间: ${compressionTime}ms`)
    }
    
    return {
      data: compressedData,
      encoding,
      stats: {
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio),
        compressionTime,
        format
      }
    }
  } catch (error) {
    console.error(`[Compression] ${format}压缩失败:`, error)
    throw error
  }
}

/**
 * Next.js中间件：自动压缩响应
 * @param {import('next').NextRequest} req - 请求对象
 * @param {import('next').NextResponse} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
function compressionMiddleware(req, res, next) {
  const originalSend = res.send
  const originalJson = res.json
  const originalEnd = res.end
  
  // 重写res.send方法
  res.send = function(data) {
    return handleCompression.call(this, data, originalSend, 'send')
  }
  
  // 重写res.json方法
  res.json = function(data) {
    return handleCompression.call(this, JSON.stringify(data), originalJson, 'json', data)
  }
  
  // 重写res.end方法
  res.end = function(data) {
    if (data) {
      return handleCompression.call(this, data, originalEnd, 'end')
    }
    return originalEnd.call(this, data)
  }
  
  async function handleCompression(data, originalMethod, methodType, originalData = null) {
    const acceptEncoding = req.headers['accept-encoding']
    const contentType = this.getHeader('content-type') || 'text/html'
    
    // 检查是否已经设置了压缩编码
    if (this.getHeader('content-encoding')) {
      return originalMethod.call(this, methodType === 'json' ? originalData : data)
    }
    
    // 转换数据为Buffer
    let buffer
    if (Buffer.isBuffer(data)) {
      buffer = data
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data, 'utf8')
    } else {
      buffer = Buffer.from(String(data), 'utf8')
    }
    
    // 选择压缩格式
    const compressionFormat = selectCompressionFormat(acceptEncoding)
    
    if (!compressionFormat || !shouldCompress(buffer.length, contentType, compressionFormat)) {
      return originalMethod.call(this, methodType === 'json' ? originalData : data)
    }
    
    try {
      const result = await compressResponse(buffer, compressionFormat)
      
      // 设置压缩相关头部
      this.setHeader('Content-Encoding', result.encoding)
      this.setHeader('Content-Length', result.data.length)
      this.setHeader('Vary', 'Accept-Encoding')
      
      // 添加压缩统计头部（开发环境）
      if (process.env.NODE_ENV === 'development') {
        this.setHeader('X-Compression-Ratio', result.stats.compressionRatio)
        this.setHeader('X-Compression-Time', result.stats.compressionTime)
        this.setHeader('X-Original-Size', result.stats.originalSize)
      }
      
      return originalMethod.call(this, result.data)
    } catch (error) {
      console.error('[Compression] 压缩中间件错误:', error)
      // 压缩失败时返回原始数据
      return originalMethod.call(this, methodType === 'json' ? originalData : data)
    }
  }
  
  next()
}

/**
 * 获取压缩配置
 * @returns {Object} 压缩配置
 */
function getCompressionConfig() {
  return { ...COMPRESSION_CONFIG }
}

/**
 * 更新压缩配置
 * @param {Object} newConfig - 新的配置
 */
function updateCompressionConfig(newConfig) {
  Object.assign(COMPRESSION_CONFIG, newConfig)
}

/**
 * 获取压缩统计信息
 * @returns {Object} 统计信息
 */
function getCompressionStats() {
  return {
    brotliEnabled: COMPRESSION_CONFIG.brotli.enabled,
    gzipEnabled: COMPRESSION_CONFIG.gzip.enabled,
    brotliQuality: COMPRESSION_CONFIG.brotli.quality,
    gzipLevel: COMPRESSION_CONFIG.gzip.level,
    threshold: Math.min(COMPRESSION_CONFIG.brotli.threshold, COMPRESSION_CONFIG.gzip.threshold),
    supportedTypes: COMPRESSION_CONFIG.compressibleTypes.length
  }
}

module.exports = {
  compressionMiddleware,
  compressBrotli,
  compressGzip,
  selectCompressionFormat,
  shouldCompress,
  supportsBrotli,
  supportsGzip,
  isCompressible,
  getCompressionConfig,
  updateCompressionConfig,
  getCompressionStats,
  COMPRESSION_CONFIG
}