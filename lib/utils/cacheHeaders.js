/**
 * 静态资源缓存策略配置
 * 根据不同资源类型设置不同的缓存策略
 */

/**
 * 获取资源类型的缓存配置
 * @param {string} pathname - 资源路径
 * @returns {Object} 缓存头配置
 */
function getCacheHeaders(pathname) {
  // 静态资源缓存配置
  const cacheConfigs = {
    // 图片资源 - 长期缓存
    images: {
      pattern: /\.(jpg|jpeg|png|gif|webp|avif|ico|svg)$/i,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年
        'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
      }
    },
    
    // 字体文件 - 长期缓存
    fonts: {
      pattern: /\.(woff|woff2|eot|ttf|otf)$/i,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年
        'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
      }
    },
    
    // JavaScript和CSS文件 - 带版本号的长期缓存
    assets: {
      pattern: /\.(js|css)$/i,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable', // 1年
        'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString()
      }
    },
    
    // 视频文件 - 长期缓存
    videos: {
      pattern: /\.(mp4|webm|ogg|avi|mov)$/i,
      headers: {
        'Cache-Control': 'public, max-age=2592000', // 30天
        'Expires': new Date(Date.now() + 2592000 * 1000).toUTCString()
      }
    },
    
    // 音频文件 - 长期缓存
    audio: {
      pattern: /\.(mp3|wav|ogg|aac|flac)$/i,
      headers: {
        'Cache-Control': 'public, max-age=2592000', // 30天
        'Expires': new Date(Date.now() + 2592000 * 1000).toUTCString()
      }
    },
    
    // 文档文件 - 中期缓存
    documents: {
      pattern: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
      headers: {
        'Cache-Control': 'public, max-age=604800', // 7天
        'Expires': new Date(Date.now() + 604800 * 1000).toUTCString()
      }
    },
    
    // API响应 - 短期缓存
    api: {
      pattern: /^\/api\//,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600', // 5分钟客户端，10分钟CDN
        'Expires': new Date(Date.now() + 300 * 1000).toUTCString()
      }
    },
    
    // HTML页面 - 短期缓存，允许重新验证
    html: {
      pattern: /\.(html?)$/i,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Expires': new Date(Date.now()).toUTCString()
      }
    },
    
    // RSS和XML - 中期缓存
    feeds: {
      pattern: /\.(xml|rss)$/i,
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1小时
        'Expires': new Date(Date.now() + 3600 * 1000).toUTCString()
      }
    },
    
    // 清单文件 - 短期缓存
    manifests: {
      pattern: /\.(json|webmanifest)$/i,
      headers: {
        'Cache-Control': 'public, max-age=86400', // 1天
        'Expires': new Date(Date.now() + 86400 * 1000).toUTCString()
      }
    }
  }
  
  // 查找匹配的缓存配置
  for (const [type, config] of Object.entries(cacheConfigs)) {
    if (config.pattern.test(pathname)) {
      return {
        type,
        headers: {
          ...config.headers,
          // 添加通用安全头
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
      }
    }
  }
  
  // 默认缓存策略
  return {
    type: 'default',
    headers: {
      'Cache-Control': 'public, max-age=3600', // 1小时
      'Expires': new Date(Date.now() + 3600 * 1000).toUTCString(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
}

/**
 * 获取ETag值
 * @param {string} content - 内容
 * @param {Object} stats - 文件统计信息
 * @returns {string} ETag值
 */
function generateETag(content, stats) {
  if (stats && stats.mtime) {
    // 基于文件修改时间和大小生成ETag
    return `"${stats.mtime.getTime().toString(16)}-${stats.size.toString(16)}"`
  }
  
  // 基于内容生成简单的ETag
  const crypto = require('crypto')
  const hash = crypto.createHash('md5').update(content).digest('hex')
  return `"${hash.substring(0, 16)}"`
}

/**
 * 检查资源是否需要版本控制
 * @param {string} pathname - 资源路径
 * @returns {boolean} 是否需要版本控制
 */
function needsVersioning(pathname) {
  // 带有hash的文件不需要额外版本控制
  const hasHash = /\.[a-f0-9]{8,}\.(js|css)$/i.test(pathname)
  if (hasHash) return false
  
  // 静态资源需要版本控制
  const staticAssets = /\.(js|css|jpg|jpeg|png|gif|webp|avif|woff|woff2)$/i
  return staticAssets.test(pathname)
}

/**
 * 获取资源的版本号
 * @param {string} pathname - 资源路径
 * @param {Object} stats - 文件统计信息
 * @returns {string} 版本号
 */
function getResourceVersion(pathname, stats) {
  if (stats && stats.mtime) {
    return stats.mtime.getTime().toString(36)
  }
  
  // 使用构建时间作为版本号
  return process.env.BUILD_TIME || Date.now().toString(36)
}

/**
 * 检查条件请求
 * @param {Object} req - 请求对象
 * @param {string} etag - ETag值
 * @param {Date} lastModified - 最后修改时间
 * @returns {boolean} 是否返回304
 */
function checkConditionalRequest(req, etag, lastModified) {
  const ifNoneMatch = req.headers['if-none-match']
  const ifModifiedSince = req.headers['if-modified-since']
  
  // 检查ETag
  if (ifNoneMatch && ifNoneMatch === etag) {
    return true
  }
  
  // 检查Last-Modified
  if (ifModifiedSince && lastModified) {
    const clientTime = new Date(ifModifiedSince)
    const serverTime = new Date(lastModified)
    if (clientTime >= serverTime) {
      return true
    }
  }
  
  return false
}

/**
 * 获取压缩后的缓存键
 * @param {string} pathname - 资源路径
 * @param {string} encoding - 编码类型
 * @returns {string} 缓存键
 */
function getCompressionCacheKey(pathname, encoding) {
  return `${pathname}:${encoding}`
}

module.exports = {
  getCacheHeaders,
  generateETag,
  needsVersioning,
  getResourceVersion,
  checkConditionalRequest,
  getCompressionCacheKey
}