# 故障排除指南

本文档提供了自动搜索引擎提交功能常见问题的解决方案。

## 目录

1. [快速诊断](#快速诊断)
2. [Google API 问题](#google-api-问题)
3. [Bing API 问题](#bing-api-问题)
4. [GitHub Actions 问题](#github-actions-问题)
5. [配置问题](#配置问题)
6. [网络问题](#网络问题)
7. [性能问题](#性能问题)
8. [调试工具](#调试工具)

## 快速诊断

### 诊断检查清单

在深入具体问题之前，请先运行以下检查：

```bash
# 1. 验证环境配置
npm run validate-github-env

# 2. 测试基本功能
npm run submit-urls:test

# 3. 检查 sitemap 可访问性
curl -I https://your-website.com/sitemap.xml

# 4. 验证配置文件格式
cat config/search-engine-submission.json | jq .
```

### 常见错误快速参考

| 错误类型 | 关键词 | 快速解决方案 |
|----------|--------|--------------|
| 权限错误 | `Permission denied` | 检查 Google Search Console 用户权限 |
| 环境变量 | `缺少环境变量` | 设置 GitHub Secrets 或本地环境变量 |
| Sitemap 错误 | `获取 sitemap 失败` | 检查 sitemap URL 和可访问性 |
| 配额超限 | `Quota exceeded` | 等待配额重置或调整提交频率 |
| 网络错误 | `Network Error` | 检查网络连接和防火墙设置 |

## Google API 问题

### 权限相关错误

#### 错误：Permission denied. Failed to verify the URL ownership.

**完整错误信息：**
```
❌ 提交到 Google 失败: https://your-website.com/page
{error: '权限不足: Permission denied. Failed to verify the URL ownership.'}
```

**可能原因：**
1. 网站未在 Google Search Console 中验证
2. 服务账户未添加到 Search Console
3. 服务账户权限不足
4. 网站验证已过期

**解决步骤：**

1. **检查网站验证状态**
   ```bash
   # 访问 Google Search Console
   # https://search.google.com/search-console/
   # 确认网站显示为"已验证"
   ```

2. **检查服务账户用户**
   - 在 Search Console 中，转到 "设置" > "用户和权限"
   - 确认服务账户邮箱在用户列表中
   - 权限应该是 "所有者" 或 "完全"

3. **重新添加服务账户**
   ```bash
   # 获取服务账户邮箱
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq -r '.client_email'
   
   # 在 Search Console 中添加此邮箱为用户
   ```

4. **验证服务账户密钥**
   ```bash
   # 检查密钥格式
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq .
   
   # 确认项目 ID
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq -r '.project_id'
   ```

#### 错误：Google Indexing API has not been used in project

**完整错误信息：**
```
Google Indexing API has not been used in project {project-id} before or it is disabled.
```

**解决步骤：**

1. **启用 Indexing API**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 转到 "APIs & Services" > "Library"
   - 搜索 "Indexing API"
   - 点击 "启用"

2. **等待 API 生效**
   ```bash
   # 等待 5-10 分钟后重试
   npm run submit-urls:test
   ```

3. **检查项目 ID**
   ```bash
   # 确认使用正确的项目
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq -r '.project_id'
   ```

### 配额相关错误

#### 错误：Quota exceeded for quota metric 'Requests' and limit 'Requests per day'

**解决步骤：**

1. **检查当前配额使用**
   - 访问 Google Cloud Console
   - 转到 "APIs & Services" > "Quotas"
   - 搜索 "Indexing API"

2. **调整提交策略**
   ```json
   {
     "google": {
       "quotaLimit": 150  // 降低每日限制
     },
     "sitemap": {
       "checkInterval": 4  // 减少检查频率
     }
   }
   ```

3. **申请配额增加**
   - 在 Google Cloud Console 中申请更高配额
   - 通常需要 1-2 个工作日审批

### 认证相关错误

#### 错误：Invalid JWT Signature

**可能原因：**
- 服务账户密钥格式错误
- 密钥文件损坏
- 环境变量设置错误

**解决步骤：**

1. **重新下载密钥文件**
   - 在 Google Cloud Console 中创建新密钥
   - 删除旧密钥

2. **验证 JSON 格式**
   ```bash
   # 检查 JSON 格式是否有效
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
   ```

3. **检查特殊字符**
   ```bash
   # 确保没有换行符或其他特殊字符
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | wc -l  # 应该输出 1
   ```

## Bing API 问题

### IndexNow 相关错误

#### 错误：Key verification failed

**完整错误信息：**
```
❌ 提交到 Bing 失败: Key verification failed
```

**可能原因：**
1. 密钥验证文件不存在或不可访问
2. 验证文件内容与 API 密钥不匹配
3. 网站服务器配置问题

**解决步骤：**

1. **检查验证文件**
   ```bash
   # 获取 API 密钥
   echo $BING_API_KEY
   
   # 检查验证文件是否可访问
   curl https://your-website.com/$BING_API_KEY.txt
   
   # 文件内容应该与 API 密钥完全一致
   ```

2. **手动创建验证文件**
   ```bash
   # 在网站根目录创建文件
   echo $BING_API_KEY > /path/to/website/root/$BING_API_KEY.txt
   ```

3. **检查服务器配置**
   ```bash
   # 确保服务器支持 .txt 文件访问
   curl -I https://your-website.com/robots.txt
   ```

#### 错误：Invalid URL format

**可能原因：**
- URL 包含无效字符
- URL 编码问题
- 协议不正确（必须是 http 或 https）

**解决步骤：**

1. **检查 URL 格式**
   ```bash
   # 运行测试模式查看处理的 URL
   npm run submit-urls:test
   ```

2. **验证 URL 编码**
   ```javascript
   // 确保 URL 正确编码
   const url = 'https://your-website.com/页面';
   const encodedUrl = encodeURI(url);
   console.log(encodedUrl);
   ```

### 网络相关错误

#### 错误：Request timeout

**解决步骤：**

1. **检查网络连接**
   ```bash
   # 测试 IndexNow API 连接
   curl -I https://api.indexnow.org/indexnow
   ```

2. **调整超时设置**
   ```json
   {
     "retry": {
       "maxAttempts": 5,
       "initialDelay": 2000
     }
   }
   ```

## GitHub Actions 问题

### 环境变量问题

#### 错误：缺少 GOOGLE_SERVICE_ACCOUNT_KEY 环境变量

**解决步骤：**

1. **检查 GitHub Secrets 设置**
   - 访问 GitHub 仓库
   - 转到 "Settings" > "Secrets and variables" > "Actions"
   - 确认 Secret 名称拼写正确

2. **验证 Secret 值**
   ```yaml
   # 在 GitHub Actions 中添加调试步骤
   - name: Debug Environment
     run: |
       echo "Checking environment variables..."
       [ -n "$GOOGLE_SERVICE_ACCOUNT_KEY" ] && echo "✅ GOOGLE_SERVICE_ACCOUNT_KEY is set" || echo "❌ GOOGLE_SERVICE_ACCOUNT_KEY is missing"
       [ -n "$BING_API_KEY" ] && echo "✅ BING_API_KEY is set" || echo "❌ BING_API_KEY is missing"
   ```

### 工作流执行问题

#### 错误：Workflow run failed

**常见原因和解决方案：**

1. **Node.js 版本不兼容**
   ```yaml
   # 确保使用正确的 Node.js 版本
   - name: 设置 Node.js
     uses: actions/setup-node@v4
     with:
       node-version: '20'  # 确保版本 >= 20
   ```

2. **依赖安装失败**
   ```yaml
   # 使用正确的安装命令
   - name: 安装依赖
     run: |
       npm install --omit=dev
       npm install googleapis@144.0.0 nodemailer@6.9.15 xml2js@0.6.2
   ```

3. **权限问题**
   ```yaml
   # 确保工作流有必要的权限
   permissions:
     contents: read
     actions: read
   ```

### 缓存问题

#### 错误：Cache restore failed

**解决步骤：**

1. **清理缓存**
   - 在 GitHub Actions 页面手动清理缓存
   - 或在工作流中添加缓存清理步骤

2. **调整缓存配置**
   ```yaml
   - name: 恢复缓存
     uses: actions/cache@v4
     with:
       path: .cache
       key: sitemap-cache-${{ runner.os }}-${{ hashFiles('config/search-engine-submission.json') }}
       restore-keys: |
         sitemap-cache-${{ runner.os }}-
   ```

## 配置问题

### 配置文件错误

#### 错误：配置文件格式无效

**解决步骤：**

1. **验证 JSON 格式**
   ```bash
   # 检查配置文件语法
   cat config/search-engine-submission.json | jq .
   ```

2. **使用配置模板**
   ```bash
   # 重新复制配置模板
   cp config/search-engine-submission.example.json config/search-engine-submission.json
   ```

3. **逐步添加配置**
   ```json
   {
     "sitemap": {
       "url": "https://your-website.com/sitemap.xml"
     }
   }
   ```

### Sitemap 相关问题

#### 错误：获取 sitemap 失败: HTTP 404

**解决步骤：**

1. **验证 sitemap URL**
   ```bash
   # 直接访问 sitemap
   curl -I https://your-website.com/sitemap.xml
   
   # 检查响应状态码
   curl -s -o /dev/null -w "%{http_code}" https://your-website.com/sitemap.xml
   ```

2. **检查 robots.txt**
   ```bash
   # 确保 sitemap 在 robots.txt 中声明
   curl https://your-website.com/robots.txt | grep -i sitemap
   ```

3. **验证 sitemap 格式**
   ```bash
   # 下载并检查 sitemap 格式
   curl https://your-website.com/sitemap.xml | head -20
   ```

#### 错误：Sitemap 解析失败

**可能原因：**
- XML 格式错误
- 编码问题
- 文件损坏

**解决步骤：**

1. **验证 XML 格式**
   ```bash
   # 使用 xmllint 验证
   curl https://your-website.com/sitemap.xml | xmllint --format -
   ```

2. **检查编码**
   ```bash
   # 确认文件编码
   curl -s https://your-website.com/sitemap.xml | file -
   ```

## 网络问题

### 连接超时

#### 错误：Request timeout / ECONNABORTED

**解决步骤：**

1. **检查网络连接**
   ```bash
   # 测试基本连接
   ping google.com
   ping api.indexnow.org
   ```

2. **检查防火墙设置**
   ```bash
   # 测试 HTTPS 连接
   curl -I https://indexing.googleapis.com
   curl -I https://api.indexnow.org
   ```

3. **调整超时设置**
   ```json
   {
     "retry": {
       "maxAttempts": 5,
       "initialDelay": 3000
     }
   }
   ```

### DNS 解析问题

#### 错误：ENOTFOUND / DNS resolution failed

**解决步骤：**

1. **检查 DNS 设置**
   ```bash
   # 测试 DNS 解析
   nslookup indexing.googleapis.com
   nslookup api.indexnow.org
   ```

2. **使用备用 DNS**
   ```bash
   # 临时使用 Google DNS
   export DNS_SERVER=8.8.8.8
   ```

## 性能问题

### 执行速度慢

**优化建议：**

1. **减少并发请求**
   ```json
   {
     "retry": {
       "maxAttempts": 2,
       "initialDelay": 500
     }
   }
   ```

2. **优化 sitemap 检查**
   ```json
   {
     "sitemap": {
       "checkInterval": 4  // 减少检查频率
     }
   }
   ```

3. **使用缓存**
   ```json
   {
     "cache": {
       "directory": ".cache",
       "sitemapCacheFile": "sitemap-cache.json"
     }
   }
   ```

### 内存使用过高

**解决方案：**

1. **限制批量大小**
   ```javascript
   // 在代码中限制每次处理的 URL 数量
   const BATCH_SIZE = 50;
   ```

2. **清理临时数据**
   ```bash
   # 定期清理缓存
   rm -rf .cache/*
   ```

## 调试工具

### 内置调试命令

```bash
# 验证环境配置
npm run validate-github-env

# 测试模式运行
npm run submit-urls:test

# 运行单元测试
npm test

# 查看测试覆盖率
npm run test:coverage
```

### 自定义调试脚本

创建 `scripts/debug.js`：

```javascript
#!/usr/bin/env node

const config = require('../config/search-engine-submission.json');

console.log('=== 配置检查 ===');
console.log('Sitemap URL:', config.sitemap.url);
console.log('Google 配额限制:', config.google.quotaLimit);
console.log('Bing 配额限制:', config.bing.quotaLimit);

console.log('\n=== 环境变量检查 ===');
console.log('GOOGLE_SERVICE_ACCOUNT_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '已设置' : '未设置');
console.log('BING_API_KEY:', process.env.BING_API_KEY ? '已设置' : '未设置');

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    console.log('Google 项目 ID:', credentials.project_id);
    console.log('Google 客户端邮箱:', credentials.client_email);
  } catch (error) {
    console.log('Google 密钥格式错误:', error.message);
  }
}
```

### 日志分析

启用详细日志：

```json
{
  "logging": {
    "level": "debug",
    "enableConsole": true,
    "enableFile": true
  }
}
```

### 网络调试

```bash
# 使用 curl 测试 API 端点
curl -v -X POST https://indexing.googleapis.com/v3/urlNotifications:publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -d '{"url": "https://your-website.com/test", "type": "URL_UPDATED"}'

# 测试 IndexNow API
curl -v -X POST https://api.indexnow.org/indexnow \
  -H "Content-Type: application/json" \
  -d '{"host": "your-website.com", "key": "your-api-key", "urlList": ["https://your-website.com/test"]}'
```

## 获取帮助

### 日志收集

在报告问题时，请提供以下信息：

1. **错误信息**
   ```bash
   npm run submit-urls:test 2>&1 | tee debug.log
   ```

2. **环境信息**
   ```bash
   node --version
   npm --version
   echo $NODE_ENV
   ```

3. **配置信息**（移除敏感数据）
   ```bash
   cat config/search-engine-submission.json | jq 'del(.google.credentials)'
   ```

### 联系支持

1. **查看文档**
   - [用户指南](USER-GUIDE.md)
   - [配置说明](CONFIGURATION.md)
   - [API 设置指南](API-SETUP-GUIDE.md)

2. **运行诊断**
   ```bash
   npm run validate-github-env
   npm run submit-urls:test
   ```

3. **提供详细信息**
   - 完整的错误信息
   - 相关的配置文件（移除敏感信息）
   - 执行环境信息