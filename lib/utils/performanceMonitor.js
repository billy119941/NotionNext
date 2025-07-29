/**
 * 性能监控工具
 * 监控 Core Web Vitals 和其他性能指标
 */

// 监控 Core Web Vitals
export const reportWebVitals = (metric) => {
  if (typeof window === 'undefined') return

  const { name, value, id } = metric
  
  // 发送到分析服务
  if (process.env.NODE_ENV === 'production') {
    // 可以发送到 Google Analytics 或其他分析服务
    console.log(`[Performance] ${name}: ${value}`)
    
    // 示例：发送到自定义分析端点
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        value,
        id,
        url: window.location.href,
        timestamp: Date.now()
      })
    }).catch(console.error)
  }
}

// 监控资源加载时间
export const monitorResourceTiming = () => {
  if (typeof window === 'undefined' || !window.performance) return

  window.addEventListener('load', () => {
    setTimeout(() => {
      const resources = performance.getEntriesByType('resource')
      const slowResources = resources.filter(resource => resource.duration > 1000)
      
      if (slowResources.length > 0) {
        console.warn('[Performance] Slow resources detected:', slowResources)
      }
    }, 1000)
  })
}

// 监控长任务
export const monitorLongTasks = () => {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn('[Performance] Long task detected:', {
          duration: entry.duration,
          startTime: entry.startTime
        })
      }
    })
    
    observer.observe({ entryTypes: ['longtask'] })
  } catch (error) {
    console.warn('[Performance] Long task monitoring not supported')
  }
}

// 监控布局偏移
export const monitorLayoutShift = () => {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.value > 0.1) { // CLS 阈值
          console.warn('[Performance] Layout shift detected:', {
            value: entry.value,
            sources: entry.sources
          })
        }
      }
    })
    
    observer.observe({ entryTypes: ['layout-shift'] })
  } catch (error) {
    console.warn('[Performance] Layout shift monitoring not supported')
  }
}

// 初始化性能监控
export const initPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return

  monitorResourceTiming()
  monitorLongTasks()
  monitorLayoutShift()
  
  // 监控内存使用
  if (performance.memory) {
    setInterval(() => {
      const memory = performance.memory
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        console.warn('[Performance] High memory usage detected:', {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
        })
      }
    }, 30000) // 每30秒检查一次
  }
}