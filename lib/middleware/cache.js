/**
 * 静态资源缓存中间件
 * 实现智能缓存策略和条件请求处理
 */

const { getCacheHeaders, generateETag, checkConditionalRequest, getCompressionCacheKey } = require('../utils/cacheHeaders')
const fs = require('fs')
const path = require('path')

// 内存缓存存储
const memoryCache = new Map()
const MEMORY_CACHE_SIZE_LIMIT = 50 * 1024 * 1024 // 50MB
let currentCacheSize = 0

/**
 * 缓存统计信息
 */
const cacheStats = {
  hits: 0,
  misses: 0,
  size: 0,
  lastCleanup: Date.now()
}

/**
 * 清理过期的内存缓存
 */
function cleanupMemoryCache() {
  const now = Date.now()
  const CLEANUP_INTERVAL = 30 * 60 * 1000 // 30分钟
  
  if (now - cacheStats.lastCleanup < CLEANUP_INTERVAL) {
    return
  }
  
  let cleanedSize = 0
  const entries = Array.from(memoryCache.entries())
  
  // 按访问时间排序，删除最久未访问的条目
  entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess)
  
  // 如果缓存超过限制，删除一半的条目
  if (currentCacheSize > MEMORY_CACHE_SIZE_LIMIT) {
    const toDelete = Math.floor(entries.length / 2)
    for (let i = 0; i < toDelete; i++) {
      const [key, value] = entries[i]
      cleanedSize += value.size
      memoryCache.delete(key)
    }
    currentCacheSize -= cleanedSize
  }
  
  cacheStats.lastCleanup = now
  cacheStats.size = memoryCache.size
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] 清理完成，释放 ${(cleanedSize / 1024 / 1024).toFixed(2)}MB，当前缓存大小: ${(currentCacheSize / 1024 / 1024).toFixed(2)}MB`)
  }
}

/**
 * 从内存缓存获取资源
 * @param {string} key - 缓存键
 * @returns {Object|null} 缓存的资源
 */
function getFromMemoryCache(key) {
  const cached = memoryCache.get(key)
  if (cached) {
    cached.lastAccess = Date.now()
    cacheStats.hits++
    return cached
  }
  cacheStats.misses++
  return null
}

/**
 * 存储资源到内存缓存
 * @param {string} key - 缓存键
 * @param {Object} data - 要缓存的数据
 */
function setMemoryCache(key, data) {
  // 检查缓存大小限制
  if (currentCacheSize + data.size > MEMORY_CACHE_SIZE_LIMIT) {
    cleanupMemoryCache()
  }
  
  // 如果仍然超过限制，不缓存大文件
  if (data.size > MEMORY_CACHE_SIZE_LIMIT / 10) {
    return
  }
  
  memoryCache.set(key, {
    ...data,
    lastAccess: Date.now()
  })
  
  currentCacheSize += data.size
  cacheStats.size = memoryCache.size
}

/**
 * 缓存中间件主函数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
async function cacheMiddleware(req, res, next) {
  // 只处理GET请求
  if (req.method !== 'GET') {
    return next()
  }
  
  const pathname = req.url.split('?')[0]
  
  // 跳过API路由和动态路由
  if (pathname.startsWith('/api/') || pathname.includes('[') || pathname.includes('{')) {
    return next()
  }
  
  try {
    // 获取缓存配置
    const cacheConfig = getCacheHeaders(pathname)
    
    // 检查内存缓存
    const encoding = req.headers['accept-encoding'] || ''
    const cacheKey = getCompressionCacheKey(pathname, encoding)
    const cached = getFromMemoryCache(cacheKey)
    
    if (cached) {
      // 检查条件请求
      if (checkConditionalRequest(req, cached.etag, cached.lastModified)) {
        res.status(304).end()
        return
      }
      
      // 设置缓存头
      Object.entries(cacheConfig.headers).forEach(([key, value]) => {
        res.setHeader(key, value)
      })
      
      // 设置ETag和Last-Modified
      if (cached.etag) {
        res.setHeader('ETag', cached.etag)
      }
      if (cached.lastModified) {
        res.setHeader('Last-Modified', cached.lastModified.toUTCString())
      }
      
      // 设置内容类型
      if (cached.contentType) {
        res.setHeader('Content-Type', cached.contentType)
      }
      
      // 设置内容编码
      if (cached.encoding) {
        res.setHeader('Content-Encoding', cached.encoding)
      }
      
      res.status(200).send(cached.content)
      return
    }
    
    // 尝试从文件系统读取
    const filePath = path.join(process.cwd(), 'public', pathname)
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      const content = fs.readFileSync(filePath)
      const etag = generateETag(content, stats)
      
      // 检查条件请求
      if (checkConditionalRequest(req, etag, stats.mtime)) {
        res.status(304).end()
        return
      }
      
      // 确定内容类型
      const contentType = getContentType(pathname)
      
      // 缓存到内存
      const cacheData = {
        content,
        etag,
        lastModified: stats.mtime,
        contentType,
        size: content.length
      }
      
      setMemoryCache(cacheKey, cacheData)
      
      // 设置响应头
      Object.entries(cacheConfig.headers).forEach(([key, value]) => {
        res.setHeader(key, value)
      })
      
      res.setHeader('ETag', etag)
      res.setHeader('Last-Modified', stats.mtime.toUTCString())
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', content.length)
      
      res.status(200).send(content)
      return
    }
    
    // 文件不存在，继续到下一个中间件
    next()
    
  } catch (error) {
    console.error('[Cache] 缓存中间件错误:', error)
    next()
  }
}

/**
 * 获取文件的内容类型
 * @param {string} pathname - 文件路径
 * @returns {string} 内容类型
 */
function getContentType(pathname) {
  const ext = path.extname(pathname).toLowerCase()
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * 获取缓存统计信息
 * @returns {Object} 缓存统计
 */
function getCacheStats() {
  return {
    ...cacheStats,
    memoryUsage: `${(currentCacheSize / 1024 / 1024).toFixed(2)}MB`,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
      : '0%'
  }
}

/**
 * 清空缓存
 */
function clearCache() {
  memoryCache.clear()
  currentCacheSize = 0
  cacheStats.hits = 0
  cacheStats.misses = 0
  cacheStats.size = 0
  cacheStats.lastCleanup = Date.now()
}

/**
 * 预热缓存 - 预加载常用资源
 * @param {Array} paths - 要预加载的路径列表
 */
async function warmupCache(paths = []) {
  const defaultPaths = [
    '/favicon.ico',
    '/images/avatar.png',
    '/css/globals.css'
  ]
  
  const pathsToWarm = [...defaultPaths, ...paths]
  
  for (const pathname of pathsToWarm) {
    try {
      const filePath = path.join(process.cwd(), 'public', pathname)
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        const content = fs.readFileSync(filePath)
        const etag = generateETag(content, stats)
        const contentType = getContentType(pathname)
        
        const cacheData = {
          content,
          etag,
          lastModified: stats.mtime,
          contentType,
          size: content.length
        }
        
        setMemoryCache(pathname, cacheData)
      }
    } catch (error) {
      console.warn(`[Cache] 预热缓存失败: ${pathname}`, error.message)
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] 预热完成，缓存了 ${pathsToWarm.length} 个资源`)
  }
}

module.exports = {
  cacheMiddleware,
  getCacheStats,
  clearCache,
  warmupCache
}