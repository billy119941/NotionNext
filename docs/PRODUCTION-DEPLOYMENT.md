# 生产环境部署指南

本文档详细说明如何将自动搜索引擎提交功能部署到生产环境。

## 部署前检查

在开始部署之前，请运行部署验证脚本：

```bash
npm run deployment-verify
```

确保所有检查都通过，只有环境变量警告是正常的（因为本地环境没有生产密钥）。

## 部署步骤

### 步骤 1：准备 Google API 配置

#### 1.1 创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 "Google Indexing API"

#### 1.2 创建服务账户

1. 转到 "APIs & Services" > "Credentials"
2. 创建服务账户：`search-engine-submitter`
3. 下载 JSON 密钥文件

#### 1.3 配置 Google Search Console

1. 访问 [Google Search Console](https://search.google.com/search-console/)
2. 验证网站所有权
3. 添加服务账户邮箱为用户（权限：所有者）

### 步骤 2：准备 Bing API 配置

#### 2.1 生成 API 密钥

```bash
# 生成 32 位十六进制字符串
openssl rand -hex 32
```

#### 2.2 创建验证文件

在网站根目录创建文件：`{api-key}.txt`，内容为 API 密钥本身。

### 步骤 3：配置 GitHub Secrets

在 GitHub 仓库中设置以下 Secrets：

| Secret 名称 | 值 | 说明 |
|-------------|----|----|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 完整的 JSON 密钥内容 | Google 服务账户密钥 |
| `BING_API_KEY` | 生成的 API 密钥 | Bing IndexNow API 密钥 |
| `NOTIFICATION_EMAIL` | 管理员邮箱 | 可选：接收通知的邮箱 |
| `SMTP_CONFIG` | SMTP 配置 JSON | 可选：邮件发送配置 |

#### 设置步骤：

1. 在 GitHub 仓库中，转到 "Settings" > "Secrets and variables" > "Actions"
2. 点击 "New repository secret"
3. 输入 Secret 名称和值
4. 点击 "Add secret"

### 步骤 4：配置网站 Sitemap

确保网站配置文件中的 sitemap URL 正确：

```json
{
  "sitemap": {
    "url": "https://your-website.com/sitemap.xml"
  }
}
```

### 步骤 5：首次部署测试

#### 5.1 手动触发测试

1. 访问 GitHub 仓库的 "Actions" 页面
2. 选择 "自动搜索引擎提交" 工作流
3. 点击 "Run workflow"
4. 选择参数：
   - **测试模式**: `true`
   - **强制提交**: `false`
5. 点击 "Run workflow"

#### 5.2 验证测试结果

检查执行日志，确保：
- ✅ 环境变量验证通过
- ✅ Sitemap 获取成功
- ✅ URL 标准化正常
- ✅ 测试模式跳过实际提交

### 步骤 6：生产环境首次运行

#### 6.1 手动触发生产运行

1. 再次访问 "Actions" 页面
2. 运行工作流，参数设置：
   - **测试模式**: `false`
   - **强制提交**: `true`（首次运行建议启用）

#### 6.2 监控执行结果

检查执行日志，关注：
- Google 提交结果
- Bing 提交结果
- 错误信息和警告
- 配额使用情况

### 步骤 7：启用自动化

#### 7.1 验证定时任务

确认工作流配置中的定时任务：
```yaml
schedule:
  - cron: '0 */2 * * *'  # 每2小时运行一次
```

#### 7.2 监控首周运行

在首周内，每天检查：
- GitHub Actions 执行状态
- 提交成功率
- 错误日志
- API 配额使用情况

## 部署后配置

### 监控和告警

#### 1. GitHub Actions 通知

在 GitHub 仓库设置中启用 Actions 通知：
1. 转到 "Settings" > "Notifications"
2. 启用 "Actions" 通知
3. 选择通知方式（邮件/Web）

#### 2. 邮件通知配置

如果设置了 `SMTP_CONFIG`，系统会自动发送邮件通知：

```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "your-email@gmail.com",
    "pass": "your-app-password"
  }
}
```

### 性能优化

#### 1. 调整执行频率

根据网站更新频率调整：

```json
{
  "sitemap": {
    "checkInterval": 4  // 改为每4小时检查一次
  }
}
```

对应的工作流配置：
```yaml
schedule:
  - cron: '0 */4 * * *'  # 每4小时运行一次
```

#### 2. 配额管理

监控 API 配额使用：
- Google Indexing API: 每日 200 次
- Bing IndexNow API: 建议每日 10,000 次以内

### 故障处理

#### 常见问题

1. **Google 权限错误**
   - 检查 Search Console 中的用户权限
   - 确认服务账户邮箱正确

2. **Bing 验证失败**
   - 检查验证文件是否可访问
   - 确认 API 密钥正确

3. **Sitemap 访问失败**
   - 检查 sitemap URL 是否正确
   - 确认网站服务器正常

#### 紧急处理

如果出现严重问题：

1. **暂停自动执行**
   ```yaml
   # 在工作流文件中注释掉 schedule 部分
   # schedule:
   #   - cron: '0 */2 * * *'
   ```

2. **手动诊断**
   ```bash
   npm run validate-github-env
   npm run submit-urls:test
   ```

3. **查看详细日志**
   - GitHub Actions 执行日志
   - 下载 artifacts 中的缓存文件

## 维护计划

### 每周检查

- [ ] 查看 GitHub Actions 运行状态
- [ ] 检查提交成功率
- [ ] 监控 API 配额使用
- [ ] 查看错误日志

### 每月检查

- [ ] 更新依赖包版本
- [ ] 检查 API 密钥有效性
- [ ] 审查配置参数
- [ ] 测试故障恢复流程

### 季度检查

- [ ] 评估系统性能
- [ ] 优化配置参数
- [ ] 更新文档
- [ ] 培训团队成员

## 安全最佳实践

### 密钥管理

1. **定期轮换密钥**
   - Google 服务账户密钥：每6个月
   - Bing API 密钥：每3个月

2. **访问控制**
   - 限制 GitHub 仓库访问权限
   - 定期审查 Secrets 访问日志

3. **监控异常**
   - 设置 API 使用量告警
   - 监控异常访问模式

### 数据保护

1. **日志安全**
   - 不在日志中记录敏感信息
   - 定期清理过期日志

2. **网络安全**
   - 使用 HTTPS 进行所有 API 调用
   - 验证 SSL 证书

## 扩展功能

### 支持更多搜索引擎

可以扩展支持其他搜索引擎：
- Yandex（使用 IndexNow）
- Baidu（需要单独的 API）
- 360 搜索（需要单独的 API）

### 集成分析工具

可以集成以下工具：
- Google Analytics
- Search Console API
- 自定义监控仪表板

### 自动化报告

可以添加：
- 每周提交报告
- 月度性能分析
- 季度优化建议

## 支持和帮助

### 获取帮助

1. **查看文档**
   - [用户指南](USER-GUIDE.md)
   - [故障排除](TROUBLESHOOTING.md)
   - [API 配置指南](API-SETUP-GUIDE.md)

2. **运行诊断**
   ```bash
   npm run deployment-verify
   npm run validate-github-env
   ```

3. **检查日志**
   - GitHub Actions 执行日志
   - 本地测试输出

### 联系支持

如需技术支持，请提供：
- 错误信息和日志
- 系统配置信息
- 复现步骤

---

**恭喜！** 🎉 

自动搜索引擎提交功能现已成功部署到生产环境。系统将自动监控网站更新并提交新内容到搜索引擎，帮助提高网站的搜索引擎收录速度。