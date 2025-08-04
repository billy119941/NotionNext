/**
 * 缓存管理器
 * 负责管理 sitemap 缓存和提交记录
 */

const path = require('path');
const { readJsonFile, writeJsonFile, ensureDir } = require('./utils');

class CacheManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.cacheDir = config.cache.directory || '.cache';
    this.sitemapCacheFile = path.join(this.cacheDir, config.cache.sitemapCacheFile || 'sitemap-cache.json');
    this.submissionLogFile = path.join(this.cacheDir, config.cache.submissionLogFile || 'submission-log.json');
  }

  /**
   * 初始化缓存目录
   */
  async initialize() {
    try {
      await ensureDir(this.cacheDir);
      this.logger.debug(`📁 缓存目录已准备: ${this.cacheDir}`);
    } catch (error) {
      this.logger.error('❌ 初始化缓存目录失败', error);
      throw error;
    }
  }

  /**
   * 获取缓存的 sitemap 数据
   * @returns {Promise<Object|null>} 缓存的 sitemap 数据
   */
  async getCachedSitemap() {
    try {
      const cachedData = await readJsonFile(this.sitemapCacheFile);
      
      if (cachedData) {
        // 验证缓存数据的有效性
        if (this.isValidSitemapCache(cachedData)) {
          this.logger.debug(`📋 成功读取 sitemap 缓存，包含 ${cachedData.urls?.length || 0} 个 URL`);
          return cachedData;
        } else {
          this.logger.warn('⚠️ sitemap 缓存数据格式无效，将忽略');
          return null;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.warn('⚠️ 读取 sitemap 缓存失败', error);
      return null;
    }
  }

  /**
   * 保存 sitemap 缓存
   * @param {Object} sitemapData sitemap 数据
   */
  async saveSitemapCache(sitemapData) {
    try {
      // 添加缓存元数据
      const cacheData = {
        ...sitemapData,
        cachedAt: new Date().toISOString(),
        version: '1.0'
      };

      await writeJsonFile(this.sitemapCacheFile, cacheData);
      this.logger.debug('💾 成功保存 sitemap 缓存');
    } catch (error) {
      this.logger.error('❌ 保存 sitemap 缓存失败', error);
      throw error;
    }
  }

  /**
   * 获取提交日志
   * @returns {Promise<Object>} 提交日志数据
   */
  async getSubmissionLog() {
    try {
      const logData = await readJsonFile(this.submissionLogFile);
      
      if (logData && this.isValidSubmissionLog(logData)) {
        this.logger.debug('📊 成功读取提交日志');
        return logData;
      }
      
      // 返回默认的日志结构
      return this.createDefaultSubmissionLog();
    } catch (error) {
      this.logger.warn('⚠️ 读取提交日志失败，使用默认结构', error);
      return this.createDefaultSubmissionLog();
    }
  }

  /**
   * 保存提交日志
   * @param {Object} logData 日志数据
   */
  async saveSubmissionLog(logData) {
    try {
      const updatedLog = {
        ...logData,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };

      await writeJsonFile(this.submissionLogFile, updatedLog);
      this.logger.debug('📝 成功保存提交日志');
    } catch (error) {
      this.logger.error('❌ 保存提交日志失败', error);
      throw error;
    }
  }

  /**
   * 记录提交结果
   * @param {Object} submissionResult 提交结果
   */
  async recordSubmission(submissionResult) {
    try {
      const log = await this.getSubmissionLog();
      
      // 添加新的提交记录
      const newEntry = {
        timestamp: new Date().toISOString(),
        ...submissionResult
      };

      log.submissions.unshift(newEntry);
      
      // 只保留最近的 100 条记录
      if (log.submissions.length > 100) {
        log.submissions = log.submissions.slice(0, 100);
      }

      // 更新统计信息
      this.updateStatistics(log, submissionResult);

      await this.saveSubmissionLog(log);
      this.logger.debug('📈 成功记录提交结果');
    } catch (error) {
      this.logger.error('❌ 记录提交结果失败', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Promise<Object>} 缓存统计信息
   */
  async getCacheStats() {
    try {
      const sitemapCache = await this.getCachedSitemap();
      const submissionLog = await this.getSubmissionLog();

      return {
        sitemap: {
          exists: !!sitemapCache,
          urlCount: sitemapCache?.urls?.length || 0,
          lastFetched: sitemapCache?.lastFetched || null,
          cachedAt: sitemapCache?.cachedAt || null
        },
        submissions: {
          totalSubmissions: submissionLog.statistics.totalSubmissions,
          successfulSubmissions: submissionLog.statistics.successfulSubmissions,
          failedSubmissions: submissionLog.statistics.failedSubmissions,
          lastSubmission: submissionLog.statistics.lastSubmission
        }
      };
    } catch (error) {
      this.logger.error('❌ 获取缓存统计信息失败', error);
      return null;
    }
  }

  /**
   * 清理过期缓存
   * @param {number} maxAgeHours 最大缓存时间（小时）
   */
  async cleanupExpiredCache(maxAgeHours = 24) {
    try {
      const sitemapCache = await this.getCachedSitemap();
      
      if (sitemapCache && sitemapCache.cachedAt) {
        const cacheAge = Date.now() - new Date(sitemapCache.cachedAt).getTime();
        const maxAge = maxAgeHours * 60 * 60 * 1000; // 转换为毫秒

        if (cacheAge > maxAge) {
          this.logger.info(`🧹 清理过期的 sitemap 缓存 (${Math.round(cacheAge / 1000 / 60 / 60)}小时前)`);
          await this.clearSitemapCache();
        }
      }
    } catch (error) {
      this.logger.warn('⚠️ 清理过期缓存时发生错误', error);
    }
  }

  /**
   * 清空 sitemap 缓存
   */
  async clearSitemapCache() {
    try {
      const fs = require('fs').promises;
      await fs.unlink(this.sitemapCacheFile);
      this.logger.info('🗑️ 已清空 sitemap 缓存');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error('❌ 清空 sitemap 缓存失败', error);
        throw error;
      }
    }
  }

  /**
   * 验证 sitemap 缓存数据的有效性
   * @private
   */
  isValidSitemapCache(data) {
    return data && 
           Array.isArray(data.urls) && 
           typeof data.hash === 'string' && 
           typeof data.lastFetched === 'string';
  }

  /**
   * 验证提交日志数据的有效性
   * @private
   */
  isValidSubmissionLog(data) {
    return data && 
           Array.isArray(data.submissions) && 
           data.statistics && 
           typeof data.statistics.totalSubmissions === 'number';
  }

  /**
   * 创建默认的提交日志结构
   * @private
   */
  createDefaultSubmissionLog() {
    return {
      version: '1.0',
      createdAt: new Date().toISOString(),
      submissions: [],
      statistics: {
        totalSubmissions: 0,
        successfulSubmissions: 0,
        failedSubmissions: 0,
        lastSubmission: null,
        engines: {
          google: {
            totalSubmissions: 0,
            successfulSubmissions: 0,
            failedSubmissions: 0
          },
          bing: {
            totalSubmissions: 0,
            successfulSubmissions: 0,
            failedSubmissions: 0
          }
        }
      }
    };
  }

  /**
   * 更新统计信息
   * @private
   */
  updateStatistics(log, submissionResult) {
    const stats = log.statistics;
    
    stats.totalSubmissions++;
    stats.lastSubmission = new Date().toISOString();

    if (submissionResult.success) {
      stats.successfulSubmissions++;
    } else {
      stats.failedSubmissions++;
    }

    // 更新各搜索引擎的统计
    if (submissionResult.results) {
      for (const result of submissionResult.results) {
        const engine = result.engine;
        if (stats.engines[engine]) {
          stats.engines[engine].totalSubmissions++;
          if (result.success) {
            stats.engines[engine].successfulSubmissions++;
          } else {
            stats.engines[engine].failedSubmissions++;
          }
        }
      }
    }
  }
}

module.exports = CacheManager;