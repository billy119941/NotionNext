/**
 * 搜索引擎提交器
 * 统一管理向 Google 和 Bing 提交 URL 的功能
 */

const GoogleIndexingClient = require('./GoogleIndexingClient');
const BingWebmasterClient = require('./BingWebmasterClient');
const MockAPIClient = require('./MockAPIClient');
const ErrorHandler = require('./ErrorHandler');

class SearchEngineSubmitter {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.errorHandler = new ErrorHandler(config, logger);
    
    // 检查是否使用模拟模式
    const useMockMode = process.env.MOCK_API_CALLS === 'true';
    const disableGoogle = process.env.DISABLE_GOOGLE_API === 'true';
    const disableBing = process.env.DISABLE_BING_API === 'true';

    if (useMockMode) {
      logger.info('🎭 启用模拟 API 模式');
      this.googleClient = new MockAPIClient('google', config, logger);
      this.bingClient = new MockAPIClient('bing', config, logger);
    } else {
      // 初始化真实的搜索引擎客户端
      this.googleClient = disableGoogle ? null : new GoogleIndexingClient(config, logger);
      this.bingClient = disableBing ? null : new BingWebmasterClient(config, logger);
    }
    
    // 提交统计
    this.stats = {
      totalSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      engines: {
        google: { submitted: 0, successful: 0, failed: 0 },
        bing: { submitted: 0, successful: 0, failed: 0 }
      }
    };
  }

  /**
   * 初始化所有搜索引擎客户端
   */
  async initialize() {
    this.logger.info('🚀 初始化搜索引擎提交器...');

    const initTasks = [];

    // 并行初始化客户端
    if (this.googleClient) {
      initTasks.push(
        this.errorHandler.withRetry(
          () => this.googleClient.initialize(),
          { engine: 'google', operation: 'initialize' }
        ).catch(error => {
          this.logger.error('❌ Google 客户端初始化失败', error);
          return { error, engine: 'google' };
        })
      );
    }

    if (this.bingClient) {
      initTasks.push(
        this.errorHandler.withRetry(
          () => this.bingClient.initialize(),
          { engine: 'bing', operation: 'initialize' }
        ).catch(error => {
          this.logger.error('❌ Bing 客户端初始化失败', error);
          return { error, engine: 'bing' };
        })
      );
    }

    const results = await Promise.allSettled(initTasks);
    
    // 检查初始化结果
    const failedEngines = [];
    results.forEach((result, index) => {
      const engine = index === 0 ? 'google' : 'bing';
      if (result.status === 'rejected' || result.value?.error) {
        failedEngines.push(engine);
      }
    });

    if (failedEngines.length === 2) {
      throw new Error('所有搜索引擎客户端初始化都失败了');
    } else if (failedEngines.length === 1) {
      this.logger.warn(`⚠️ ${failedEngines[0]} 客户端初始化失败，将只使用其他搜索引擎`);
    }

    this.logger.info('✅ 搜索引擎提交器初始化完成');
  }

  /**
   * 向所有搜索引擎提交 URL
   * @param {string[]} urls URL 数组
   * @returns {Promise<Object>} 提交结果
   */
  async submitUrls(urls) {
    if (!urls || urls.length === 0) {
      this.logger.warn('⚠️ 没有 URL 需要提交');
      return this.createEmptyResult();
    }

    this.logger.info(`🎯 开始向搜索引擎提交 ${urls.length} 个 URL...`);

    const submissionTasks = [];
    const results = {
      success: false,
      totalUrls: urls.length,
      submittedUrls: [],
      failedUrls: [],
      results: [],
      summary: {
        totalEngines: 0,
        successfulEngines: 0,
        failedEngines: 0
      }
    };

    // 并行提交到各个搜索引擎
    if (this.googleClient) {
      submissionTasks.push(
        this.submitToGoogle(urls).catch(error => ({
          engine: 'google',
          success: false,
          error: error.message,
          submittedUrls: [],
          failedUrls: [...urls],
          errors: [error]
        }))
      );
    }

    if (this.bingClient) {
      submissionTasks.push(
        this.submitToBing(urls).catch(error => ({
          engine: 'bing',
          success: false,
          error: error.message,
          submittedUrls: [],
          failedUrls: [...urls],
          errors: [error]
        }))
      );
    }

    // 等待所有提交完成
    const submissionResults = await Promise.allSettled(submissionTasks);

    // 处理提交结果
    submissionResults.forEach((result, index) => {
      const engine = index === 0 ? 'google' : 'bing';
      let engineResult;

      if (result.status === 'fulfilled') {
        engineResult = result.value;
      } else {
        engineResult = {
          engine,
          success: false,
          error: result.reason.message,
          submittedUrls: [],
          failedUrls: [...urls],
          errors: [result.reason]
        };
      }

      results.results.push(engineResult);
      results.summary.totalEngines++;

      if (engineResult.success) {
        results.summary.successfulEngines++;
        // 合并成功提交的 URL（去重）
        engineResult.submittedUrls.forEach(url => {
          if (!results.submittedUrls.includes(url)) {
            results.submittedUrls.push(url);
          }
        });
      } else {
        results.summary.failedEngines++;
      }

      // 更新统计信息
      this.updateStats(engineResult);
    });

    // 计算失败的 URL（在所有引擎中都失败的 URL）
    results.failedUrls = urls.filter(url => 
      !results.submittedUrls.includes(url)
    );

    // 判断整体是否成功（至少一个引擎成功）
    results.success = results.summary.successfulEngines > 0;

    // 记录最终结果
    this.logSubmissionSummary(results);

    return results;
  }

  /**
   * 提交到 Google
   * @private
   */
  async submitToGoogle(urls) {
    this.logger.info('🔍 开始提交到 Google...');
    
    return await this.errorHandler.withRetry(
      () => this.googleClient.submitUrls(urls),
      { engine: 'google', operation: 'submit', urlCount: urls.length }
    );
  }

  /**
   * 提交到 Bing
   * @private
   */
  async submitToBing(urls) {
    this.logger.info('🔍 开始提交到 Bing...');
    
    return await this.errorHandler.withRetry(
      () => this.bingClient.submitUrls(urls),
      { engine: 'bing', operation: 'submit', urlCount: urls.length }
    );
  }

  /**
   * 检查所有搜索引擎的连接状态
   * @returns {Promise<Object>} 连接状态
   */
  async checkConnections() {
    this.logger.info('🔍 检查搜索引擎连接状态...');

    const connectionTasks = [
      this.googleClient.checkConnection().catch(() => false),
      this.bingClient.checkConnection().catch(() => false)
    ];

    const [googleConnected, bingConnected] = await Promise.all(connectionTasks);

    const status = {
      google: {
        connected: googleConnected,
        status: this.googleClient.getStatus()
      },
      bing: {
        connected: bingConnected,
        status: this.bingClient.getStatus()
      },
      overall: {
        connectedEngines: (googleConnected ? 1 : 0) + (bingConnected ? 1 : 0),
        totalEngines: 2
      }
    };

    this.logger.info('📊 连接状态检查完成', {
      google: googleConnected ? '✅' : '❌',
      bing: bingConnected ? '✅' : '❌'
    });

    return status;
  }

  /**
   * 获取配额使用情况
   * @returns {Object} 配额信息
   */
  getQuotaInfo() {
    return {
      google: this.googleClient ? this.googleClient.getQuotaInfo() : null,
      bing: this.bingClient ? this.bingClient.getQuotaInfo() : null
    };
  }

  /**
   * 重置所有配额计数器
   */
  resetQuotas() {
    this.googleClient.resetQuota();
    this.bingClient.resetQuota();
    this.logger.info('🔄 所有搜索引擎配额已重置');
  }

  /**
   * 获取提交统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalSubmissions > 0 
        ? Math.round((this.stats.successfulSubmissions / this.stats.totalSubmissions) * 100)
        : 0
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      engines: {
        google: { submitted: 0, successful: 0, failed: 0 },
        bing: { submitted: 0, successful: 0, failed: 0 }
      }
    };
    this.logger.info('📊 提交统计信息已重置');
  }

  /**
   * 更新统计信息
   * @private
   */
  updateStats(result) {
    const engine = result.engine;
    const submitted = result.submittedUrls.length;
    const failed = result.failedUrls.length;

    this.stats.engines[engine].submitted += submitted + failed;
    this.stats.engines[engine].successful += submitted;
    this.stats.engines[engine].failed += failed;

    // 更新总体统计（避免重复计算）
    this.stats.totalSubmissions = Math.max(
      this.stats.totalSubmissions,
      submitted + failed
    );
    
    if (result.success) {
      this.stats.successfulSubmissions = Math.max(
        this.stats.successfulSubmissions,
        submitted
      );
    }
  }

  /**
   * 记录提交摘要
   * @private
   */
  logSubmissionSummary(results) {
    const summary = {
      totalUrls: results.totalUrls,
      submittedUrls: results.submittedUrls.length,
      failedUrls: results.failedUrls.length,
      successfulEngines: results.summary.successfulEngines,
      totalEngines: results.summary.totalEngines,
      successRate: results.totalUrls > 0 
        ? Math.round((results.submittedUrls.length / results.totalUrls) * 100)
        : 0
    };

    if (results.success) {
      this.logger.info('🎉 URL 提交完成', summary);
    } else {
      this.logger.error('❌ URL 提交失败', summary);
    }

    // 记录各引擎的详细结果
    results.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      this.logger.info(`${status} ${result.engine.toUpperCase()}: 成功 ${result.submittedUrls.length}, 失败 ${result.failedUrls.length}`);
    });
  }

  /**
   * 创建空结果对象
   * @private
   */
  createEmptyResult() {
    return {
      success: true,
      totalUrls: 0,
      submittedUrls: [],
      failedUrls: [],
      results: [],
      summary: {
        totalEngines: 0,
        successfulEngines: 0,
        failedEngines: 0
      }
    };
  }
}

module.exports = SearchEngineSubmitter;