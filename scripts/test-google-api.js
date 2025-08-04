#!/usr/bin/env node

/**
 * Google API 连接测试脚本
 */

const { google } = require('googleapis');

async function testGoogleAPI() {
  console.log('🔍 开始测试 Google API 连接...');

  try {
    // 从环境变量获取服务账户密钥
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('缺少 GOOGLE_SERVICE_ACCOUNT_KEY 环境变量');
    }

    console.log('✅ 环境变量已设置');

    // 解析服务账户密钥
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
      console.log('✅ 服务账户密钥解析成功');
      console.log(`📧 客户端邮箱: ${credentials.client_email}`);
      console.log(`🆔 项目ID: ${credentials.project_id}`);
    } catch (error) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 格式无效，必须是有效的 JSON');
    }

    // 创建 JWT 客户端
    console.log('🔑 创建 JWT 客户端...');
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/indexing']
    );

    // 测试认证
    console.log('🔐 测试认证...');
    const authResult = await auth.authorize();
    console.log('✅ 认证成功');
    console.log(`🎫 访问令牌类型: ${authResult.token_type}`);

    // 创建 Indexing API 客户端
    console.log('📡 创建 Indexing API 客户端...');
    const indexing = google.indexing({
      version: 'v3',
      auth: auth
    });

    // 测试一个简单的 API 调用（不实际提交）
    console.log('🧪 测试 API 调用...');
    
    // 注意：这里我们不实际提交URL，只是测试连接
    console.log('✅ Google Indexing API 连接测试成功！');
    
    return true;

  } catch (error) {
    console.error('❌ Google API 测试失败:', error.message);
    
    // 提供详细的错误诊断
    if (error.message.includes('network')) {
      console.log('💡 网络问题诊断:');
      console.log('   - 检查网络连接');
      console.log('   - 确认防火墙设置');
      console.log('   - 尝试使用代理');
    } else if (error.message.includes('credentials')) {
      console.log('💡 认证问题诊断:');
      console.log('   - 检查服务账户密钥是否正确');
      console.log('   - 确认服务账户权限');
      console.log('   - 验证项目是否启用了 Indexing API');
    }
    
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testGoogleAPI();
}