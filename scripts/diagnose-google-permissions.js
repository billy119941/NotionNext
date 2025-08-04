#!/usr/bin/env node

/**
 * Google 权限诊断脚本
 * 帮助诊断 Google Indexing API 权限问题
 */

const { google } = require('googleapis');

async function diagnoseGooglePermissions() {
  console.log('🔍 开始诊断 Google 权限问题...\n');

  try {
    // 1. 检查环境变量
    console.log('1️⃣ 检查环境变量...');
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
      console.error('❌ 缺少 GOOGLE_SERVICE_ACCOUNT_KEY 环境变量');
      return;
    }
    console.log('✅ GOOGLE_SERVICE_ACCOUNT_KEY 环境变量已设置');

    // 2. 解析服务账户密钥
    console.log('\n2️⃣ 解析服务账户密钥...');
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
      console.log('✅ 服务账户密钥 JSON 格式正确');
      console.log(`📧 服务账户邮箱: ${credentials.client_email}`);
      console.log(`🏗️  项目 ID: ${credentials.project_id}`);
    } catch (error) {
      console.error('❌ 服务账户密钥 JSON 格式错误:', error.message);
      return;
    }

    // 3. 创建认证客户端
    console.log('\n3️⃣ 创建认证客户端...');
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/indexing']
    );

    try {
      await auth.authorize();
      console.log('✅ 服务账户认证成功');
    } catch (error) {
      console.error('❌ 服务账户认证失败:', error.message);
      return;
    }

    // 4. 测试 Indexing API 访问
    console.log('\n4️⃣ 测试 Indexing API 访问...');
    const indexing = google.indexing({ version: 'v3', auth });

    // 测试一个简单的 URL 提交（使用网站首页）
    const testUrl = 'https://www.shareking.vip/';
    
    try {
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url: testUrl,
          type: 'URL_UPDATED'
        }
      });

      console.log('✅ API 调用成功!');
      console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.error('❌ API 调用失败:', error.message);
      
      // 详细分析错误
      if (error.response) {
        console.log('\n🔍 错误详情分析:');
        console.log(`状态码: ${error.response.status}`);
        console.log(`错误信息: ${JSON.stringify(error.response.data, null, 2)}`);
        
        if (error.response.status === 403) {
          console.log('\n💡 权限错误可能的原因:');
          console.log('1. 服务账户未添加到 Google Search Console');
          console.log('2. 服务账户权限不足（需要 Owner 权限）');
          console.log('3. 网站未在 Search Console 中验证');
          console.log('4. API 未启用或配额不足');
          
          console.log('\n🔧 解决步骤:');
          console.log('1. 访问 Google Search Console: https://search.google.com/search-console/');
          console.log('2. 选择网站属性: https://www.shareking.vip');
          console.log('3. 转到 设置 > 用户和权限');
          console.log(`4. 确认 ${credentials.client_email} 在用户列表中`);
          console.log('5. 确认权限级别为 "所有者"');
        }
      }
    }

    // 5. 检查 Search Console 属性
    console.log('\n5️⃣ 检查可访问的 Search Console 属性...');
    try {
      const searchconsole = google.searchconsole({ version: 'v1', auth });
      const sites = await searchconsole.sites.list();
      
      console.log('✅ 可访问的网站属性:');
      if (sites.data.siteEntry && sites.data.siteEntry.length > 0) {
        sites.data.siteEntry.forEach(site => {
          console.log(`  - ${site.siteUrl} (权限: ${site.permissionLevel})`);
        });
        
        // 检查目标网站是否在列表中
        const targetSite = sites.data.siteEntry.find(site => 
          site.siteUrl === 'https://www.shareking.vip/' || 
          site.siteUrl === 'sc-domain:shareking.vip'
        );
        
        if (targetSite) {
          console.log(`✅ 找到目标网站: ${targetSite.siteUrl}`);
          console.log(`📊 权限级别: ${targetSite.permissionLevel}`);
          
          if (targetSite.permissionLevel === 'siteOwner') {
            console.log('✅ 权限级别正确');
          } else {
            console.log('⚠️ 权限级别可能不足，建议设置为 "所有者"');
          }
        } else {
          console.log('❌ 未找到目标网站，请检查 Search Console 配置');
        }
      } else {
        console.log('❌ 服务账户无法访问任何网站属性');
      }
      
    } catch (error) {
      console.log('⚠️ 无法获取 Search Console 属性列表:', error.message);
    }

  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error);
  }
}

// 运行诊断
if (require.main === module) {
  diagnoseGooglePermissions().catch(console.error);
}

module.exports = { diagnoseGooglePermissions };