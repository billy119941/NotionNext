#!/usr/bin/env node

/**
 * GitHub Actions 环境验证脚本
 * 用于验证所有必需的环境变量和配置
 */

const fs = require('fs').promises;
const path = require('path');

async function validateGitHubEnvironment() {
  console.log('🔍 GitHub Actions 环境验证');
  console.log('=' .repeat(50));

  let allValid = true;
  const issues = [];

  // 1. 检查环境变量
  console.log('\n📋 检查环境变量:');
  
  const requiredEnvVars = [
    { name: 'GOOGLE_SERVICE_ACCOUNT_KEY', required: true },
    { name: 'BING_API_KEY', required: true },
    { name: 'NOTIFICATION_EMAIL', required: false },
    { name: 'SMTP_CONFIG', required: false }
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar.name];
    const status = value ? '✅' : (envVar.required ? '❌' : '⚠️');
    const label = envVar.required ? '必需' : '可选';
    
    console.log(`   ${status} ${envVar.name} (${label}): ${value ? '已设置' : '未设置'}`);
    
    if (envVar.required && !value) {
      allValid = false;
      issues.push(`缺少必需的环境变量: ${envVar.name}`);
    }
  }

  // 2. 验证 Google Service Account Key 格式
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('\n🔑 验证 Google Service Account Key:');
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const requiredFields = [
        'type', 'project_id', 'private_key_id', 'private_key', 
        'client_email', 'client_id', 'auth_uri', 'token_uri'
      ];
      
      let keyValid = true;
      for (const field of requiredFields) {
        if (!credentials[field]) {
          console.log(`   ❌ 缺少字段: ${field}`);
          keyValid = false;
        }
      }
      
      if (keyValid) {
        console.log('   ✅ JSON 格式正确');
        console.log(`   📧 客户端邮箱: ${credentials.client_email}`);
        console.log(`   🆔 项目ID: ${credentials.project_id}`);
      } else {
        allValid = false;
        issues.push('Google Service Account Key 格式不完整');
      }
      
    } catch (error) {
      console.log('   ❌ JSON 格式无效');
      allValid = false;
      issues.push('Google Service Account Key JSON 格式无效');
    }
  }

  // 3. 验证 Bing API Key 格式
  if (process.env.BING_API_KEY) {
    console.log('\n🔑 验证 Bing API Key:');
    const bingKey = process.env.BING_API_KEY;
    
    if (bingKey.length === 32 && /^[a-f0-9]+$/i.test(bingKey)) {
      console.log('   ✅ 格式正确（32位十六进制）');
    } else {
      console.log('   ⚠️ 格式可能不正确（应为32位十六进制）');
      console.log(`   📏 长度: ${bingKey.length} 字符`);
    }
  }

  // 4. 检查配置文件
  console.log('\n📄 检查配置文件:');
  
  const configFiles = [
    'config/search-engine-submission.json',
    'package.json'
  ];

  for (const configFile of configFiles) {
    try {
      await fs.access(configFile);
      console.log(`   ✅ ${configFile} 存在`);
    } catch (error) {
      console.log(`   ❌ ${configFile} 不存在`);
      allValid = false;
      issues.push(`配置文件不存在: ${configFile}`);
    }
  }

  // 5. 检查脚本文件
  console.log('\n📜 检查脚本文件:');
  
  const scriptFiles = [
    'scripts/submit-urls.js',
    'scripts/lib/SearchEngineSubmitter.js',
    'scripts/lib/GoogleIndexingClient.js',
    'scripts/lib/BingWebmasterClient.js'
  ];

  for (const scriptFile of scriptFiles) {
    try {
      await fs.access(scriptFile);
      console.log(`   ✅ ${scriptFile} 存在`);
    } catch (error) {
      console.log(`   ❌ ${scriptFile} 不存在`);
      allValid = false;
      issues.push(`脚本文件不存在: ${scriptFile}`);
    }
  }

  // 6. 检查 GitHub Actions 工作流
  console.log('\n⚙️ 检查 GitHub Actions 工作流:');
  
  const workflowFiles = [
    '.github/workflows/search-engine-submission.yml',
    '.github/workflows/url-submission-simple.yml'
  ];

  for (const workflowFile of workflowFiles) {
    try {
      await fs.access(workflowFile);
      console.log(`   ✅ ${workflowFile} 存在`);
    } catch (error) {
      console.log(`   ❌ ${workflowFile} 不存在`);
      issues.push(`工作流文件不存在: ${workflowFile}`);
    }
  }

  // 7. 检查依赖项
  console.log('\n📦 检查依赖项:');
  
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    const requiredDeps = ['googleapis', 'nodemailer', 'xml2js', 'axios'];
    
    for (const dep of requiredDeps) {
      if (packageJson.dependencies[dep]) {
        console.log(`   ✅ ${dep}: ${packageJson.dependencies[dep]}`);
      } else {
        console.log(`   ❌ ${dep}: 未安装`);
        issues.push(`缺少依赖项: ${dep}`);
      }
    }
  } catch (error) {
    console.log('   ❌ 无法读取 package.json');
    allValid = false;
    issues.push('无法读取 package.json');
  }

  // 8. 环境信息
  console.log('\n🌍 环境信息:');
  console.log(`   Node.js 版本: ${process.version}`);
  console.log(`   平台: ${process.platform}`);
  console.log(`   架构: ${process.arch}`);
  
  if (process.env.GITHUB_ACTIONS) {
    console.log('   🎯 运行在 GitHub Actions 环境');
    console.log(`   🏃 Runner: ${process.env.RUNNER_OS || 'Unknown'}`);
    console.log(`   📂 工作目录: ${process.env.GITHUB_WORKSPACE || process.cwd()}`);
  } else {
    console.log('   🏠 运行在本地环境');
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  
  if (allValid && issues.length === 0) {
    console.log('🎉 环境验证通过！所有配置都正确。');
    console.log('\n📋 下一步:');
    console.log('   1. 确保在 GitHub 仓库中设置了所有必需的 Secrets');
    console.log('   2. 手动触发工作流进行测试');
    console.log('   3. 检查工作流执行日志');
    process.exit(0);
  } else {
    console.log('❌ 环境验证失败！发现以下问题:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    
    console.log('\n💡 解决建议:');
    console.log('   1. 检查 GitHub Secrets 配置');
    console.log('   2. 验证 API 密钥格式');
    console.log('   3. 确保所有文件都已提交到仓库');
    console.log('   4. 参考 docs/GITHUB-ACTIONS-SETUP.md');
    
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  validateGitHubEnvironment().catch(error => {
    console.error('❌ 验证过程中发生错误:', error.message);
    process.exit(1);
  });
}

module.exports = { validateGitHubEnvironment };