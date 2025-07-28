# SEO提交完整指南

## 🎯 快速开始

### 1. 手动提交（推荐新手）

#### Google Search Console
1. 访问 [Google Search Console](https://search.google.com/search-console/)
2. 添加网站：`https://www.shareking.vip`
3. 验证所有权（HTML文件方式）
4. 提交sitemap：`sitemap.xml`

#### Bing Webmaster Tools
1. 访问 [Bing Webmaster](https://www.bing.com/webmasters/)
2. 添加网站并验证
3. 提交sitemap

### 2. 自动提交（推荐进阶用户）

#### 配置Google Indexing API
```bash
# 1. 按照 google-indexing-api-setup.md 获取API密钥
# 2. 设置环境变量
export GOOGLE_INDEXING_API_KEY='{"type":"service_account",...}'

# 3. 运行提交脚本
node scripts/submit-to-google.js
```

#### 设置定期任务
```bash
# 启动定期提交调度器
node scripts/schedule-submissions.js
```

#### GitHub Actions自动化
1. 在GitHub仓库设置中添加Secret：`GOOGLE_INDEXING_API_KEY`
2. 推送代码，Actions会自动运行
3. 每天自动提交sitemap

## 📋 提交清单

### 必须提交的内容
- [x] 主sitemap：`sitemap.xml`
- [x] 首页URL：`https://www.shareking.vip`
- [x] 重要页面：归档页、分类页等

### 可选提交的内容
- [ ] RSS Feed：`rss/feed.xml`
- [ ] 图片sitemap（如果有大量图片）
- [ ] 新闻sitemap（如果是新闻站点）

### 提交到的搜索引擎
- [x] Google Search Console
- [x] Bing Webmaster Tools
- [ ] 百度搜索资源平台
- [ ] Yandex Webmaster

## 🔍 监控和维护

### 定期检查
1. **每周检查**：Google Search Console中的索引状态
2. **每月检查**：搜索流量和排名变化
3. **有新内容时**：手动提交重要页面

### 常见问题
1. **sitemap提交失败**：检查sitemap格式和可访问性
2. **索引缓慢**：使用URL检查工具请求索引
3. **覆盖率问题**：检查robots.txt和页面质量

## 🚀 高级功能

### 批量URL提交
```javascript
// 使用Indexing API批量提交
const urls = [
  'https://www.shareking.vip/important-page-1',
  'https://www.shareking.vip/important-page-2'
]
// 运行提交脚本
```

### 实时提交
```javascript
// 在文章发布时自动提交
// 可以集成到CMS或发布流程中
```

## 📊 效果监控

### 关键指标
- 索引页面数量
- 搜索展现次数
- 点击率(CTR)
- 平均排名位置

### 监控工具
- Google Search Console
- Google Analytics
- 第三方SEO工具

## 🔧 故障排除

### 常见错误
1. **403/404错误**：检查sitemap URL可访问性
2. **格式错误**：验证XML格式
3. **API限制**：注意提交频率限制

### 解决方案
1. 检查网站可访问性
2. 验证sitemap格式
3. 确认API密钥配置正确
4. 查看详细错误日志