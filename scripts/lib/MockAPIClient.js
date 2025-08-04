/**
 * 模拟 API 客户端
 * 用于测试和演示目的
 */

class MockAPIClient {
  constructor(engine, config, logger) {
    this.engine = engine;
    this.config = config;
    this.logger = logger;
    this.quotaUsed = 0;
    this.quotaLimit = engine === 'google' ? 200 : 10000;
  }

  async initialize() {
    this.logger.info(`🎭 初始化模拟 ${this.engine.toUpperCase()} API 客户端...`);
    // 模拟初始化延迟
    await this.sleep(500);
    this.logger.info(`✅ 模拟 ${this.engine.toUpperCase()} API 客户端初始化成功`);
  }

  async submitUrls(urls) {
    this.logger.info(`🎭 模拟向 ${this.engine.toUpperCase()} 提交 ${urls.length} 个 URL...`);

    // 模拟提交延迟
    await this.sleep(1000);

    const results = {
      engine: this.engine,
      success: true,
      submittedUrls: [...urls], // 模拟全部成功
      failedUrls: [],
      errors: [],
      quota: {
        used: this.quotaUsed + urls.length,
        remaining: this.quotaLimit - this.quotaUsed - urls.length
      }
    };

    this.quotaUsed += urls.length;

    // 模拟偶尔的失败情况（10% 概率）
    if (Math.random() < 0.1) {
      const failedCount = Math.ceil(urls.length * 0.2); // 20% 失败
      results.failedUrls = urls.slice(-failedCount);
      results.submittedUrls = urls.slice(0, -failedCount);
      results.errors = results.failedUrls.map(url => ({
        url,
        error: '模拟网络错误'
      }));
      results.success = results.submittedUrls.length > 0;
    }

    this.logger.info(`🎭 模拟 ${this.engine.toUpperCase()} 提交完成: 成功 ${results.submittedUrls.length}, 失败 ${results.failedUrls.length}`);

    return results;
  }

  async checkConnection() {
    this.logger.debug(`🎭 模拟 ${this.engine.toUpperCase()} API 连接检查...`);
    await this.sleep(200);
    return true; // 模拟连接总是成功
  }

  getQuotaInfo() {
    return {
      used: this.quotaUsed,
      limit: this.quotaLimit,
      remaining: this.quotaLimit - this.quotaUsed,
      percentage: Math.round((this.quotaUsed / this.quotaLimit) * 100)
    };
  }

  resetQuota() {
    this.quotaUsed = 0;
    this.logger.info(`🎭 模拟 ${this.engine.toUpperCase()} API 配额已重置`);
  }

  getStatus() {
    return {
      initialized: true,
      authenticated: true,
      quota: this.getQuotaInfo(),
      mock: true
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = MockAPIClient;