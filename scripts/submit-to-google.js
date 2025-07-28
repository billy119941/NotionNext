#!/usr/bin/env node

/**
 * Google搜索引擎自动提交脚本
 * 使用方法：node scripts/submit-to-google.js
 */

const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const BLOG = require('../blog.config.js')

// 配置
const SITE_URL = BLOG.LINK
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`

// Google Indexing API配置
const SCOPES = ['https://www.googleapis.com/auth/indexing']
const KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || 'google-service-account.json'

async function submitSitemap() {
  console.log('🚀 开始提交sitemap到Google...\n')
  
  try {
    // 1. 验证sitemap可访问性
    console.log('1. 验证sitemap可访问性...')
    const fetch = (await import('node-fetch')).default
    const response = await fetch(SITEMAP_URL)
    
    if (!response.ok) {
      throw new Error(`Sitemap不可访问: ${response.status}`)
    }
    
    console.log(`   ✅ Sitemap可访问: ${SITEMAP_URL}`)
    
    // 2. 解析sitemap获取URL列表
    console.log('\n2. 解析sitemap获取URL列表...')
    const sitemapContent = await response.text()
    const urls = extractUrlsFromSitemap(sitemapContent)
    console.log(`   ✅ 找到 ${urls.length} 个URL`)
    
    // 3. 使用Indexing API提交URL
    if (process.env.GOOGLE_INDEXING_API_KEY || fs.existsSync(KEY_FILE)) {
      console.log('\n3. 使用Indexing API提交URL...')
      await submitUrlsToIndexingAPI(urls)
    } else {
      console.log('\n3. ⚠️ 未配置Google Indexing API密钥，跳过自动提交')
      console.log('   请参考 google-indexing-api-setup.md 配置API密钥')
    }
    
    // 4. 生成提交报告
    console.log('\n4. 生成提交报告...')
    generateSubmissionReport(urls)
    
    console.log('\n🎉 提交完成！')
    console.log('\n📝 后续操作:')
    console.log('   1. 访问 Google Search Console 查看提交状态')
    console.log('   2. 在"站点地图"页面检查处理结果')
    console.log('   3. 使用"网址检查"工具测试重要页面')
    
  } catch (error) {
    console.error('❌ 提交失败:', error.message)
    process.exit(1)
  }
}

function extractUrlsFromSitemap(sitemapContent) {
  const urls = []
  const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g)
  
  if (urlMatches) {
    urlMatches.forEach(match => {
      const url = match.replace(/<\/?loc>/g, '')
      urls.push(url)
    })
  }
  
  return urls
}

async function submitUrlsToIndexingAPI(urls) {
  try {
    // 初始化Google API客户端
    let auth
    
    if (process.env.GOOGLE_INDEXING_API_KEY) {
      // 使用环境变量中的密钥
      const keyData = JSON.parse(process.env.GOOGLE_INDEXING_API_KEY)
      auth = new google.auth.GoogleAuth({
        credentials: keyData,
        scopes: SCOPES
      })
    } else {
      // 使用密钥文件
      auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: SCOPES
      })
    }
    
    const indexing = google.indexing({ version: 'v3', auth })
    
    // 批量提交URL
    let successCount = 0
    let errorCount = 0
    
    for (const url of urls.slice(0, 10)) { // 限制每次提交10个URL
      try {
        await indexing.urlNotifications.publish({
          requestBody: {
            url: url,
            type: 'URL_UPDATED'
          }
        })
        
        console.log(`   ✅ 提交成功: ${url}`)
        successCount++
        
        // 避免API限制，添加延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.log(`   ❌ 提交失败: ${url} - ${error.message}`)
        errorCount++
      }
    }
    
    console.log(`\n   📊 提交统计: 成功 ${successCount}, 失败 ${errorCount}`)
    
  } catch (error) {
    console.error('   ❌ Indexing API配置错误:', error.message)
  }
}

function generateSubmissionReport(urls) {
  const report = {
    timestamp: new Date().toISOString(),
    siteUrl: SITE_URL,
    sitemapUrl: SITEMAP_URL,
    totalUrls: urls.length,
    urls: urls,
    instructions: {
      manualSubmission: [
        '1. 访问 https://search.google.com/search-console/',
        '2. 选择你的网站资源',
        '3. 点击左侧菜单"站点地图"',
        '4. 在"添加新的站点地图"中输入: sitemap.xml',
        '5. 点击"提交"'
      ],
      urlInspection: [
        '1. 在Google Search Console中点击"网址检查"',
        '2. 输入重要页面URL',
        '3. 点击"请求编入索引"'
      ]
    }
  }
  
  const reportPath = 'google-submission-report.json'
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`   ✅ 报告已保存: ${reportPath}`)
}

// 主函数
if (require.main === module) {
  submitSitemap()
}

module.exports = { submitSitemap }