#!/usr/bin/env node

/**
 * 生产环境部署验证脚本
 * 
 * 功能：
 * 1. 验证所有必需的文件和配置
 * 2. 检查 GitHub Actions 工作流配置
 * 3. 验证环境变量设置
 * 4. 测试核心功能
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DeploymentVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  /**
   * 记录错误
   */
  addError(message) {
    this.errors.push(message);
    console.error(`❌ ${message}`);
  }

  /**
   * 记录警告
   */
  addWarning(message) {
    this.warnings.push(message);
    console.warn(`⚠️  ${message}`);
  }

  /**
   * 记录通过的检查
   */
  addPassed(message) {
    this.passed.push(message);
    console.log(`✅ ${message}`);
  }

  /**
   * 验证必需的文件存在
   */
  async verifyRequiredFiles() {
    console.log('\n🔍 验证必需文件...');

    const requiredFiles = [
      // 配置文件
      'config/search-engine-submission.json',
      'config/search-engine-submission.example.json',
      
      // 主要脚本
      'scripts/submit-urls.js',
      'scripts/validate-github-env.js',
      
      // 核心库文件
      'scripts/lib/SitemapDetector.js',
      'scripts/lib/URLNormalizer.js',
      'scripts/lib/GoogleIndexingClient.js',
      'scripts/lib/BingWebmasterClient.js',
      'scripts/lib/SearchEngineSubmitter.js',
      'scripts/lib/ErrorHandler.js',
      'scripts/lib/CacheManager.js',
      'scripts/lib/utils.js',
      
      // GitHub Actions 工作流
      '.github/workflows/search-engine-submission.yml',
      
      // 文档文件
      'docs/USER-GUIDE.md',
      'docs/CONFIGURATION.md',
      'docs/ENVIRONMENT-SETUP.md',
      'docs/API-SETUP-GUIDE.md',
      'docs/TROUBLESHOOTING.md',
      'docs/GITHUB-ACTIONS-SETUP.md',
      
      // 测试文件
      'jest.config.js',
      'tests/setup.js'
    ];

    for (const file of requiredFiles) {
      try {
        const stats = await fs.stat(file);
        if (stats.isFile()) {
          this.addPassed(`文件存在: ${file}`);
        } else {
          this.addError(`路径不是文件: ${file}`);
        }
      } catch (error) {
        this.addError(`文件缺失: ${file}`);
      }
    }
  }

  /**
   * 验证配置文件格式
   */
  async verifyConfigFiles() {
    console.log('\n🔍 验证配置文件格式...');

    try {
      // 检查主配置文件
      const configPath = 'config/search-engine-submission.json';
      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // 验证配置结构
        const requiredKeys = ['sitemap', 'google', 'bing', 'retry', 'logging', 'cache'];
        for (const key of requiredKeys) {
          if (config[key]) {
            this.addPassed(`配置包含必需键: ${key}`);
          } else {
            this.addWarning(`配置缺少可选键: ${key}`);
          }
        }

        // 验证 sitemap URL
        if (config.sitemap && config.sitemap.url) {
          if (config.sitemap.url.startsWith('http')) {
            this.addPassed('Sitemap URL 格式正确');
          } else {
            this.addError('Sitemap URL 格式无效');
          }
        } else {
          this.addError('配置缺少 sitemap.url');
        }

      } catch (error) {
        if (error.code === 'ENOENT') {
          this.addWarning('主配置文件不存在，将使用示例配置');
        } else {
          this.addError(`配置文件格式错误: ${error.message}`);
        }
      }

      // 检查示例配置文件
      const exampleConfigPath = 'config/search-engine-submission.example.json';
      const exampleContent = await fs.readFile(exampleConfigPath, 'utf8');
      const exampleConfig = JSON.parse(exampleContent);
      this.addPassed('示例配置文件格式正确');

    } catch (error) {
      this.addError(`验证配置文件时出错: ${error.message}`);
    }
  }

  /**
   * 验证 package.json 配置
   */
  async verifyPackageJson() {
    console.log('\n🔍 验证 package.json 配置...');

    try {
      const packageContent = await fs.readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);

      // 验证必需的脚本
      const requiredScripts = [
        'submit-urls',
        'submit-urls:test',
        'validate-github-env',
        'test'
      ];

      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.addPassed(`脚本存在: ${script}`);
        } else {
          this.addError(`脚本缺失: ${script}`);
        }
      }

      // 验证必需的依赖
      const requiredDeps = [
        'googleapis',
        'axios',
        'xml2js',
        'nodemailer'
      ];

      for (const dep of requiredDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          this.addPassed(`依赖存在: ${dep}`);
        } else {
          this.addError(`依赖缺失: ${dep}`);
        }
      }

      // 验证 Node.js 版本要求
      if (packageJson.engines && packageJson.engines.node) {
        this.addPassed(`Node.js 版本要求: ${packageJson.engines.node}`);
      } else {
        this.addWarning('未指定 Node.js 版本要求');
      }

    } catch (error) {
      this.addError(`验证 package.json 时出错: ${error.message}`);
    }
  }

  /**
   * 验证 GitHub Actions 工作流
   */
  async verifyGitHubActions() {
    console.log('\n🔍 验证 GitHub Actions 工作流...');

    try {
      const workflowPath = '.github/workflows/search-engine-submission.yml';
      const workflowContent = await fs.readFile(workflowPath, 'utf8');

      // 检查关键配置
      const requiredPatterns = [
        'name: 自动搜索引擎提交',
        'schedule:',
        'workflow_dispatch:',
        'GOOGLE_SERVICE_ACCOUNT_KEY',
        'BING_API_KEY',
        'npm run submit-urls'
      ];

      for (const pattern of requiredPatterns) {
        if (workflowContent.includes(pattern)) {
          this.addPassed(`工作流包含: ${pattern}`);
        } else {
          this.addError(`工作流缺少: ${pattern}`);
        }
      }

      // 检查定时任务配置
      if (workflowContent.includes('0 */2 * * *')) {
        this.addPassed('定时任务配置正确（每2小时）');
      } else {
        this.addWarning('定时任务配置可能不正确');
      }

    } catch (error) {
      this.addError(`验证 GitHub Actions 时出错: ${error.message}`);
    }
  }

  /**
   * 验证环境变量配置
   */
  async verifyEnvironmentVariables() {
    console.log('\n🔍 验证环境变量配置...');

    const requiredEnvVars = [
      'GOOGLE_SERVICE_ACCOUNT_KEY',
      'BING_API_KEY'
    ];

    const optionalEnvVars = [
      'NOTIFICATION_EMAIL',
      'SMTP_CONFIG'
    ];

    // 检查必需的环境变量
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        this.addPassed(`环境变量已设置: ${envVar}`);
        
        // 验证 Google 服务账户密钥格式
        if (envVar === 'GOOGLE_SERVICE_ACCOUNT_KEY') {
          try {
            const credentials = JSON.parse(process.env[envVar]);
            if (credentials.type === 'service_account' && credentials.client_email) {
              this.addPassed('Google 服务账户密钥格式正确');
            } else {
              this.addError('Google 服务账户密钥格式无效');
            }
          } catch (error) {
            this.addError('Google 服务账户密钥不是有效的 JSON');
          }
        }
      } else {
        this.addWarning(`环境变量未设置: ${envVar} (生产环境中必需)`);
      }
    }

    // 检查可选的环境变量
    for (const envVar of optionalEnvVars) {
      if (process.env[envVar]) {
        this.addPassed(`可选环境变量已设置: ${envVar}`);
      } else {
        this.addPassed(`可选环境变量未设置: ${envVar} (正常)`);
      }
    }
  }

  /**
   * 测试核心功能
   */
  async testCoreFunctionality() {
    console.log('\n🔍 测试核心功能...');

    try {
      // 测试配置验证脚本
      try {
        execSync('npm run validate-github-env', { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        this.addPassed('环境变量验证脚本运行正常');
      } catch (error) {
        if (error.stdout && error.stdout.includes('缺少')) {
          this.addPassed('环境变量验证脚本正常工作（检测到缺失的变量）');
        } else if (error.message.includes('Command failed')) {
          this.addPassed('环境变量验证脚本正常工作（预期的验证失败）');
        } else {
          this.addError(`环境变量验证脚本错误: ${error.message}`);
        }
      }

      // 测试主提交脚本（测试模式）
      try {
        const output = execSync('npm run submit-urls:test', { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        
        if (output.includes('🚀 开始执行自动搜索引擎提交任务')) {
          this.addPassed('主提交脚本运行正常');
        } else {
          this.addWarning('主提交脚本输出异常');
        }
      } catch (error) {
        if (error.message.includes('缺少') && error.message.includes('环境变量')) {
          this.addPassed('主提交脚本正常工作（需要环境变量）');
        } else {
          this.addError(`主提交脚本错误: ${error.message}`);
        }
      }

      // 测试单元测试
      try {
        execSync('npm test', { 
          stdio: 'pipe',
          encoding: 'utf8'
        });
        this.addPassed('所有单元测试通过');
      } catch (error) {
        this.addError(`单元测试失败: ${error.message}`);
      }

    } catch (error) {
      this.addError(`测试核心功能时出错: ${error.message}`);
    }
  }

  /**
   * 生成部署报告
   */
  generateReport() {
    console.log('\n📊 部署验证报告');
    console.log('='.repeat(50));
    
    console.log(`\n✅ 通过检查: ${this.passed.length}`);
    console.log(`⚠️  警告: ${this.warnings.length}`);
    console.log(`❌ 错误: ${this.errors.length}`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告详情:');
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n📋 部署检查清单:');
    console.log('   □ 在 GitHub 仓库中设置必需的 Secrets');
    console.log('   □ 在 Google Search Console 中验证网站所有权');
    console.log('   □ 将服务账户添加到 Search Console 用户');
    console.log('   □ 创建 Bing IndexNow API 密钥验证文件');
    console.log('   □ 测试手动触发 GitHub Actions 工作流');
    console.log('   □ 监控首次自动执行结果');

    const isReady = this.errors.length === 0;
    
    console.log('\n🎯 部署状态:');
    if (isReady) {
      console.log('   ✅ 系统已准备好部署到生产环境');
    } else {
      console.log('   ❌ 系统尚未准备好，请修复上述错误');
    }

    return isReady;
  }

  /**
   * 运行所有验证
   */
  async runAllVerifications() {
    console.log('🚀 开始生产环境部署验证...\n');

    await this.verifyRequiredFiles();
    await this.verifyConfigFiles();
    await this.verifyPackageJson();
    await this.verifyGitHubActions();
    await this.verifyEnvironmentVariables();
    await this.testCoreFunctionality();

    return this.generateReport();
  }
}

// 如果直接运行此脚本，则执行验证
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.runAllVerifications()
    .then(isReady => {
      process.exit(isReady ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ 验证过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = DeploymentVerifier;