/**
 * 缓存优化工具
 * 提升缓存效率，减少重复请求
 */

// Service Worker 缓存策略
export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Cache] Service Worker registered:', registration)
      })
      .catch((error) => {
        console.log('[Cache] Service Worker registration failed:', error)
      })
  })
}

// 预加载关键资源
export const preloadCriticalResources = () => {
  if (typeof window === 'undefined') return

  const criticalResources = [
    '/_next/static/css/app.css',
    '/_next/static/js/app.js',
    '/fonts/Inter.woff2'
  ]

  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource
    
    if (resource.endsWith('.css')) {
      link.as = 'style'
    } else if (resource.endsWith('.js')) {
      link.as = 'script'
    } else if (resource.includes('font')) {
      link.as = 'font'
      link.type = 'font/woff2'
      link.crossOrigin = 'anonymous'
    }
    
    document.head.appendChild(link)
  })
}

// 预连接到外部域名
export const preconnectExternalDomains = () => {
  if (typeof window === 'undefined') return

  const externalDomains = [
    'https://www.notion.so',
    'https://images.unsplash.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ]

  externalDomains.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = domain
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

// 内存缓存管理
class MemoryCache {
  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key) {
    if (this.cache.has(key)) {
      const item = this.cache.get(key)
      // 移动到最后（LRU）
      this.cache.delete(key)
      this.cache.set(key, item)
      return item.value
    }
    return null
  }

  set(key, value, ttl = 300000) { // 默认5分钟TTL
    if (this.cache.size >= this.maxSize) {
      // 删除最旧的项目
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    const item = {
      value,
      expires: Date.now() + ttl
    }

    this.cache.set(key, item)
  }

  has(key) {
    if (this.cache.has(key)) {
      const item = this.cache.get(key)
      if (Date.now() > item.expires) {
        this.cache.delete(key)
        return false
      }
      return true
    }
    return false
  }

  clear() {
    this.cache.clear()
  }
}

export const memoryCache = new MemoryCache()

// 初始化缓存优化
export const initCacheOptimization = () => {
  if (typeof window === 'undefined') return

  preloadCriticalResources()
  preconnectExternalDomains()
  registerServiceWorker()
}