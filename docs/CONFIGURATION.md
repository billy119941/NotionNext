# 自动搜索引擎提交配置说明

本文档详细说明了自动搜索引擎提交功能的所有配置参数。

## 配置文件位置

配置文件位于：`config/search-engine-submission.json`

如果配置文件不存在，可以复制示例配置文件：
```bash
cp config/search-engine-submission.example.json config/search-engine-submission.json
```

## 配置参数详解

### 1. Sitemap 配置 (`sitemap`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `url` | string | 必填 | 网站的 sitemap.xml 文件 URL |
| `checkInterval` | number | 2 | 检查间隔（小时），GitHub Actions 定时任务的执行频率 |
| `cacheFile` | string | `.cache/sitemap-cache.json` | sitemap 缓存文件路径 |

**示例：**
```json
{
  "sitemap": {
    "url": "https://your-website.com/sitemap.xml",
    "checkInterval": 2,
    "cacheFile": ".cache/sitemap-cache.json"
  }
}
```

### 2. Google 配置 (`google`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `indexingApiUrl` | string | Google API URL | Google Indexing API 的端点 URL |
| `quotaLimit` | number | 200 | Google API 每日配额限制 |
| `scopes` | array | 权限范围 | Google API 所需的权限范围 |

**示例：**
```json
{
  "google": {
    "indexingApiUrl": "https://indexing.googleapis.com/v3/urlNotifications:publish",
    "quotaLimit": 200,
    "scopes": ["https://www.googleapis.com/auth/indexing"]
  }
}
```

**注意事项：**
- 需要在 Google Search Console 中验证网站所有权
- 需要启用 Google Indexing API
- 需要创建服务账户并下载密钥文件

### 3. Bing 配置 (`bing`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `webmasterApiUrl` | string | IndexNow API URL | Bing IndexNow API 的端点 URL |
| `quotaLimit` | number | 10000 | Bing API 每日配额限制 |

**示例：**
```json
{
  "bing": {
    "webmasterApiUrl": "https://api.indexnow.org/indexnow",
    "quotaLimit": 10000
  }
}
```

**注意事项：**
- 使用 IndexNow 协议，无需在 Bing Webmaster Tools 中预先配置
- API 密钥通过环境变量 `BING_API_KEY` 提供

### 4. 通知配置 (`notification`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enableEmail` | boolean | true | 是否启用邮件通知 |
| `emailTemplate.success` | string | 成功模板 | 成功通知的邮件主题模板 |
| `emailTemplate.failure` | string | 失败模板 | 失败通知的邮件主题模板 |

**示例：**
```json
{
  "notification": {
    "enableEmail": true,
    "emailTemplate": {
      "success": "搜索引擎提交成功",
      "failure": "搜索引擎提交失败"
    }
  }
}
```

### 5. 重试配置 (`retry`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxAttempts` | number | 3 | 最大重试次数 |
| `backoffMultiplier` | number | 2 | 退避倍数（指数退避） |
| `initialDelay` | number | 1000 | 初始延迟时间（毫秒） |

**示例：**
```json
{
  "retry": {
    "maxAttempts": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000
  }
}
```

**重试策略说明：**
- 第1次重试：延迟 1000ms
- 第2次重试：延迟 2000ms
- 第3次重试：延迟 4000ms

### 6. 日志配置 (`logging`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `level` | string | "info" | 日志级别：debug, info, warn, error |
| `enableConsole` | boolean | true | 是否启用控制台输出 |
| `enableFile` | boolean | false | 是否启用文件日志 |

**示例：**
```json
{
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": false
  }
}
```

### 7. 缓存配置 (`cache`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `directory` | string | ".cache" | 缓存目录路径 |
| `sitemapCacheFile` | string | "sitemap-cache.json" | sitemap 缓存文件名 |
| `submissionLogFile` | string | "submission-log.json" | 提交日志文件名 |

**示例：**
```json
{
  "cache": {
    "directory": ".cache",
    "sitemapCacheFile": "sitemap-cache.json",
    "submissionLogFile": "submission-log.json"
  }
}
```

## 环境变量配置

除了配置文件，还需要设置以下环境变量：

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google 服务账户密钥（JSON 格式） | `{"type":"service_account",...}` |
| `BING_API_KEY` | Bing IndexNow API 密钥 | `abc123def456...` |

### 可选的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NOTIFICATION_EMAIL` | 通知邮箱地址 | `admin@your-website.com` |
| `SMTP_CONFIG` | SMTP 配置（JSON 格式） | `{"host":"smtp.gmail.com",...}` |

## 配置验证

可以使用以下命令验证配置：

```bash
# 验证环境变量
npm run validate-github-env

# 测试配置（不实际提交）
npm run submit-urls:test
```

## 常见配置问题

### 1. Google API 权限错误

**错误信息：** `Permission denied. Failed to verify the URL ownership.`

**解决方案：**
1. 在 Google Search Console 中验证网站所有权
2. 确保服务账户有正确的权限
3. 检查 `GOOGLE_SERVICE_ACCOUNT_KEY` 环境变量格式

### 2. Sitemap 无法访问

**错误信息：** `获取 sitemap 失败: HTTP 404`

**解决方案：**
1. 确认 sitemap URL 正确且可访问
2. 检查网站的 robots.txt 文件
3. 验证 sitemap 格式是否正确

### 3. 配额超限

**错误信息：** `Rate limit exceeded`

**解决方案：**
1. 调整 `quotaLimit` 配置
2. 减少提交频率
3. 检查 API 使用情况

## 高级配置

### 自定义提交策略

可以通过修改配置来实现不同的提交策略：

```json
{
  "sitemap": {
    "checkInterval": 1,  // 每小时检查一次
    "url": "https://your-website.com/sitemap.xml"
  },
  "retry": {
    "maxAttempts": 5,    // 增加重试次数
    "initialDelay": 500  // 减少初始延迟
  }
}
```

### 多环境配置

可以为不同环境创建不同的配置文件：

- `config/search-engine-submission.development.json`
- `config/search-engine-submission.production.json`

然后通过环境变量 `NODE_ENV` 来选择配置文件。