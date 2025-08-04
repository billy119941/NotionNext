# 🚀 快速设置指南

## 立即开始使用自动搜索引擎提交功能

### 📋 前提条件

✅ 所有代码已经配置完成  
✅ 本地环境验证通过  
✅ API 密钥已准备就绪  

### 🔧 GitHub 配置（5分钟）

#### 1. 设置 GitHub Secrets

在你的 GitHub 仓库中：

1. 进入 `Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret`
3. 添加以下两个 Secrets：

**GOOGLE_SERVICE_ACCOUNT_KEY**
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY_HERE]\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

**注意**：请使用你实际的 Google Service Account JSON 密钥替换上面的占位符。

**BING_API_KEY**
```
your-bing-api-key-here
```

**注意**：请使用你实际的 Bing API 密钥。

#### 2. 提交代码到 GitHub

确保所有文件都已提交：
```bash
git add .
git commit -m "🚀 添加自动搜索引擎提交功能"
git push origin main
```

### 🧪 测试运行（2分钟）

#### 1. 手动触发测试

1. 进入 GitHub 仓库的 `Actions` 页面
2. 选择 `自动搜索引擎提交` 工作流
3. 点击 `Run workflow`
4. 选择 `测试模式: true`
5. 点击 `Run workflow`

#### 2. 查看结果

- ✅ 绿色：配置成功
- ❌ 红色：检查日志，通常是 Secrets 配置问题

### 🎯 生产运行

测试成功后，再次手动触发，但选择 `测试模式: false` 进行真实提交。

### ⏰ 自动化运行

配置完成后，系统将：
- 🕐 每2小时自动检查 sitemap 更新
- 🔍 自动检测新增的 URL
- 📤 自动提交到 Google 和 Bing
- 📊 记录详细的执行日志

### 📊 监控

- **查看状态**：GitHub Actions 页面
- **查看日志**：点击具体的运行记录
- **下载报告**：下载 `submission-logs` 文件

### 🎉 完成！

现在你的网站将自动：
1. 检测新发布的文章
2. 移除 URL 中的 .html 后缀
3. 提交到 Google 和 Bing 搜索引擎
4. 提供详细的执行报告

**预期效果**：
- 新文章发布后2小时内自动提交
- 提升搜索引擎收录速度
- 无需手动干预

---

## 🆘 需要帮助？

- 📖 详细文档：`docs/GITHUB-ACTIONS-SETUP.md`
- 🔧 故障排除：检查 GitHub Actions 日志
- 🧪 本地测试：`npm run submit-urls:test`
- ✅ 环境验证：`npm run validate-github-env`