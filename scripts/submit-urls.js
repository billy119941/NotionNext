#!/usr/bin/env node

/**
 * 自动搜索引擎提交脚本
 * 
 * 功能：
 * 1. 检测 sitemap.xml 的更新
 * 2. 提取新增的 URL
 * 3. 自动提交到 Google 和 Bing 搜索引擎
 * 
 * 使用方法：
 * node scripts/submit-urls.js
 * node scripts/submit-urls.js --test  # 测试模式
 */

const path = require('path');
const { validateEnvironmentVariables } = require('./lib/utils');
const Logger = require('./lib/logger');
const SitemapDetector = require('./lib/SitemapDetector');
const CacheManager = require('./lib/CacheManager');
const URLNormalizer = require('./lib/URLNormalizer');
const SearchEngineSubmitter = require('./lib/SearchEngineSubmitter');

// 导入配置
const config = require('../config/search-engine-submission.json');

// 初始化日志记录器
const logger = new Logger(config.logging);

// 主执行函数
async function main() {
  logger.info('🚀 开始执行自动搜索引擎提交任务...');
  
  try {
    // 检查命令行参数
    const isTestMode = process.argv.includes('--test');
    if (isTestMode) {
      logger.info('🧪 运行在测试模式');
    }

    // 验证必需的环境变量
    const requiredEnvVars = [
      'GOOGLE_SERVICE_ACCOUNT_KEY',
      'BING_API_KEY'
    ];
    
    try {
      validateEnvironmentVariables(requiredEnvVars);
      logger.info('✅ 环境变量验证通过');
    } catch (error) {
      logger.error('❌ 环境变量验证失败', error);
      if (!isTestMode) {
        process.exit(1);
      }
    }

    // 初始化组件
    const cacheManager = new CacheManager(config, logger);
    const sitemapDetector = new SitemapDetector(config, logger);
    const urlNormalizer = new URLNormalizer(config, logger);
    const searchEngineSubmitter = new SearchEngineSubmitter(config, logger);

    // 初始化缓存目录
    await cacheManager.initialize();

    // 1. 检测 sitemap 更新
    logger.info('📡 开始检测 sitemap 更新...');
    const { newUrls, currentSitemap } = await sitemapDetector.detectChanges();

    if (newUrls.length === 0) {
      logger.info('✅ 没有新的 URL 需要提交');
      return;
    }

    logger.info(`🎯 发现 ${newUrls.length} 个新 URL 需要提交`, { urls: newUrls });

    // 保存当前 sitemap 到缓存
    await cacheManager.saveSitemapCache(currentSitemap);

    // 2. 标准化 URL
    logger.info('🔧 开始标准化 URL...');
    const normalizedUrls = urlNormalizer.normalizeUrls(newUrls);
    
    if (normalizedUrls.length === 0) {
      logger.warn('⚠️ 标准化后没有有效的 URL 需要提交');
      return;
    }

    // 3. 检查最近已提交的 URL，避免重复提交
    logger.info('🔍 检查重复提交...');
    const recentlySubmittedUrls = await cacheManager.getRecentlySubmittedUrls(6); // 检查最近6小时
    const urlsToSubmit = normalizedUrls.filter(url => !recentlySubmittedUrls.includes(url));
    
    if (urlsToSubmit.length < normalizedUrls.length) {
      const skippedCount = normalizedUrls.length - urlsToSubmit.length;
      logger.info(`⏭️ 跳过 ${skippedCount} 个最近已提交的 URL，避免重复提交`);
    }
    
    if (urlsToSubmit.length === 0) {
      logger.info('✅ 所有 URL 都已在最近提交过，无需重复提交');
      return;
    }

    // 分类 URL 以便更好地了解内容类型
    const categorizedUrls = urlNormalizer.categorizeUrls(urlsToSubmit);

    if (isTestMode) {
      logger.info('🧪 测试模式：跳过实际提交');
      logger.info('📋 标准化后的 URL:', { normalizedUrls });
      return;
    }

    // 3. 提交到搜索引擎
    logger.info('🚀 开始提交到搜索引擎...');
    
    // 初始化搜索引擎提交器
    await searchEngineSubmitter.initialize();
    
    // 提交 URL
    const submissionResult = await searchEngineSubmitter.submitUrls(urlsToSubmit);
    
    // 记录提交结果到缓存
    await cacheManager.recordSubmission(submissionResult);
    
    // 显示最终统计
    const stats = searchEngineSubmitter.getStats();
    const quotaInfo = searchEngineSubmitter.getQuotaInfo();
    
    logger.info('📊 提交统计', { stats, quotaInfo });

    // TODO: 4. 发送通知

    logger.info('✅ 任务执行完成');
    
  } catch (error) {
    logger.error('❌ 任务执行失败', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = { main };