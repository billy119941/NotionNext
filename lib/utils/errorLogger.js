/**
 * 错误日志记录系统
 * 用于收集和分析5xx错误，帮助改善SEO表现
 */

class ErrorLogger {
  constructor() {
    this.errors = []
    this.maxErrors = 100 // 最多保存100个错误记录
  }

  /**
   * 记录错误
   * @param {Object} errorInfo - 错误信息
   */
  log(errorInfo) {
    const error = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : errorInfo.url,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : errorInfo.userAgent,
      ...errorInfo
    }

    this.errors.unshift(error)
    
    // 保持错误记录数量在限制内
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors)
    }

    // 在开发环境下打印错误
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', error)
    }

    // 如果是5xx错误，立即发送到监控服务
    if (error.statusCode >= 500 && error.statusCode < 600) {
      this.sendToMonitoring(error)
    }

    // 保存到本地存储（仅在浏览器环境）
    if (typeof window !== 'undefined') {
      try {
        const savedErrors = JSON.parse(localStorage.getItem('notionNext_errors') || '[]')
        savedErrors.unshift(error)
        localStorage.setItem('notionNext_errors', JSON.stringify(savedErrors.slice(0, 50)))
      } catch (e) {
        console.warn('Failed to save error to localStorage:', e)
      }
    }
  }

  /**
   * 发送错误到监控服务
   * @param {Object} error - 错误信息
   */
  async sendToMonitoring(error) {
    try {
      // 这里可以集成第三方监控服务，如Sentry、LogRocket等
      // 目前只是发送到自己的API端点
      if (typeof window !== 'undefined') {
        fetch('/api/error-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(error)
        }).catch(e => {
          console.warn('Failed to send error to monitoring:', e)
        })
      }
    } catch (e) {
      console.warn('Error in sendToMonitoring:', e)
    }
  }

  /**
   * 获取错误统计
   */
  getStats() {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const oneDay = 24 * oneHour

    const recentErrors = this.errors.filter(e => 
      now - new Date(e.timestamp).getTime() < oneHour
    )

    const todayErrors = this.errors.filter(e => 
      now - new Date(e.timestamp).getTime() < oneDay
    )

    const statusCodeStats = {}
    this.errors.forEach(error => {
      const code = error.statusCode || 'unknown'
      statusCodeStats[code] = (statusCodeStats[code] || 0) + 1
    })

    return {
      total: this.errors.length,
      recentHour: recentErrors.length,
      today: todayErrors.length,
      statusCodes: statusCodeStats,
      mostCommonErrors: this.getMostCommonErrors(),
      criticalErrors: this.errors.filter(e => e.statusCode >= 500).length
    }
  }

  /**
   * 获取最常见的错误
   */
  getMostCommonErrors() {
    const errorCounts = {}
    this.errors.forEach(error => {
      const key = `${error.statusCode}-${error.message || 'unknown'}`
      errorCounts[key] = (errorCounts[key] || 0) + 1
    })

    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }))
  }

  /**
   * 清除错误记录
   */
  clear() {
    this.errors = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('notionNext_errors')
    }
  }

  /**
   * 获取所有错误
   */
  getErrors() {
    return this.errors
  }

  /**
   * 从本地存储恢复错误记录
   */
  restoreFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const savedErrors = JSON.parse(localStorage.getItem('notionNext_errors') || '[]')
        this.errors = savedErrors.slice(0, this.maxErrors)
      } catch (e) {
        console.warn('Failed to restore errors from localStorage:', e)
      }
    }
  }
}

// 创建全局错误记录器实例
const errorLogger = new ErrorLogger()

// 在浏览器环境下恢复错误记录
if (typeof window !== 'undefined') {
  errorLogger.restoreFromStorage()
  
  // 监听未捕获的错误
  window.addEventListener('error', (event) => {
    errorLogger.log({
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    })
  })

  // 监听未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.log({
      type: 'unhandled_promise_rejection',
      message: event.reason?.message || 'Unhandled promise rejection',
      stack: event.reason?.stack
    })
  })
}

export default errorLogger