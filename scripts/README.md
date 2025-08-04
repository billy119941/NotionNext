# 自动搜索引擎提交功能

## 概述

这个功能通过 GitHub Actions 自动检测网站 sitemap.xml 的更新，并将新增的 URL 提交到 Google 和 Bing 搜索引擎，以提升 SEO 表现和收录速度。

## 功能特性

- ✅ 自动检测 sitemap.xml 更新
- ✅ URL 标准化处理（移除 .html 后缀）
- ✅ 并行提交到 Google 和 Bing
- ✅ 智能重试机制
- ✅ 邮件通知功能
- ✅ 详细的执行日志

## 文件结构

```
scripts/
├── submit-urls.js              # 主执行脚本
├── lib/
│   ├── utils.js               # 通用工具函数
│   └── logger.js              # 日志记录器
└── README.md                  # 说明文档

config/
├── search-engine-submission.json         # 配置文件
└── search-engine-submission.example.json # 配置示例

.cache/
└── .gitignore                 # 缓存目录（自动创建）
```

## 配置说明

### 1. 配置文件

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
  }
}
```

### 2. 环境变量

需要设置以下环境变量：

- `GOOGLE_SERVICE_ACCOUNT_KEY`: Google Service Account JSON 密钥
- `BING_API_KEY`: Bing Webmaster API 密钥
- `NOTIFICATION_EMAIL`: 接收通知的邮箱地址（可选）
- `SMTP_CONFIG`: SMTP 服务器配置（可选）

## 使用方法

### 本地测试

```bash
# 测试模式（不会实际提交）
npm run submit-urls:test

# 正常执行
npm run submit-urls
```

### GitHub Actions

将在后续任务中配置自动化工作流。

## API 配置指南

### Google Indexing API

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Indexing API
4. 创建服务账户并下载 JSON 密钥
5. 在 Google Search Console 中添加服务账户为所有者

### Bing Webmaster API

1. 访问 [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. 验证网站所有权
3. 获取 API 密钥
4. 配置 API 访问权限

## 故障排除

### 常见问题

1. **环境变量未设置**
   - 确保所有必需的环境变量都已正确设置

2. **API 配额耗尽**
   - 检查配置文件中的配额限制设置
   - 等待配额重置或联系 API 提供商

3. **网络连接问题**
   - 检查网络连接和防火墙设置
   - 验证 API 端点是否可访问

### 日志分析

脚本会输出详细的执行日志，包括：
- 执行时间和状态
- 检测到的新 URL 数量
- 提交结果统计
- 错误信息和重试记录

## 开发说明

### 添加新的搜索引擎

1. 在 `scripts/lib/` 目录下创建新的客户端类
2. 在 `SearchEngineSubmitter` 中集成新客户端
3. 更新配置文件和环境变量

### 自定义通知方式

1. 修改 `scripts/lib/` 中的通知逻辑
2. 添加新的通知渠道（如 Slack、Discord 等）
3. 更新配置文件以支持新的通知方式

## 许可证

本功能遵循项目的 MIT 许可证。