# 自动搜索引擎提交使用指南

本文档详细说明如何设置和使用自动搜索引擎提交功能。

## 目录

1. [功能概述](#功能概述)
2. [快速开始](#快速开始)
3. [详细设置步骤](#详细设置步骤)
4. [使用方法](#使用方法)
5. [监控和维护](#监控和维护)
6. [故障排除](#故障排除)
7. [最佳实践](#最佳实践)

## 功能概述

自动搜索引擎提交功能可以：

- 🔍 **自动检测**：监控网站 sitemap.xml 的变化
- 🚀 **自动提交**：将新增的 URL 提交到 Google 和 Bing 搜索引擎
- ⏰ **定时执行**：通过 GitHub Actions 每2小时自动运行
- 📊 **详细报告**：提供提交成功率和配额使用情况
- 🔄 **智能重试**：自动处理临时错误和网络问题
- 📧 **邮件通知**：可选的邮件通知功能

## 快速开始

### 前置条件

- GitHub 仓库（用于运行 GitHub Actions）
- 网站已部署并可访问
- 网站有有效的 sitemap.xml 文件

### 5分钟快速设置

1. **复制配置文件**
   ```bash
   cp config/search-engine-submission.example.json config/search-engine-submission.json
   ```

2. **修改配置文件**
   ```json
   {
     "sitemap": {
       "url": "https://your-website.com/sitemap.xml"
     }
   }
   ```

3. **设置环境变量**（详见[环境变量设置指南](ENVIRONMENT-SETUP.md)）
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `BING_API_KEY`

4. **测试运行**
   ```bash
   npm run submit-urls:test
   ```

5. **启用自动化**
   - 提交代码到 GitHub
   - GitHub Actions 将自动开始运行

## 详细设置步骤

### 步骤 1：Google Search Console 设置

#### 1.1 验证网站所有权

1. 访问 [Google Search Console](https://search.google.com/search-console/)
2. 添加你的网站属性
3. 选择验证方法（推荐使用 HTML 文件验证）
4. 完成验证流程

#### 1.2 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 "Indexing API"
4. 创建服务账户并下载 JSON 密钥文件

#### 1.3 添加服务账户到 Search Console

1. 在 Google Search Console 中，转到 "Settings" > "Users and permissions"
2. 添加服务账户邮箱作为用户（权限设为 Owner）

### 步骤 2：Bing IndexNow 设置

Bing 使用 IndexNow 协议，设置相对简单：

1. 生成一个随机的 API 密钥（32-64位十六进制字符串）
2. 设置 `BING_API_KEY` 环境变量
3. 系统会自动在网站根目录创建验证文件

### 步骤 3：GitHub Actions 设置

#### 3.1 设置 GitHub Secrets

在 GitHub 仓库中设置以下 Secrets：

| Secret 名称 | 说明 | 必需 |
|-------------|------|------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google 服务账户 JSON 密钥 | 是 |
| `BING_API_KEY` | Bing IndexNow API 密钥 | 是 |
| `NOTIFICATION_EMAIL` | 通知邮箱地址 | 否 |
| `SMTP_CONFIG` | SMTP 服务器配置 | 否 |

#### 3.2 验证工作流文件

确保 `.github/workflows/search-engine-submission.yml` 文件存在且配置正确。

### 步骤 4：配置文件设置

编辑 `config/search-engine-submission.json`：

```json
{
  "sitemap": {
    "url": "https://your-website.com/sitemap.xml",
    "checkInterval": 2
  },
  "google": {
    "quotaLimit": 200
  },
  "bing": {
    "quotaLimit": 10000
  },
  "retry": {
    "maxAttempts": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000
  },
  "logging": {
    "level": "info"
  }
}
```

## 使用方法

### 手动执行

#### 测试模式（推荐用于首次测试）

```bash
# 测试模式，不会实际提交 URL
npm run submit-urls:test
```

#### 生产模式

```bash
# 实际提交 URL 到搜索引擎
npm run submit-urls
```

#### 验证环境配置

```bash
# 验证环境变量和配置
npm run validate-github-env
```

### 自动执行

#### GitHub Actions 自动运行

- **定时执行**：每2小时自动运行一次
- **手动触发**：在 GitHub Actions 页面手动触发
- **推送触发**：可配置在代码推送时触发

#### 手动触发 GitHub Actions

1. 访问 GitHub 仓库的 "Actions" 页面
2. 选择 "自动搜索引擎提交" 工作流
3. 点击 "Run workflow"
4. 选择运行参数：
   - **测试模式**：是否在测试模式下运行
   - **强制提交**：是否忽略缓存强制提交

### 查看执行结果

#### GitHub Actions 日志

1. 访问 "Actions" 页面
2. 点击具体的运行记录
3. 查看详细的执行日志

#### 日志信息解读

**成功示例：**
```
✅ Bing 提交完成: 成功 10, 失败 0
📊 提交统计: 总计 10, 成功 10, 失败 0, 成功率 100%
```

**失败示例：**
```
❌ Google 提交失败: Permission denied. Failed to verify the URL ownership.
⚠️ 建议检查 Google Search Console 中的网站验证状态
```

## 监控和维护

### 定期检查项目

#### 每周检查

1. **查看 GitHub Actions 运行状态**
   - 检查是否有失败的运行
   - 查看成功率趋势

2. **检查配额使用情况**
   - Google API：每日200次限制
   - Bing API：每日10000次限制

3. **验证网站状态**
   - 确保 sitemap.xml 可访问
   - 检查网站是否正常运行

#### 每月检查

1. **更新依赖包**
   ```bash
   npm update
   ```

2. **检查 API 密钥有效性**
   - Google 服务账户密钥是否过期
   - Bing API 密钥是否正常工作

3. **审查提交统计**
   - 分析提交成功率
   - 识别常见错误模式

### 性能优化

#### 调整提交频率

根据网站更新频率调整检查间隔：

```json
{
  "sitemap": {
    "checkInterval": 1  // 高频更新网站：每小时检查
  }
}
```

```json
{
  "sitemap": {
    "checkInterval": 6  // 低频更新网站：每6小时检查
  }
}
```

#### 配额管理

如果接近配额限制，可以：

1. **减少提交频率**
2. **优先提交重要页面**
3. **申请更高的 API 配额**

## 故障排除

### 常见问题及解决方案

#### 1. Google 提交失败

**错误信息：** `Permission denied. Failed to verify the URL ownership.`

**可能原因：**
- 网站未在 Google Search Console 中验证
- 服务账户未添加到 Search Console
- 服务账户权限不足

**解决步骤：**
1. 确认网站在 Google Search Console 中已验证
2. 检查服务账户邮箱是否已添加为用户
3. 确保服务账户权限为 "Owner" 或 "Full"

#### 2. Sitemap 无法访问

**错误信息：** `获取 sitemap 失败: HTTP 404`

**可能原因：**
- Sitemap URL 错误
- 网站服务器问题
- Sitemap 文件不存在

**解决步骤：**
1. 在浏览器中直接访问 sitemap URL
2. 检查网站的 robots.txt 文件
3. 验证 sitemap 格式是否正确

#### 3. GitHub Actions 运行失败

**错误信息：** `缺少 GOOGLE_SERVICE_ACCOUNT_KEY 环境变量`

**可能原因：**
- GitHub Secrets 未正确设置
- Secret 名称拼写错误
- Secret 值格式错误

**解决步骤：**
1. 检查 GitHub 仓库的 Secrets 设置
2. 确认 Secret 名称拼写正确
3. 验证 JSON 格式是否有效

#### 4. 配额超限

**错误信息：** `Rate limit exceeded`

**可能原因：**
- API 调用频率过高
- 达到每日配额限制
- 短时间内提交过多 URL

**解决步骤：**
1. 检查当前配额使用情况
2. 调整提交频率
3. 考虑申请更高配额

### 调试技巧

#### 启用详细日志

```json
{
  "logging": {
    "level": "debug",
    "enableConsole": true
  }
}
```

#### 使用诊断工具

```bash
# 检查 API 连接状态
node scripts/diagnose-apis.js

# 验证配置文件
npm run validate-github-env

# 测试 sitemap 解析
npm run submit-urls:test
```

#### 分步调试

1. **测试 sitemap 访问**
   ```bash
   curl -I https://your-website.com/sitemap.xml
   ```

2. **验证 JSON 格式**
   ```bash
   echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq .
   ```

3. **检查网络连接**
   ```bash
   ping indexing.googleapis.com
   ping api.indexnow.org
   ```

## 最佳实践

### 安全实践

1. **保护 API 密钥**
   - 永远不要将密钥提交到代码仓库
   - 定期轮换 API 密钥
   - 使用最小权限原则

2. **监控异常活动**
   - 设置邮件通知
   - 定期检查 API 使用情况
   - 监控失败率趋势

### 性能实践

1. **优化提交策略**
   - 只提交新增和更新的 URL
   - 避免重复提交相同 URL
   - 合理设置检查频率

2. **资源管理**
   - 监控 API 配额使用
   - 优化缓存策略
   - 及时清理过期数据

### 维护实践

1. **定期更新**
   - 保持依赖包最新
   - 关注 API 变更通知
   - 更新文档和配置

2. **备份和恢复**
   - 备份重要配置文件
   - 记录 API 密钥信息
   - 制定故障恢复计划

### 扩展实践

1. **多环境支持**
   - 为开发、测试、生产环境创建不同配置
   - 使用环境变量区分不同环境
   - 实施渐进式部署策略

2. **集成其他工具**
   - 与网站分析工具集成
   - 添加自定义通知渠道
   - 扩展支持更多搜索引擎

## 支持和帮助

### 获取帮助

1. **查看文档**
   - [配置说明](CONFIGURATION.md)
   - [环境设置指南](ENVIRONMENT-SETUP.md)
   - [GitHub Actions 设置](GITHUB-ACTIONS-SETUP.md)

2. **运行诊断工具**
   ```bash
   npm run validate-github-env
   npm run submit-urls:test
   ```

3. **查看日志**
   - GitHub Actions 执行日志
   - 本地运行日志
   - 错误信息和堆栈跟踪

### 常用命令参考

```bash
# 安装依赖
npm install

# 测试运行（不实际提交）
npm run submit-urls:test

# 生产运行（实际提交）
npm run submit-urls

# 验证环境配置
npm run validate-github-env

# 运行单元测试
npm test

# 查看测试覆盖率
npm run test:coverage
```

### 相关链接

- [Google Search Console](https://search.google.com/search-console/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Indexing API 文档](https://developers.google.com/search/apis/indexing-api)
- [IndexNow 协议文档](https://www.indexnow.org/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)