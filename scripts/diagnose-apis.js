#!/usr/bin/env node

/**
 * API 配置诊断脚本
 */

const axios = require('axios');

async function diagnoseAPIs() {
  console.log('🔍 开始 API 配置诊断...\n');

  // 1. 检查环境变量
  console.log('📋 检查环境变量:');
  const googleKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const bingKey = process.env.BING_API_KEY;
  
  console.log(`   Google Service Account Key: ${googleKey ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`   Bing API Key: ${bingKey ? '✅ 已设置' : '❌ 未设置'}`);

  if (googleKey) {
    try {
      const parsed = JSON.parse(googleKey);
      console.log(`   Google 项目ID: ${parsed.project_id}`);
      console.log(`   Google 客户端邮箱: ${parsed.client_email}`);
    } catch (e) {
      console.log('   ❌ Google 密钥格式无效');
    }
  }

  if (bingKey) {
    console.log(`   Bing API Key 长度: ${bingKey.length} 字符`);
    console.log(`   Bing API Key 前缀: ${bingKey.substring(0, 8)}...`);
  }

  console.log('\n🌐 检查网络连接:');
  
  // 2. 测试基本网络连接
  const testUrls = [
    'https://www.google.com',
    'https://www.bing.com',
    'https://www.googleapis.com',
    'https://ssl.bing.com'
  ];

  for (const url of testUrls) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      console.log(`   ${url}: ✅ 连接正常 (${response.status})`);
    } catch (error) {
      console.log(`   ${url}: ❌ 连接失败 (${error.message})`);
    }
  }

  console.log('\n📚 API 配置建议:');
  
  console.log('\n🔍 Google Indexing API:');
  console.log('   1. 确保在 Google Cloud Console 中启用了 Indexing API');
  console.log('   2. 服务账户需要有正确的权限');
  console.log('   3. 在 Google Search Console 中添加服务账户为所有者');
  console.log('   4. 检查网络是否可以访问 googleapis.com');

  console.log('\n🔍 Bing Webmaster API:');
  console.log('   1. 确保网站已在 Bing Webmaster Tools 中验证');
  console.log('   2. API 密钥需要从正确的位置获取');
  console.log('   3. 检查 API 密钥是否已激活');
  console.log('   4. 确认使用的是正确的 API 端点');

  console.log('\n💡 故障排除步骤:');
  console.log('   1. 检查防火墙和代理设置');
  console.log('   2. 尝试从不同的网络环境测试');
  console.log('   3. 验证 API 密钥的有效期');
  console.log('   4. 查看 API 提供商的状态页面');
}

// 运行诊断
if (require.main === module) {
  diagnoseAPIs().catch(console.error);
}