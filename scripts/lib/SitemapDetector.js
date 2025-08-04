/**
 * Sitemap 检测器
 * 负责获取、解析和比较 sitemap.xml 文件
 */

const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const { readJsonFile, writeJsonFile } = require('./utils');

class SitemapDetector {
  constructor(config, logger) {
    this.sitemapUrl = config.sitemap.url;
    this.cacheFile = config.sitemap.cacheFile || '.cache/sitemap-cache.json';
    this.logger = logger;
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });
  }

  /**
   * 检测 sitemap 变化并返回新增的 URL
   * @returns {Promise<{newUrls: string[], currentSitemap: Object}>}
   */
  async detectChanges() {
    this.logger.info('🔍 开始检测 sitemap 变化...');

    try {
      // 获取当前 sitemap
      const currentSitemap = await this.fetchSitemap();
      this.logger.info(`📄 成功获取 sitemap，包含 ${currentSitemap.urls.length} 个 URL`);

      // 获取缓存的 sitemap
      const cachedSitemap = await this.getCachedSitemap();

      // 比较差异
      const newUrls = this.compareAndExtractNew(currentSitemap, cachedSitemap);
      
      if (newUrls.length > 0) {
        this.logger.info(`🆕 检测到 ${newUrls.length} 个新增 URL`, { newUrls });
      } else {
        this.logger.info('✅ 没有检测到新增 URL');
      }

      return {
        newUrls,
        currentSitemap
      };

    } catch (error) {
      this.logger.error('❌ 检测 sitemap 变化时发生错误', error);
      throw error;
    }
  }

  /**
   * 从网络获取 sitemap.xml
   * @returns {Promise<Object>} 解析后的 sitemap 数据
   */
  async fetchSitemap() {
    this.logger.debug(`📡 正在获取 sitemap: ${this.sitemapUrl}`);

    try {
      const response = await axios.get(this.sitemapUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'NotionNext-SearchEngine-Submitter/1.0'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 解析 XML
      const parsedData = await this.parser.parseStringPromise(response.data);
      
      // 提取 URL 信息
      const urls = this.extractUrls(parsedData);
      
      // 生成内容哈希用于快速比较
      const hash = this.generateHash(response.data);

      return {
        urls,
        hash,
        lastFetched: new Date().toISOString(),
        rawData: response.data
      };

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('获取 sitemap 超时，请检查网络连接');
      } else if (error.response) {
        throw new Error(`获取 sitemap 失败: HTTP ${error.response.status}`);
      } else {
        throw new Error(`获取 sitemap 失败: ${error.message}`);
      }
    }
  }

  /**
   * 从 XML 数据中提取 URL 信息
   * @param {Object} parsedData 解析后的 XML 数据
   * @returns {Array} URL 数组
   */
  extractUrls(parsedData) {
    const urls = [];

    try {
      // 处理标准 sitemap 格式
      if (parsedData.urlset && parsedData.urlset.url) {
        const urlEntries = Array.isArray(parsedData.urlset.url) 
          ? parsedData.urlset.url 
          : [parsedData.urlset.url];

        for (const entry of urlEntries) {
          if (entry.loc) {
            urls.push({
              loc: entry.loc,
              lastmod: entry.lastmod || null,
              changefreq: entry.changefreq || null,
              priority: entry.priority ? parseFloat(entry.priority) : null
            });
          }
        }
      }
      
      // 处理 sitemap index 格式
      else if (parsedData.sitemapindex && parsedData.sitemapindex.sitemap) {
        this.logger.warn('⚠️ 检测到 sitemap index，当前版本不支持递归解析');
        // TODO: 在后续版本中可以添加递归解析 sitemap index 的功能
      }

    } catch (error) {
      this.logger.error('❌ 解析 sitemap URL 时发生错误', error);
      throw new Error(`解析 sitemap 失败: ${error.message}`);
    }

    return urls;
  }

  /**
   * 获取缓存的 sitemap 数据
   * @returns {Promise<Object|null>} 缓存的 sitemap 数据或 null
   */
  async getCachedSitemap() {
    try {
      const cachedData = await readJsonFile(this.cacheFile);
      if (cachedData) {
        this.logger.debug(`📋 成功读取缓存的 sitemap，包含 ${cachedData.urls?.length || 0} 个 URL`);
        return cachedData;
      }
    } catch (error) {
      this.logger.warn('⚠️ 读取缓存的 sitemap 失败，将视为首次运行', error);
    }
    
    return null;
  }

  /**
   * 保存 sitemap 到缓存
   * @param {Object} sitemapData sitemap 数据
   */
  async saveSitemapCache(sitemapData) {
    try {
      await writeJsonFile(this.cacheFile, sitemapData);
      this.logger.debug('💾 成功保存 sitemap 缓存');
    } catch (error) {
      this.logger.error('❌ 保存 sitemap 缓存失败', error);
      throw error;
    }
  }

  /**
   * 比较当前和缓存的 sitemap，提取新增的 URL
   * @param {Object} currentSitemap 当前 sitemap
   * @param {Object|null} cachedSitemap 缓存的 sitemap
   * @returns {string[]} 新增的 URL 数组
   */
  compareAndExtractNew(currentSitemap, cachedSitemap) {
    // 如果没有缓存，返回所有 URL（但限制数量以避免首次运行时提交过多）
    if (!cachedSitemap) {
      this.logger.info('📝 首次运行，将提交最近的 URL');
      // 只返回最近的 5 个 URL，避免首次运行时提交过多
      const recentUrls = currentSitemap.urls
        .sort((a, b) => {
          const dateA = new Date(a.lastmod || '1970-01-01');
          const dateB = new Date(b.lastmod || '1970-01-01');
          return dateB - dateA;
        })
        .slice(0, 5)
        .map(url => url.loc);
      
      this.logger.info(`🎯 首次运行选择了 ${recentUrls.length} 个最新 URL`);
      return recentUrls;
    }

    // 快速比较：如果哈希相同，说明没有变化
    if (currentSitemap.hash === cachedSitemap.hash) {
      this.logger.debug('🔄 sitemap 哈希相同，没有变化');
      return [];
    }

    // 详细比较：找出新增的 URL
    const cachedUrls = new Set(cachedSitemap.urls.map(url => url.loc));
    const newUrls = currentSitemap.urls
      .filter(url => !cachedUrls.has(url.loc))
      .map(url => url.loc);

    // 如果新增URL过多，可能是缓存问题，限制数量
    if (newUrls.length > 20) {
      this.logger.warn(`⚠️ 检测到 ${newUrls.length} 个新增 URL，可能是缓存问题`);
      this.logger.warn('🔧 限制为最近的 10 个 URL 以避免过度提交');
      
      // 按最后修改时间排序，取最新的10个
      const sortedNewUrls = currentSitemap.urls
        .filter(url => !cachedUrls.has(url.loc))
        .sort((a, b) => {
          const dateA = new Date(a.lastmod || '1970-01-01');
          const dateB = new Date(b.lastmod || '1970-01-01');
          return dateB - dateA;
        })
        .slice(0, 10)
        .map(url => url.loc);
      
      return sortedNewUrls;
    }

    return newUrls;
  }

  /**
   * 生成内容哈希
   * @param {string} content 内容字符串
   * @returns {string} MD5 哈希值
   */
  generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 验证 URL 格式
   * @param {string} url URL 字符串
   * @returns {boolean} 是否为有效 URL
   */
  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

module.exports = SitemapDetector;