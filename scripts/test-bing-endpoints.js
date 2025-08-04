#!/usr/bin/env node

/**
 * 测试不同的 Bing API 端点
 */

const axios = require('axios');

async function testBingEndpoints() {
  console.log('🔍 测试不同的 Bing API 端点...');

  const apiKey = process.env.BING_API_KEY;
  const siteUrl = 'https://www.shareking.vip';

  if (!apiKey) {
    console.error('❌ 缺少 BING_API_KEY 环境变量');
    return;
  }

  // 不同的 API 端点
  const endpoints = [
    {
      name: 'SubmitUrlbatch (旧版)',
      url: 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch',
      method: 'POST',
      data: {
        siteUrl: siteUrl,
        urlList: []
      }
    },
    {
      name: 'SubmitUrl (单个)',
      url: 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl',
      method: 'POST',
      data: {
        siteUrl: siteUrl,
        url: 'https://www.shareking.vip/'
      }
    },
    {
      name: 'IndexNow API',
      url: 'https://api.indexnow.org/indexnow',
      method: 'POST',
      data: {
        host: 'www.shareking.vip',
        key: apiKey,
        urlList: ['https://www.shareking.vip/']
      }
    },
    {
      name: 'Bing IndexNow',
      url: 'https://www.bing.com/indexnow',
      method: 'POST',
      data: {
        host: 'www.shareking.vip',
        key: apiKey,
        urlList: ['https://www.shareking.vip/']
      }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🧪 测试端点: ${endpoint.name}`);
    console.log(`📡 URL: ${endpoint.url}`);

    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      // 根据端点类型设置不同的认证头
      if (endpoint.name.includes('IndexNow')) {
        // IndexNow API 不需要额外的认证头
      } else {
        headers['apikey'] = apiKey;
      }

      const response = await axios({
        method: endpoint.method,
        url: endpoint.url,
        data: endpoint.data,
        headers: headers,
        timeout: 30000
      });

      console.log(`✅ 响应状态: ${response.status}`);
      console.log(`📋 响应数据:`, JSON.stringify(response.data, null, 2));

    } catch (error) {
      console.log(`❌ 请求失败: ${error.message}`);
      
      if (error.response) {
        console.log(`📊 错误状态: ${error.response.status}`);
        console.log(`📋 错误数据:`, JSON.stringify(error.response.data, null, 2));
      }
    }
  }

  console.log('\n💡 建议:');
  console.log('1. 如果所有端点都失败，检查 API 密钥是否正确');
  console.log('2. 确保网站已在 Bing Webmaster Tools 中验证');
  console.log('3. 考虑使用 IndexNow API 作为替代方案');
}

// 运行测试
if (require.main === module) {
  testBingEndpoints().catch(console.error);
}