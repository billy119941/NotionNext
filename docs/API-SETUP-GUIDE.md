# Google 和 Bing API 配置指南

本文档详细说明如何配置 Google Indexing API 和 Bing IndexNow API。

## Google Indexing API 配置

### 概述

Google Indexing API 允许网站所有者直接通知 Google 关于页面的添加、更新或删除，从而加快索引速度。

### 前置条件

- Google 账户
- 已验证的网站（在 Google Search Console 中）
- Google Cloud 项目

### 详细配置步骤

#### 步骤 1：设置 Google Search Console

1. **访问 Google Search Console**
   - 前往 [Google Search Console](https://search.google.com/search-console/)
   - 使用 Google 账户登录

2. **添加网站属性**
   - 点击 "添加属性"
   - 选择 "URL 前缀" 方式
   - 输入完整的网站 URL（如：`https://your-website.com`）

3. **验证网站所有权**
   
   **方法 1：HTML 文件验证（推荐）**
   - 下载验证文件
   - 上传到网站根目录
   - 点击 "验证"

   **方法 2：HTML 标签验证**
   - 复制提供的 meta 标签
   - 添加到网站首页的 `<head>` 部分
   - 点击 "验证"

   **方法 3：DNS 验证**
   - 添加 TXT 记录到域名 DNS 设置
   - 等待 DNS 传播
   - 点击 "验证"

#### 步骤 2：创建 Google Cloud 项目

1. **访问 Google Cloud Console**
   - 前往 [Google Cloud Console](https://console.cloud.google.com/)
   - 使用同一个 Google 账户登录

2. **创建新项目**
   - 点击项目选择器
   - 点击 "新建项目"
   - 输入项目名称（如：`search-engine-submission`）
   - 选择组织（如果适用）
   - 点击 "创建"

3. **记录项目信息**
   - 项目 ID（自动生成，不可更改）
   - 项目名称
   - 项目编号

#### 步骤 3：启用 Indexing API

1. **导航到 API 库**
   - 在 Google Cloud Console 中
   - 转到 "APIs & Services" > "Library"

2. **搜索并启用 API**
   - 搜索 "Indexing API"
   - 点击 "Google Indexing API"
   - 点击 "启用" 按钮

3. **等待启用完成**
   - 通常需要几分钟时间
   - 启用后会显示 API 概览页面

#### 步骤 4：创建服务账户

1. **导航到凭据页面**
   - 转到 "APIs & Services" > "Credentials"

2. **创建服务账户**
   - 点击 "创建凭据" > "服务账户"
   - 填写服务账户详情：
     - **服务账户名称**：`search-engine-submitter`
     - **服务账户 ID**：`search-engine-submitter`（自动生成）
     - **描述**：`Service account for automatic search engine submission`
   - 点击 "创建并继续"

3. **分配角色（可选）**
   - 在 "向此服务账户授予对项目的访问权限" 部分
   - 选择角色：`Service Usage Consumer`
   - 点击 "继续"

4. **授予用户访问权限（可选）**
   - 可以跳过此步骤
   - 点击 "完成"

#### 步骤 5：创建服务账户密钥

1. **选择服务账户**
   - 在凭据页面，点击刚创建的服务账户

2. **创建密钥**
   - 转到 "密钥" 标签
   - 点击 "添加密钥" > "创建新密钥"
   - 选择密钥类型：**JSON**
   - 点击 "创建"

3. **下载密钥文件**
   - 密钥文件会自动下载
   - 文件名类似：`project-name-123456-abcdef123456.json`
   - **重要**：安全保存此文件，不要泄露

4. **密钥文件内容示例**
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "key-id",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "search-engine-submitter@your-project.iam.gserviceaccount.com",
     "client_id": "123456789012345678901",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/search-engine-submitter%40your-project.iam.gserviceaccount.com"
   }
   ```

#### 步骤 6：将服务账户添加到 Search Console

1. **获取服务账户邮箱**
   - 从 JSON 密钥文件中复制 `client_email` 字段的值
   - 格式类似：`search-engine-submitter@your-project.iam.gserviceaccount.com`

2. **添加用户到 Search Console**
   - 返回 Google Search Console
   - 选择你的网站属性
   - 转到 "设置" > "用户和权限"
   - 点击 "添加用户"

3. **配置用户权限**
   - **电子邮件地址**：粘贴服务账户邮箱
   - **权限**：选择 "所有者" 或 "完全"
   - 点击 "添加"

4. **验证添加成功**
   - 服务账户应该出现在用户列表中
   - 状态应该显示为 "已验证"

#### 步骤 7：测试 API 连接

1. **设置环境变量**
   ```bash
   export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

2. **运行测试脚本**
   ```bash
   npm run submit-urls:test
   ```

3. **检查测试结果**
   - 应该看到 "Google Indexing API 客户端初始化成功"
   - 如果有错误，检查前面的配置步骤

### 常见问题

#### 权限错误

**错误信息：** `Permission denied. Failed to verify the URL ownership.`

**解决方案：**
1. 确认网站在 Search Console 中已验证
2. 检查服务账户是否已添加为用户
3. 确认服务账户权限为 "所有者"

#### API 未启用

**错误信息：** `Google Indexing API has not been used in project`

**解决方案：**
1. 在 Google Cloud Console 中启用 Indexing API
2. 等待几分钟让更改生效
3. 重新测试

#### 配额限制

**错误信息：** `Quota exceeded`

**解决方案：**
1. 检查 API 配额使用情况
2. 等待配额重置（每日重置）
3. 考虑申请更高配额

## Bing IndexNow API 配置

### 概述

IndexNow 是一个开放协议，允许网站所有者立即通知搜索引擎关于网站内容的更改。Bing、Yandex 等搜索引擎都支持此协议。

### 配置步骤

#### 步骤 1：生成 API 密钥

IndexNow 不需要预先注册，只需要一个 API 密钥。

**方法 1：使用在线生成器**
1. 访问 [UUID Generator](https://www.uuidgenerator.net/)
2. 生成一个 UUID
3. 移除连字符，得到32位十六进制字符串
4. 示例：`a1b2c3d4e5f6789012345678901234567890abcd`

**方法 2：使用命令行**
```bash
# Linux/Mac
openssl rand -hex 32

# 或使用 uuidgen
uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]'
```

**方法 3：使用 Node.js**
```javascript
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log(apiKey);
```

#### 步骤 2：设置环境变量

```bash
export BING_API_KEY="your-generated-api-key"
```

#### 步骤 3：创建密钥验证文件

IndexNow 要求在网站根目录创建一个验证文件来证明你拥有该网站。

**文件位置：** `https://your-website.com/{api-key}.txt`
**文件内容：** API 密钥本身

**示例：**
- API 密钥：`a1b2c3d4e5f6789012345678901234567890abcd`
- 文件 URL：`https://your-website.com/a1b2c3d4e5f6789012345678901234567890abcd.txt`
- 文件内容：`a1b2c3d4e5f6789012345678901234567890abcd`

**自动创建验证文件：**
系统会自动处理验证文件的创建，你只需要确保：
1. 网站服务器支持静态文件访问
2. 根目录可写（如果需要自动创建文件）

#### 步骤 4：测试 API 连接

1. **运行测试脚本**
   ```bash
   npm run submit-urls:test
   ```

2. **检查测试结果**
   - 应该看到 "Bing IndexNow API 客户端初始化成功"
   - 检查验证文件是否可访问

3. **手动验证**
   ```bash
   # 检查验证文件
   curl https://your-website.com/{api-key}.txt
   
   # 应该返回 API 密钥
   ```

### IndexNow 协议详解

#### 支持的搜索引擎

- **Bing**：Microsoft 的搜索引擎
- **Yandex**：俄罗斯的搜索引擎
- **Seznam**：捷克的搜索引擎
- **Naver**：韩国的搜索引擎

#### API 端点

- **主端点**：`https://api.indexnow.org/indexnow`
- **Bing 端点**：`https://www.bing.com/indexnow`
- **Yandex 端点**：`https://yandex.com/indexnow`

#### 请求格式

```json
{
  "host": "your-website.com",
  "key": "your-api-key",
  "keyLocation": "https://your-website.com/your-api-key.txt",
  "urlList": [
    "https://your-website.com/page1",
    "https://your-website.com/page2"
  ]
}
```

#### 响应代码

- **200 OK**：请求成功处理
- **202 Accepted**：请求已接受，正在处理
- **400 Bad Request**：请求格式错误
- **403 Forbidden**：密钥验证失败
- **422 Unprocessable Entity**：URL 格式错误
- **429 Too Many Requests**：请求过于频繁

### 最佳实践

#### API 密钥管理

1. **生成强密钥**
   - 使用至少32位的随机十六进制字符串
   - 避免使用可预测的模式

2. **安全存储**
   - 不要将密钥硬编码在代码中
   - 使用环境变量或安全的配置管理

3. **定期轮换**
   - 定期更换 API 密钥
   - 更新验证文件

#### 提交策略

1. **批量提交**
   - 一次请求最多提交10,000个 URL
   - 合并多个 URL 到单个请求中

2. **避免重复提交**
   - 不要重复提交相同的 URL
   - 使用缓存记录已提交的 URL

3. **错误处理**
   - 实现适当的重试机制
   - 记录和分析失败的请求

#### 监控和维护

1. **监控提交状态**
   - 跟踪成功和失败的请求
   - 分析错误模式

2. **验证文件维护**
   - 确保验证文件始终可访问
   - 定期检查文件内容

3. **配额管理**
   - 虽然 IndexNow 没有严格的配额限制
   - 但要避免过于频繁的请求

## API 配额和限制

### Google Indexing API

| 限制类型 | 限制值 | 说明 |
|----------|--------|------|
| 每日配额 | 200 次 | 每个项目每天的请求次数 |
| 每分钟配额 | 600 次 | 每分钟最大请求次数 |
| 批量大小 | 100 个 URL | 单次请求最多 URL 数量 |

### Bing IndexNow API

| 限制类型 | 限制值 | 说明 |
|----------|--------|------|
| 每日配额 | 10,000 次 | 建议的每日请求次数 |
| 批量大小 | 10,000 个 URL | 单次请求最多 URL 数量 |
| 请求频率 | 无严格限制 | 但建议合理控制频率 |

## 故障排除

### Google API 常见问题

1. **服务账户权限问题**
   - 检查 Search Console 用户权限
   - 确认服务账户邮箱正确

2. **API 配额问题**
   - 监控每日使用量
   - 优化提交策略

3. **网络连接问题**
   - 检查防火墙设置
   - 验证 DNS 解析

### Bing API 常见问题

1. **密钥验证失败**
   - 检查验证文件是否可访问
   - 确认文件内容与 API 密钥一致

2. **URL 格式错误**
   - 确保 URL 格式正确
   - 检查 URL 编码

3. **主机名不匹配**
   - 确认请求中的 host 字段与实际域名一致
   - 检查子域名配置

## 安全考虑

### 密钥保护

1. **不要公开密钥**
   - 永远不要将 API 密钥提交到公共代码仓库
   - 使用环境变量或安全的配置管理

2. **访问控制**
   - 限制对密钥文件的访问
   - 使用最小权限原则

3. **监控使用**
   - 定期检查 API 使用情况
   - 监控异常活动

### 网络安全

1. **HTTPS 通信**
   - 始终使用 HTTPS 进行 API 调用
   - 验证 SSL 证书

2. **请求验证**
   - 验证请求来源
   - 实施适当的身份验证

3. **错误处理**
   - 不要在错误信息中泄露敏感信息
   - 记录安全相关的错误