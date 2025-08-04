# GitHub Actions 自动化配置指南

## 概述

本指南将帮助你配置 GitHub Actions 自动化，实现每2小时自动检测 sitemap 更新并提交新 URL 到搜索引擎。

## 🔧 配置步骤

### 1. 配置 GitHub Secrets

在你的 GitHub 仓库中，进入 `Settings` > `Secrets and variables` > `Actions`，添加以下 Secrets：

#### 必需的 Secrets

| Secret 名称 | 描述 | 示例值 |
|------------|------|--------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Service Account JSON 密钥 | `{"type": "service_account", ...}` |
| `BING_API_KEY` | Bing/IndexNow API 密钥 | `6a89d3436dfb4d97b31f5f7d43eb5319` |

#### 可选的 Secrets

| Secret 名称 | 描述 | 示例值 |
|------------|------|--------|
| `NOTIFICATION_EMAIL` | 接收通知的邮箱地址 | `admin@example.com` |
| `SMTP_CONFIG` | SMTP 服务器配置（JSON 格式） | `{"host": "smtp.gmail.com", ...}` |

### 2. 设置 Google Service Account Key

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

**重要提示**：
- 确保 JSON 格式正确
- 私钥中的换行符必须是 `\\n`
- 在 Google Search Console 中添加服务账户为网站所有者

### 3. 设置 Bing API Key

使用你的 Bing API 密钥：`6a89d3436dfb4d97b31f5f7d43eb5319`

**注意**：系统会自动使用 IndexNow API，这比传统的 Bing Webmaster API 更可靠。

## 🚀 工作流说明

### 主要工作流：`search-engine-submission.yml`

**功能特性**：
- ⏰ 每2小时自动运行
- 🎯 手动触发支持
- 🧪 测试模式选项
- 🔄 强制提交选项
- 📊 详细日志记录
- 💾 智能缓存管理

**触发方式**：
1. **自动触发**：每2小时运行一次（UTC 时间）
2. **手动触发**：在 GitHub Actions 页面点击 "Run workflow"

### 简化工作流：`url-submission-simple.yml`

**功能特性**：
- 🎯 专注于核心功能
- ⚡ 快速执行（10分钟超时）
- 💾 自动缓存管理
- 🔄 每2小时运行

## 📋 使用说明

### 手动触发工作流

1. 进入 GitHub 仓库的 `Actions` 页面
2. 选择 `自动搜索引擎提交` 工作流
3. 点击 `Run workflow`
4. 选择选项：
   - **测试模式**：只检测不提交
   - **强制提交**：忽略缓存，重新检测所有 URL

### 查看执行结果

1. 在 `Actions` 页面查看工作流运行状态
2. 点击具体的运行记录查看详细日志
3. 下载 `submission-logs` 查看缓存文件

### 监控和维护

**成功指标**：
- ✅ 工作流状态为绿色
- ✅ 日志显示 "任务执行完成"
- ✅ 有新 URL 时显示提交成功

**常见问题**：
- ❌ 红色状态：检查 Secrets 配置
- ⚠️ 黄色状态：可能是网络临时问题
- 🔄 重复失败：检查 API 配额和权限

## 🔍 故障排除

### 1. Google API 问题

**症状**：Google 提交失败
**解决方案**：
- 检查 `GOOGLE_SERVICE_ACCOUNT_KEY` 格式
- 确认服务账户权限
- 在 Google Search Console 中添加服务账户

### 2. Bing API 问题

**症状**：Bing 提交失败
**解决方案**：
- 检查 `BING_API_KEY` 是否正确
- 确认网站已验证
- 系统会自动使用 IndexNow API

### 3. 缓存问题

**症状**：没有检测到新 URL
**解决方案**：
- 使用 "强制提交" 选项
- 手动清理 Actions 缓存

### 4. 网络问题

**症状**：连接超时
**解决方案**：
- GitHub Actions 环境通常网络良好
- 重新运行工作流
- 检查 API 服务状态

## 📊 监控建议

### 定期检查项目

1. **每周检查**：
   - 工作流运行状态
   - API 配额使用情况
   - 错误日志分析

2. **每月检查**：
   - API 密钥有效期
   - 服务账户权限
   - 网站验证状态

### 性能优化

1. **缓存优化**：
   - 系统自动管理缓存
   - 避免重复提交相同 URL

2. **配额管理**：
   - Google: 200次/天
   - Bing: 10000次/天
   - 系统自动监控配额使用

## 🎯 最佳实践

1. **测试先行**：首次配置时使用测试模式
2. **监控日志**：定期查看执行日志
3. **备份配置**：保存 API 密钥的备份
4. **定期更新**：关注 API 变更和更新

## 📞 支持

如果遇到问题：
1. 查看 GitHub Actions 日志
2. 检查本文档的故障排除部分
3. 验证 API 密钥和权限配置
4. 确认网站在搜索引擎中的验证状态