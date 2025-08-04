/**
 * API错误处理中间件
 * 统一处理API路由中的错误，避免5xx错误暴露给用户
 */

/**
 * 包装API处理函数，添加统一的错误处理
 * @param {Function} handler - API处理函数
 * @returns {Function} - 包装后的处理函数
 */
export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      // 设置默认的错误处理头
      res.setHeader('X-Error-Handler', 'enabled')
      
      // 执行原始处理函数
      await handler(req, res)
    } catch (error) {
      console.error('API Error:', {
        url: req.url,
        method: req.method,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
      
      // 如果响应已经发送，不要再次发送
      if (res.headersSent) {
        return
      }
      
      // 根据错误类型返回适当的状态码
      let statusCode = 500
      let errorMessage = '服务器内部错误'
      
      if (error.name === 'ValidationError') {
        statusCode = 400
        errorMessage = '请求参数错误'
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401
        errorMessage = '未授权访问'
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403
        errorMessage = '禁止访问'
      } else if (error.name === 'NotFoundError') {
        statusCode = 404
        errorMessage = '资源未找到'
      } else if (error.name === 'TimeoutError' || error.code === 'ECONNABORTED') {
        statusCode = 408
        errorMessage = '请求超时'
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        statusCode = 502
        errorMessage = '外部服务不可用'
      } else if (error.name === 'ServiceUnavailableError') {
        statusCode = 503
        errorMessage = '服务暂时不可用'
      }
      
      // 返回统一的错误响应
      res.status(statusCode).json({
        error: true,
        message: errorMessage,
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        // 在开发环境下提供更多错误信息
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
          stack: error.stack
        })
      })
    }
  }
}

/**
 * 创建自定义错误类
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'API_ERROR') {
    super(message)
    this.name = 'APIError'
    this.statusCode = statusCode
    this.code = code
  }
}

export class ValidationError extends APIError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends APIError {
  constructor(message = '未授权访问') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends APIError {
  constructor(message = '禁止访问') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends APIError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class TimeoutError extends APIError {
  constructor(message = '请求超时') {
    super(message, 408, 'TIMEOUT')
    this.name = 'TimeoutError'
  }
}

export class ServiceUnavailableError extends APIError {
  constructor(message = '服务暂时不可用') {
    super(message, 503, 'SERVICE_UNAVAILABLE')
    this.name = 'ServiceUnavailableError'
  }
}