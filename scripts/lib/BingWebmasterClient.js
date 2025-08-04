/**
 * Bing Webmaster API 客户端
 * 负责向 Bing 搜索引擎提交 URL
 */

const axios = require('axios');

class BingWebmasterClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    // 使用 IndexNow API 替代传统的 Bing Webmaster API
    this.apiUrl = config.bing.webmasterApiUrl || 'https://api.indexnow.org/indexnow';
    this.useIndexNow = true;
    this.quotaLimit = config.bing.quotaLimit || 10000;
    this.quotaUsed = 0;
    this.apiKey = null;
    this.siteUrl = null;
  }

  /**
   * 初始化 Bing API 客户端
   */
  async initialize() {
    try {
      this.logger.info('🔑 初始化 Bing Webmaster API 客户端...');

      // 从环境变量获取 API 密钥
      this.apiKey = process.env.BING_API_KEY;
      if (!this.apiKey) {
        throw new Error('缺少 BING_API_KEY 环境变量');
      }

      // 从配置中提取网站主机名
      this.siteUrl = this.extractSiteUrl(this.config.sitemap.url);
      this.hostname = this.extractHostname(this.config.sitemap.url);
      if (!this.siteUrl || !this.hostname) {
        throw new Error('无法从 sitemap URL 中提取网站地址');
      }

      this.logger.info('✅ Bing IndexNow API 客户端初始化成功', { 
        siteUrl: this.siteUrl,
        hostname: this.hostname,
        apiType: 'IndexNow'
      });

    } catch (error) {
      this.logger.error('❌ Bing Webmaster API 客户端初始化失败', error);
      throw error;
    }
  }

  /**
   * 提交 URL 到 Bing
   * @param {string[]} urls URL 数组
   * @returns {Promise<Object>} 提交结果
   */
  async submitUrls(urls) {
    if (!this.apiKey) {
      await this.initialize();
    }

    this.logger.info(`📤 开始向 Bing 提交 ${urls.length} 个 URL...`);

    const results = {
      engine: 'bing',
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
      const error = new Error(`Bing API 配额已耗尽 (${this.quotaUsed}/${this.quotaLimit})`);
      results.success = false;
      results.errors.push(error);
      results.failedUrls = [...urls];
      this.logger.warn('⚠️ Bing API 配额已耗尽，跳过提交');
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

    // Bing API 支持批量提交，但建议每次不超过 10 个 URL
    const batchSize = 10;
    const batches = this.chunkArray(urlsToSubmit, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.logger.debug(`📦 提交批次 ${i + 1}/${batches.length}，包含 ${batch.length} 个 URL`);

      try {
        const batchResult = await this.submitBatch(batch);
        
        // 处理批次结果
        if (batchResult.success) {
          results.submittedUrls.push(...batch);
          this.quotaUsed += batch.length;
          this.logger.debug(`✅ 批次 ${i + 1} 提交成功`);
        } else {
          results.failedUrls.push(...batch);
          results.errors.push({
            batch: i + 1,
            urls: batch,
            error: batchResult.error
          });
          this.logger.warn(`❌ 批次 ${i + 1} 提交失败: ${batchResult.error}`);
        }

        // 添加延迟以避免触发速率限制
        if (i < batches.length - 1) {
          await this.sleep(1000);
        }

      } catch (error) {
        results.failedUrls.push(...batch);
        results.errors.push({
          batch: i + 1,
          urls: batch,
          error: error.message
        });
        this.logger.warn(`❌ 批次 ${i + 1} 提交异常: ${error.message}`);
      }
    }

    // 更新配额信息
    results.quota.used = this.quotaUsed;
    results.quota.remaining = this.quotaLimit - this.quotaUsed;

    // 判断整体是否成功
    results.success = results.submittedUrls.length > 0;

    this.logger.info(`📊 Bing 提交完成: 成功 ${results.submittedUrls.length}, 失败 ${results.failedUrls.length}`);

    return results;
  }

  /**
   * 提交单个批次到 Bing (使用 IndexNow API)
   * @private
   */
  async submitBatch(urls) {
    this.logger.debug(`🔍 使用 ${this.useIndexNow ? 'IndexNow' : 'Legacy'} API 提交批次`);
    
    if (this.useIndexNow) {
      return this.submitBatchIndexNow(urls);
    } else {
      return this.submitBatchLegacy(urls);
    }
  }

  /**
   * 使用 IndexNow API 提交批次
   * @private
   */
  async submitBatchIndexNow(urls) {
    this.logger.debug('🚀 使用 IndexNow API 提交', { 
      apiUrl: this.apiUrl,
      hostname: this.hostname,
      urlCount: urls.length 
    });

    const requestData = {
      host: this.hostname,
      key: this.apiKey,
      urlList: urls
    };

    try {
      const response = await axios.post(this.apiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // IndexNow API 成功响应通常是 202 状态码
      if (response.status === 200 || response.status === 202) {
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * 使用传统 Bing Webmaster API 提交批次
   * @private
   */
  async submitBatchLegacy(urls) {
    const requestData = {
      siteUrl: this.siteUrl,
      urlList: urls
    };

    try {
      const response = await axios.post(this.apiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        timeout: 30000
      });

      if (response.status === 200) {
        // Bing API 成功响应
        const responseData = response.data;
        
        // 检查响应中是否有错误信息
        if (responseData.ErrorCode) {
          throw new Error(`Bing API 错误 (${responseData.ErrorCode}): ${responseData.Message}`);
        }

        return {
          success: true,
          data: responseData
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * 解析和处理错误
   * @private
   */
  parseError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          return `请求格式错误: ${data?.Message || error.message}`;
        case 401:
          return `API 密钥无效或已过期: ${data?.Message || error.message}`;
        case 403:
          return `权限不足或网站未验证: ${data?.Message || error.message}`;
        case 429:
          return `请求过于频繁，已触发速率限制: ${data?.Message || error.message}`;
        case 500:
        case 502:
        case 503:
          return `Bing 服务器错误: ${data?.Message || error.message}`;
        default:
          return `Bing API 错误 (${status}): ${data?.Message || error.message}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      return '请求超时，请检查网络连接';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return '无法连接到 Bing API 服务器';
    } else {
      return `网络错误: ${error.message}`;
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
   * 重置配额计数器
   */
  resetQuota() {
    this.quotaUsed = 0;
    this.logger.info('🔄 Bing API 配额已重置');
  }

  /**
   * 检查 API 连接状态
   * @returns {Promise<boolean>} 连接是否正常
   */
  async checkConnection() {
    try {
      if (!this.apiKey) {
        await this.initialize();
      }

      // 测试 IndexNow API 连接
      const testData = this.useIndexNow ? {
        host: this.hostname,
        key: this.apiKey,
        urlList: []
      } : {
        siteUrl: this.siteUrl,
        urlList: []
      };

      const headers = {
        'Content-Type': 'application/json'
      };

      if (!this.useIndexNow) {
        headers['apikey'] = this.apiKey;
      }

      const response = await axios.post(this.apiUrl, testData, {
        headers: headers,
        timeout: 10000
      });

      if (response.status === 200 || response.status === 202) {
        this.logger.debug('✅ Bing IndexNow API 连接正常');
        return true;
      } else {
        this.logger.warn(`⚠️ Bing IndexNow API 连接异常: HTTP ${response.status}`);
        return false;
      }

    } catch (error) {
      this.logger.error('❌ Bing API 连接检查失败', { error: error.message });
      return false;
    }
  }

  /**
   * 获取 API 状态信息
   * @returns {Object} API 状态
   */
  getStatus() {
    return {
      initialized: !!this.apiKey,
      siteUrl: this.siteUrl,
      quota: this.getQuotaInfo()
    };
  }

  /**
   * 从 sitemap URL 提取网站地址
   * @private
   */
  extractSiteUrl(sitemapUrl) {
    try {
      const url = new URL(sitemapUrl);
      return `${url.protocol}//${url.hostname}`;
    } catch {
      return null;
    }
  }

  /**
   * 从 sitemap URL 提取主机名
   * @private
   */
  extractHostname(sitemapUrl) {
    try {
      const url = new URL(sitemapUrl);
      return url.hostname;
    } catch {
      return null;
    }
  }

  /**
   * 将数组分割成指定大小的块
   * @private
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延迟执行
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BingWebmasterClient;