/**
 * Google Indexing API 客户端
 * 负责向 Google 搜索引擎提交 URL
 */

const { google } = require('googleapis');

class GoogleIndexingClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.quotaLimit = config.google.quotaLimit || 200;
    this.quotaUsed = 0;
    this.auth = null;
    this.indexing = null;
  }

  /**
   * 初始化 Google API 客户端
   */
  async initialize() {
    try {
      this.logger.info('🔑 初始化 Google Indexing API 客户端...');

      // 从环境变量获取服务账户密钥
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('缺少 GOOGLE_SERVICE_ACCOUNT_KEY 环境变量');
      }

      // 解析服务账户密钥
      let credentials;
      try {
        credentials = JSON.parse(serviceAccountKey);
      } catch (error) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 格式无效，必须是有效的 JSON');
      }

      // 创建 JWT 客户端
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        this.config.google.scopes || ['https://www.googleapis.com/auth/indexing']
      );

      // 设置更宽松的网络配置
      this.auth.gaxios.defaults.timeout = 60000; // 60秒超时
      this.auth.gaxios.defaults.retry = 3; // 重试3次

      // 创建 Indexing API 客户端
      this.indexing = google.indexing({
        version: 'v3',
        auth: this.auth
      });

      // 验证认证
      await this.auth.authorize();
      this.logger.info('✅ Google Indexing API 客户端初始化成功');

    } catch (error) {
      this.logger.error('❌ Google Indexing API 客户端初始化失败', error);
      throw error;
    }
  }

  /**
   * 提交 URL 到 Google
   * @param {string[]} urls URL 数组
   * @returns {Promise<Object>} 提交结果
   */
  async submitUrls(urls) {
    if (!this.indexing) {
      await this.initialize();
    }

    this.logger.info(`📤 开始向 Google 提交 ${urls.length} 个 URL...`);

    const results = {
      engine: 'google',
      success: true,
      submittedUrls: [],
      failedUrls: [],
      errors: [],
      quota: {
        used: this.quotaUsed,
        remaining: this.quotaLimit - this.quotaUsed
      }
    };

    // 检查配额限制
    if (this.quotaUsed >= this.quotaLimit) {
      const error = new Error(`Google API 配额已耗尽 (${this.quotaUsed}/${this.quotaLimit})`);
      results.success = false;
      results.errors.push(error);
      results.failedUrls = [...urls];
      this.logger.warn('⚠️ Google API 配额已耗尽，跳过提交');
      return results;
    }

    // 计算可提交的 URL 数量
    const availableQuota = this.quotaLimit - this.quotaUsed;
    const urlsToSubmit = urls.slice(0, availableQuota);
    const skippedUrls = urls.slice(availableQuota);

    if (skippedUrls.length > 0) {
      this.logger.warn(`⚠️ 配额不足，跳过 ${skippedUrls.length} 个 URL`);
      results.failedUrls.push(...skippedUrls);
    }

    // 逐个提交 URL
    for (const url of urlsToSubmit) {
      try {
        await this.submitSingleUrl(url);
        results.submittedUrls.push(url);
        this.quotaUsed++;
        this.logger.debug(`✅ 成功提交到 Google: ${url}`);

        // 添加延迟以避免触发速率限制
        await this.sleep(100);

      } catch (error) {
        results.failedUrls.push(url);
        results.errors.push({
          url,
          error: error.message
        });
        this.logger.warn(`❌ 提交到 Google 失败: ${url}`, { error: error.message });
      }
    }

    // 更新配额信息
    results.quota.used = this.quotaUsed;
    results.quota.remaining = this.quotaLimit - this.quotaUsed;

    // 判断整体是否成功
    results.success = results.submittedUrls.length > 0;

    this.logger.info(`📊 Google 提交完成: 成功 ${results.submittedUrls.length}, 失败 ${results.failedUrls.length}`);

    return results;
  }

  /**
   * 提交单个 URL
   * @private
   */
  async submitSingleUrl(url) {
    const requestBody = {
      url: url,
      type: 'URL_UPDATED'
    };

    try {
      const response = await this.indexing.urlNotifications.publish({
        requestBody
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.data;

    } catch (error) {
      // 处理特定的 Google API 错误
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;

        switch (status) {
          case 400:
            throw new Error(`请求格式错误: ${message}`);
          case 401:
            throw new Error(`认证失败: ${message}`);
          case 403:
            if (message.includes('quota')) {
              throw new Error(`配额超限: ${message}`);
            } else {
              throw new Error(`权限不足: ${message}`);
            }
          case 429:
            throw new Error(`请求过于频繁: ${message}`);
          case 500:
          case 502:
          case 503:
            throw new Error(`Google 服务器错误: ${message}`);
          default:
            throw new Error(`Google API 错误 (${status}): ${message}`);
        }
      } else {
        throw new Error(`网络错误: ${error.message}`);
      }
    }
  }

  /**
   * 获取配额使用情况
   * @returns {Object} 配额信息
   */
  getQuotaInfo() {
    return {
      used: this.quotaUsed,
      limit: this.quotaLimit,
      remaining: this.quotaLimit - this.quotaUsed,
      percentage: Math.round((this.quotaUsed / this.quotaLimit) * 100)
    };
  }

  /**
   * 重置配额计数器（通常在新的一天开始时调用）
   */
  resetQuota() {
    this.quotaUsed = 0;
    this.logger.info('🔄 Google API 配额已重置');
  }

  /**
   * 检查 API 连接状态
   * @returns {Promise<boolean>} 连接是否正常
   */
  async checkConnection() {
    try {
      if (!this.auth) {
        await this.initialize();
      }

      // 尝试获取访问令牌来验证连接
      const accessToken = await this.auth.getAccessToken();
      
      if (accessToken.token) {
        this.logger.debug('✅ Google API 连接正常');
        return true;
      } else {
        this.logger.warn('⚠️ Google API 连接异常：无法获取访问令牌');
        return false;
      }

    } catch (error) {
      this.logger.error('❌ Google API 连接检查失败', error);
      return false;
    }
  }

  /**
   * 获取 API 状态信息
   * @returns {Object} API 状态
   */
  getStatus() {
    return {
      initialized: !!this.indexing,
      authenticated: !!this.auth,
      quota: this.getQuotaInfo()
    };
  }

  /**
   * 延迟执行
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = GoogleIndexingClient;