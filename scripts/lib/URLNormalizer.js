/**
 * URL 标准化器
 * 负责处理和标准化 URL，包括移除 .html 后缀、验证格式等
 */

class URLNormalizer {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.baseUrl = this.extractBaseUrl(config.sitemap.url);
  }

  /**
   * 标准化 URL 数组
   * @param {string[]} urls URL 数组
   * @returns {string[]} 标准化后的 URL 数组
   */
  static normalize(urls) {
    if (!Array.isArray(urls)) {
      throw new Error('URLs 必须是数组格式');
    }

    return urls
      .map(url => this.removeHtmlSuffix(url))
      .filter(url => this.isValidUrl(url))
      .filter((url, index, arr) => arr.indexOf(url) === index); // 去重
  }

  /**
   * 标准化单个 URL
   * @param {string} url 原始 URL
   * @returns {string} 标准化后的 URL
   */
  static normalizeUrl(url) {
    if (typeof url !== 'string') {
      throw new Error('URL 必须是字符串格式');
    }

    let normalizedUrl = url.trim();

    // 移除 .html 后缀
    normalizedUrl = this.removeHtmlSuffix(normalizedUrl);

    // 验证 URL 格式
    if (!this.isValidUrl(normalizedUrl)) {
      throw new Error(`无效的 URL 格式: ${url}`);
    }

    return normalizedUrl;
  }

  /**
   * 批量标准化 URL（实例方法，包含日志记录）
   * @param {string[]} urls URL 数组
   * @returns {string[]} 标准化后的 URL 数组
   */
  normalizeUrls(urls) {
    this.logger.info(`🔧 开始标准化 ${urls.length} 个 URL...`);

    const originalCount = urls.length;
    const normalizedUrls = [];
    const invalidUrls = [];
    const duplicateUrls = [];

    for (const url of urls) {
      try {
        const normalizedUrl = URLNormalizer.normalizeUrl(url);
        
        // 检查是否重复
        if (normalizedUrls.includes(normalizedUrl)) {
          duplicateUrls.push(url);
          this.logger.debug(`⚠️ 发现重复 URL: ${url} -> ${normalizedUrl}`);
        } else {
          normalizedUrls.push(normalizedUrl);
          
          // 记录转换信息
          if (url !== normalizedUrl) {
            this.logger.debug(`🔄 URL 已标准化: ${url} -> ${normalizedUrl}`);
          }
        }
      } catch (error) {
        invalidUrls.push(url);
        this.logger.warn(`❌ 无效 URL 已跳过: ${url}`, { error: error.message });
      }
    }

    // 记录处理结果
    const stats = {
      original: originalCount,
      normalized: normalizedUrls.length,
      invalid: invalidUrls.length,
      duplicates: duplicateUrls.length
    };

    this.logger.info(`✅ URL 标准化完成`, stats);

    if (invalidUrls.length > 0) {
      this.logger.warn(`⚠️ ${invalidUrls.length} 个无效 URL 被跳过`, { invalidUrls });
    }

    if (duplicateUrls.length > 0) {
      this.logger.info(`🔄 ${duplicateUrls.length} 个重复 URL 被去除`, { duplicateUrls });
    }

    return normalizedUrls;
  }

  /**
   * 移除 .html 后缀
   * @param {string} url URL 字符串
   * @returns {string} 移除后缀后的 URL
   */
  static removeHtmlSuffix(url) {
    if (typeof url !== 'string') {
      return url;
    }

    // 移除 .html 后缀（不区分大小写）
    return url.replace(/\.html?$/i, '');
  }

  /**
   * 验证 URL 格式
   * @param {string} url URL 字符串
   * @returns {boolean} 是否为有效 URL
   */
  static isValidUrl(url) {
    if (typeof url !== 'string' || url.trim() === '') {
      return false;
    }

    try {
      const urlObj = new URL(url);
      
      // 只允许 HTTP 和 HTTPS 协议
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }

      // 检查主机名是否有效
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return false;
      }

      // 检查是否包含不允许的字符
      if (url.includes(' ') || url.includes('\n') || url.includes('\t')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查 URL 是否属于指定域名
   * @param {string} url URL 字符串
   * @param {string} domain 域名
   * @returns {boolean} 是否属于指定域名
   */
  static belongsToDomain(url, domain) {
    try {
      const urlObj = new URL(url);
      const domainObj = new URL(domain);
      return urlObj.hostname === domainObj.hostname;
    } catch {
      return false;
    }
  }

  /**
   * 过滤属于网站域名的 URL
   * @param {string[]} urls URL 数组
   * @returns {string[]} 过滤后的 URL 数组
   */
  filterOwnDomainUrls(urls) {
    if (!this.baseUrl) {
      this.logger.warn('⚠️ 无法确定网站域名，跳过域名过滤');
      return urls;
    }

    const filteredUrls = urls.filter(url => 
      URLNormalizer.belongsToDomain(url, this.baseUrl)
    );

    const filtered = urls.length - filteredUrls.length;
    if (filtered > 0) {
      this.logger.info(`🔍 过滤了 ${filtered} 个外部域名的 URL`);
    }

    return filteredUrls;
  }

  /**
   * 按 URL 类型分类
   * @param {string[]} urls URL 数组
   * @returns {Object} 分类结果
   */
  categorizeUrls(urls) {
    const categories = {
      homepage: [],
      articles: [],
      categories: [],
      tags: [],
      pages: [],
      others: []
    };

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();

        if (pathname === '/' || pathname === '') {
          categories.homepage.push(url);
        } else if (pathname.includes('/category/') || pathname.includes('/categories/')) {
          categories.categories.push(url);
        } else if (pathname.includes('/tag/') || pathname.includes('/tags/')) {
          categories.tags.push(url);
        } else if (pathname.includes('/page/')) {
          categories.pages.push(url);
        } else if (this.isArticleUrl(pathname)) {
          categories.articles.push(url);
        } else {
          categories.others.push(url);
        }
      } catch {
        categories.others.push(url);
      }
    }

    // 记录分类统计
    const stats = Object.entries(categories).map(([type, urls]) => ({
      type,
      count: urls.length
    })).filter(item => item.count > 0);

    if (stats.length > 0) {
      this.logger.info('📊 URL 分类统计', { categories: stats });
    }

    return categories;
  }

  /**
   * 判断是否为文章 URL
   * @private
   */
  isArticleUrl(pathname) {
    // 常见的文章路径模式
    const articlePatterns = [
      /^\/[^\/]+\/[^\/]+\/?$/,  // /category/article
      /^\/\d{4}\/\d{2}\/[^\/]+\/?$/,  // /2024/01/article
      /^\/posts?\/[^\/]+\/?$/,  // /post/article
      /^\/articles?\/[^\/]+\/?$/,  // /article/article
      /^\/blog\/[^\/]+\/?$/     // /blog/article
    ];

    return articlePatterns.some(pattern => pattern.test(pathname));
  }

  /**
   * 从 sitemap URL 提取基础 URL
   * @private
   */
  extractBaseUrl(sitemapUrl) {
    try {
      const urlObj = new URL(sitemapUrl);
      return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch {
      return null;
    }
  }

  /**
   * 获取 URL 统计信息
   * @param {string[]} urls URL 数组
   * @returns {Object} 统计信息
   */
  getUrlStats(urls) {
    const stats = {
      total: urls.length,
      withHtmlSuffix: 0,
      withoutHtmlSuffix: 0,
      unique: new Set(urls).size,
      duplicates: urls.length - new Set(urls).size
    };

    for (const url of urls) {
      if (url.toLowerCase().endsWith('.html')) {
        stats.withHtmlSuffix++;
      } else {
        stats.withoutHtmlSuffix++;
      }
    }

    return stats;
  }
}

module.exports = URLNormalizer;