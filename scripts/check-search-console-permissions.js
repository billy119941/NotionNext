#!/usr/bin/env node

/**
 * Google Search Console 权限检查脚本
 * 检查服务账户在 Search Console 中的权限级别
 */

const { google } = require('googleapis');

async function checkSearchConsolePermissions() {
  console.log('🔍 检查 Google Search Console 权限...\n');

  try {
    // 检查环境变量
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.error('❌ 缺少 GOOGLE_SERVICE_ACCOUNT_KEY 环境变量');
      return;
    }

    // 解析服务账户密钥
    const credentials = JSON.parse(serviceAccountKey);
    console.log(`📧 服务账户: ${credentials.client_email}`);

    // 创建认证客户端（包含更多权限范围）
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      [
        'https://www.googleapis.com/auth/indexing',
        'https://www.googleapis.com/auth/webmasters',
        'https://www.googleapis.com/auth/webmasters.readonly'
      ]
    );

    await auth.authorize();
    console.log('✅ 服务账户认证成功\n');

    // 检查 Search Console 权限
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    
    try {
      const sites = await searchconsole.sites.list();
      
      console.log('📊 可访问的网站属性:');
      if (sites.data.siteEntry && sites.data.siteEntry.length > 0) {
        sites.data.siteEntry.forEach(site => {
          console.log(`  🌐 ${site.siteUrl}`);
          console.log(`     权限级别: ${site.permissionLevel}`);
          console.log('');
        });

        // 检查目标网站
        const targetSites = [
          'https://www.shareking.vip/',
          'sc-domain:shareking.vip',
          'https://shareking.vip/'
        ];

        let foundSite = null;
        for (const targetUrl of targetSites) {
          foundSite = sites.data.siteEntry.find(site => site.siteUrl === targetUrl);
          if (foundSite) break;
        }

        if (foundSite) {
          console.log('✅ 找到目标网站配置:');
          console.log(`   URL: ${foundSite.siteUrl}`);
          console.log(`   权限: ${foundSite.permissionLevel}`);
          
          if (foundSite.permissionLevel === 'siteOwner') {
            console.log('   ✅ 权限级别正确（所有者）');
          } else if (foundSite.permissionLevel === 'siteFullUser') {
            console.log('   ⚠️  权限级别为"完全用户"，可能导致 Indexing API 权限不足');
            console.log('   💡 建议升级为"所有者"权限');
          } else {
            console.log(`   ❌ 权限级别不足: ${foundSite.permissionLevel}`);
          }
        } else {
          console.log('❌ 未找到目标网站，请检查以下配置:');
          console.log('   1. 网站是否已在 Search Console 中添加');
          console.log('   2. 服务账户是否已添加为用户');
          console.log('   3. 网站 URL 格式是否正确');
        }

      } else {
        console.log('❌ 服务账户无法访问任何网站属性');
        console.log('💡 请确保服务账户已添加到 Search Console 用户列表');
      }

    } catch (error) {
      console.error('❌ 无法获取 Search Console 属性:', error.message);
      
      if (error.code === 403) {
        console.log('\n💡 权限不足的可能原因:');
        console.log('1. 服务账户未添加到 Search Console');
        console.log('2. 服务账户权限级别不足');
        console.log('3. Search Console API 未启用');
      }
    }

    // 测试 Indexing API
    console.log('\n🧪 测试 Indexing API 访问...');
    const indexing = google.indexing({ version: 'v3', auth });
    
    try {
      // 尝试提交一个测试 URL
      const testUrl = 'https://www.shareking.vip/';
      const response = await indexing.urlNotifications.publish({
        requestBody: {
          url: testUrl,
          type: 'URL_UPDATED'
        }
      });

      console.log('✅ Indexing API 测试成功!');
      console.log('📊 响应:', response.data);

    } catch (error) {
      console.error('❌ Indexing API 测试失败:', error.message);
      
      if (error.code === 403) {
        console.log('\n🔧 解决 Indexing API 权限问题:');
        console.log('1. 确保服务账户在 Search Console 中的权限为"所有者"');
        console.log('2. 如果当前是"完全用户"，请联系网站所有者升级权限');
        console.log('3. 或者重新验证网站所有权，将服务账户设为所有者');
      }
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 运行检查
if (require.main === module) {
  checkSearchConsolePermissions().catch(console.error);
}

module.exports = { checkSearchConsolePermissions };