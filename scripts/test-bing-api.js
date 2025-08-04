#!/usr/bin/env node

/**
 * Bing API 连接测试脚本
 */

const axios = require('axios');

async function testBingAPI() {
  console.log('🔍 开始测试 Bing API 连接...');

  try {
    // 从环境变量获取 API 密钥
    const apiKey = process.env.BING_API_KEY;
    if (!apiKey) {
      throw new Error('缺少 BING_API_KEY 环境变量');
    }

    console.log('✅ 环境变量已设置');
    console.log(`🔑 API 密钥: ${apiKey.substring(0, 8)}...`);

    // 测试网站 URL
    const siteUrl = 'https://www.shareking.vip';
    console.log(`🌐 测试网站: ${siteUrl}`);

    // Bing API 端点
    const apiUrl = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch';
    console.log(`📡 API 端点: ${apiUrl}`);

    // 测试数据（空的 URL 列表用于测试连接）
    const testData = {
      siteUrl: siteUrl,
      urlList: []
    };

    console.log('🧪 发送测试请求...');

    // 发送请求
    const response = await axios.post(apiUrl, testData, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      timeout: 30000
    });

    console.log(`📊 响应状态: ${response.status}`);
    console.log(`📋 响应数据:`, response.data);

    if (response.status === 200) {
      if (response.data.ErrorCode) {
        console.log(`⚠️ API 返回错误: ${response.data.ErrorCode} - ${response.data.Message}`);
        
        // 分析错误类型
        if (response.data.ErrorCode === 'InvalidApiKey') {
          console.log('💡 API 密钥问题诊断:');
          console.log('   - 检查 API 密钥是否正确');
          console.log('   - 确认 API 密钥是否已激活');
          console.log('   - 验证网站是否已在 Bing Webmaster Tools 中验证');
        } else if (response.data.ErrorCode === 'SiteNotFound') {
          console.log('💡 网站验证问题:');
          console.log('   - 确认网站已在 Bing Webmaster Tools 中添加');
          console.log('   - 检查网站验证状态');
        }
        
        return false;
      } else {
        console.log('✅ Bing API 连接测试成功！');
        return true;
      }
    } else {
      console.log(`❌ HTTP 错误: ${response.status}`);
      return false;
    }

  } catch (error) {
    console.error('❌ Bing API 测试失败:', error.message);
    
    if (error.response) {
      console.log(`📊 错误响应状态: ${error.response.status}`);
      console.log(`📋 错误响应数据:`, error.response.data);
    }
    
    // 提供详细的错误诊断
    if (error.code === 'ECONNABORTED') {
      console.log('💡 网络超时问题:');
      console.log('   - 检查网络连接');
      console.log('   - 尝试增加超时时间');
    } else if (error.response?.status === 401) {
      console.log('💡 认证问题:');
      console.log('   - 检查 API 密钥是否正确');
      console.log('   - 确认 API 密钥格式');
    }
    
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testBingAPI();
}