/**
 * 错误处理器
 * 负责处理各种错误情况，实现重试机制和错误分类
 */

const { sleep } = require('./utils');

class ErrorHandler {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.retryConfig = config.retry || {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    };
  }

  /**
   * 带重试的操作执行
   * @param {Function} operation 要执行的操作
   * @param {Object} context 操作上下文信息
   * @returns {Promise<any>} 操作结果
   */
  async withRetry(operation, context = {}) {
    const { maxAttempts, backoffMultiplier, initialDelay } = this.retryConfig;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`🔄 执行操作 (尝试 ${attempt}/${maxAttempts})`, context);
        return await operation();
      } catch (error) {
        lastError = error;
        
        const errorType = this.classifyError(error);
        this.logger.warn(`❌ 操作失败 (尝试 ${attempt}/${maxAttempts}): ${error.message}`, {
          errorType,
          context
        });

        // 如果是不可重试的错误，直接抛出
        if (!this.isRetryableError(error)) {
          this.logger.error('🚫 不可重试的错误，停止重试', { error: error.message });
          throw error;
        }

        // 如果是最后一次尝试，抛出错误
        if (attempt === maxAttempts) {
          this.logger.error('🔴 所有重试尝试都失败了', { 
            totalAttempts: maxAttempts,
            finalError: error.message 
          });
          throw error;
        }

        // 计算延迟时间
        const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
        this.logger.info(`⏳ 等待 ${delay}ms 后重试...`);
        await sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 分类错误类型
   * @param {Error} error 错误对象
   * @returns {string} 错误类型
   */
  classifyError(error) {
    const message = error.message.toLowerCase();

    // 网络相关错误
    if (message.includes('timeout') || 
        message.includes('econnaborted') ||
        message.includes('network') ||
        message.includes('connection')) {
      return 'NETWORK_ERROR';
    }

    // API 认证错误
    if (message.includes('unauthorized') || 
        message.includes('authentication') ||
        message.includes('invalid credentials') ||
        message.includes('401')) {
      return 'AUTH_ERROR';
    }

    // API 权限错误
    if (message.includes('forbidden') || 
        message.includes('permission') ||
        message.includes('403')) {
      return 'PERMISSION_ERROR';
    }

    // API 配额错误
    if (message.includes('quota') || 
        message.includes('rate limit') ||
        message.includes('429')) {
      return 'QUOTA_ERROR';
    }

    // 服务器错误
    if (message.includes('500') || 
        message.includes('502') ||
        message.includes('503') ||
        message.includes('504') ||
        message.includes('server error')) {
      return 'SERVER_ERROR';
    }

    // 请求格式错误
    if (message.includes('400') || 
        message.includes('bad request') ||
        message.includes('invalid')) {
      return 'REQUEST_ERROR';
    }

    // 未知错误
    return 'UNKNOWN_ERROR';
  }

  /**
   * 判断错误是否可重试
   * @param {Error} error 错误对象
   * @returns {boolean} 是否可重试
   */
  isRetryableError(error) {
    const errorType = this.classifyError(error);

    // 可重试的错误类型
    const retryableErrors = [
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'QUOTA_ERROR'  // 配额错误可以重试，但通常需要等待更长时间
    ];

    return retryableErrors.includes(errorType);
  }

  /**
   * 处理批量操作的错误
   * @param {Array} results 批量操作结果
   * @param {Array} originalItems 原始项目列表
   * @returns {Object} 处理后的结果
   */
  processBatchResults(results, originalItems) {
    const processed = {
      successful: [],
      failed: [],
      errors: [],
      summary: {
        total: originalItems.length,
        successful: 0,
        failed: 0,
        successRate: 0
      }
    };

    results.forEach((result, index) => {
      const item = originalItems[index];
      
      if (result.status === 'fulfilled') {
        processed.successful.push({
          item,
          result: result.value
        });
      } else {
        processed.failed.push({
          item,
          error: result.reason
        });
        processed.errors.push({
          item,
          errorType: this.classifyError(result.reason),
          message: result.reason.message
        });
      }
    });

    // 计算统计信息
    processed.summary.successful = processed.successful.length;
    processed.summary.failed = processed.failed.length;
    processed.summary.successRate = processed.summary.total > 0 
      ? Math.round((processed.summary.successful / processed.summary.total) * 100)
      : 0;

    return processed;
  }

  /**
   * 记录错误统计
   * @param {Array} errors 错误列表
   */
  logErrorStatistics(errors) {
    if (errors.length === 0) {
      return;
    }

    // 按错误类型分组
    const errorStats = {};
    errors.forEach(error => {
      const type = error.errorType || 'UNKNOWN_ERROR';
      errorStats[type] = (errorStats[type] || 0) + 1;
    });

    this.logger.warn('📊 错误统计', { errorStats });

    // 记录最常见的错误
    const sortedErrors = Object.entries(errorStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    if (sortedErrors.length > 0) {
      this.logger.warn('🔝 最常见的错误类型', { 
        topErrors: sortedErrors.map(([type, count]) => ({ type, count }))
      });
    }
  }

  /**
   * 生成错误报告
   * @param {Object} results 操作结果
   * @returns {Object} 错误报告
   */
  generateErrorReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        successRate: 0
      },
      errorBreakdown: {},
      recommendations: []
    };

    // 处理不同类型的结果
    if (Array.isArray(results)) {
      // 批量结果
      results.forEach(result => {
        report.summary.totalOperations++;
        if (result.success) {
          report.summary.successfulOperations++;
        } else {
          report.summary.failedOperations++;
          
          // 统计错误类型
          result.errors?.forEach(error => {
            const errorType = this.classifyError(error);
            report.errorBreakdown[errorType] = (report.errorBreakdown[errorType] || 0) + 1;
          });
        }
      });
    } else if (results.errors) {
      // 单个结果
      report.summary.totalOperations = 1;
      if (results.success) {
        report.summary.successfulOperations = 1;
      } else {
        report.summary.failedOperations = 1;
        results.errors.forEach(error => {
          const errorType = this.classifyError(error);
          report.errorBreakdown[errorType] = (report.errorBreakdown[errorType] || 0) + 1;
        });
      }
    }

    // 计算成功率
    if (report.summary.totalOperations > 0) {
      report.summary.successRate = Math.round(
        (report.summary.successfulOperations / report.summary.totalOperations) * 100
      );
    }

    // 生成建议
    report.recommendations = this.generateRecommendations(report.errorBreakdown);

    return report;
  }

  /**
   * 根据错误类型生成建议
   * @private
   */
  generateRecommendations(errorBreakdown) {
    const recommendations = [];

    Object.entries(errorBreakdown).forEach(([errorType, count]) => {
      switch (errorType) {
        case 'NETWORK_ERROR':
          recommendations.push('检查网络连接和防火墙设置');
          break;
        case 'AUTH_ERROR':
          recommendations.push('验证 API 密钥和认证配置');
          break;
        case 'PERMISSION_ERROR':
          recommendations.push('检查 API 权限和服务账户配置');
          break;
        case 'QUOTA_ERROR':
          recommendations.push('检查 API 配额使用情况，考虑增加配额或调整提交频率');
          break;
        case 'SERVER_ERROR':
          recommendations.push('API 服务器可能存在问题，稍后重试');
          break;
        case 'REQUEST_ERROR':
          recommendations.push('检查请求格式和参数是否正确');
          break;
      }
    });

    return [...new Set(recommendations)]; // 去重
  }
}

module.exports = ErrorHandler;