# API 配置指南

## 当前问题诊断

### Google Indexing API
- ❌ **网络连接问题**：无法访问 `googleapis.com`
- ✅ **服务账户配置**：密钥格式正确，项目ID和邮箱有效

### Bing Webmaster API  
- ✅ **网络连接正常**：可以访问 `ssl.bing.com`
- ❌ **API 密钥无效**：返回 "InvalidApiKey" 错误

## 解决步骤

### 1. 解决 Google API 网络问题

**选项 A：网络代理配置**
```bash
# 如果有代理，设置环境变量
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=https://your-proxy:port
```

**选项 B：使用 VPN 或更换网络环境**
- 尝试使用不同的网络环境
- 使用 VPN 连接到可以访问 Google 服务的地区

**选项 C：在 GitHub Actions 中运行**
- GitHub Actions 的网络环境通常可以正常访问 Google API
- 建议在生产环境中使用 GitHub Actions 执行

### 2. 解决 Bing API 密钥问题

**步骤 1：验证网站所有权**
1. 访问 [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. 添加网站 `https://www.shareking.vip`
3. 完成网站验证（DNS、HTML 文件或 HTML 标签）

**步骤 2：获取正确的 API 密钥**
1. 在 Bing Webmaster Tools 中，进入 "设置" > "API 访问"
2. 生成新的 API 密钥
3. 确保 API 密钥与验证的网站关联

**步骤 3：检查 API 端点**
Bing 可能使用不同的 API 端点：
- 旧版本：`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch`
- 新版本：`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl`

## 临时测试方案

### 仅使用 Bing API 测试
```bash
# 临时禁用 Google API，只测试 Bing
export DISABLE_GOOGLE_API=true
npm run submit-urls:test
```

### 使用模拟模式
```bash
# 使用模拟模式测试完整流程
export MOCK_API_CALLS=true
npm run submit-urls:test
```

## 生产环境建议

1. **使用 GitHub Actions**：避免本地网络限制
2. **配置正确的 API 密钥**：确保从官方渠道获取
3. **设置监控和通知**：及时发现 API 问题
4. **实施降级策略**：单个 API 失败时继续使用其他 API

## 验证清单

### Google Indexing API
- [ ] Google Cloud Console 中启用了 Indexing API
- [ ] 服务账户有正确权限
- [ ] 在 Google Search Console 中添加服务账户为所有者
- [ ] 网络可以访问 googleapis.com

### Bing Webmaster API
- [ ] 网站已在 Bing Webmaster Tools 中验证
- [ ] API 密钥从正确位置获取
- [ ] API 密钥已激活且有效
- [ ] 使用正确的 API 端点

## 联系支持

如果问题持续存在：
- Google：查看 [Google Cloud Support](https://cloud.google.com/support)
- Bing：查看 [Bing Webmaster Help](https://www.bing.com/webmasters/help)