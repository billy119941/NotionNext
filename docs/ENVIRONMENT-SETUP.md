# 环境变量设置指南

本文档详细说明如何设置自动搜索引擎提交功能所需的环境变量。

## 概述

自动搜索引擎提交功能需要以下环境变量：

- **必需变量**：`GOOGLE_SERVICE_ACCOUNT_KEY`、`BING_API_KEY`
- **可选变量**：`NOTIFICATION_EMAIL`、`SMTP_CONFIG`

## 1. Google Service Account Key 设置

### 步骤 1：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 记录项目 ID

### 步骤 2：启用 Google Indexing API

1. 在 Google Cloud Console 中，转到 "APIs & Services" > "Library"
2. 搜索 "Indexing API"
3. 点击 "Enable" 启用 API

### 步骤 3：创建服务账户

1. 转到 "APIs & Services" > "Credentials"
2. 点击 "Create Credentials" > "Service Account"
3. 填写服务账户详情：
   - **Name**: `search-engine-submitter`
   - **Description**: `Service account for automatic search engine submission`
4. 点击 "Create and Continue"

### 步骤 4：分配权限

1. 在 "Grant this service account access to project" 部分
2. 选择角色：`Service Usage Consumer`
3. 点击 "Continue"

### 步骤 5：创建密钥

1. 点击创建的服务账户
2. 转到 "Keys" 标签
3. 点击 "Add Key" > "Create new key"
4. 选择 "JSON" 格式
5. 下载密钥文件

### 步骤 6：在 Google Search Console 中添加服务账户

1. 访问 [Google Search Console](https://search.google.com/search-console/)
2. 选择你的网站属性
3. 转到 "Settings" > "Users and permissions"
4. 点击 "Add user"
5. 输入服务账户的邮箱地址（在 JSON 密钥文件中的 `client_email` 字段）
6. 选择权限：`Owner` 或 `Full`
7. 点击 "Add"

### 步骤 7：设置环境变量

将下载的 JSON 密钥文件内容设置为环境变量：

**GitHub Secrets 设置：**
1. 在 GitHub 仓库中，转到 "Settings" > "Secrets and variables" > "Actions"
2. 点击 "New repository secret"
3. Name: `GOOGLE_SERVICE_ACCOUNT_KEY`
4. Value: 粘贴整个 JSON 文件内容

**本地开发设置：**
```bash
# 方法 1：直接设置（不推荐，仅用于测试）
export GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'

# 方法 2：从文件读取（推荐）
export GOOGLE_SERVICE_ACCOUNT_KEY=$(cat path/to/your/service-account-key.json)
```

**JSON 密钥文件示例：**
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "search-engine-submitter@your-project.iam.gserviceaccount.com",
  "client_id": "client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/search-engine-submitter%40your-project.iam.gserviceaccount.com"
}
```

## 2. Bing API Key 设置

Bing 使用 IndexNow 协议，无需预先注册，但需要生成 API 密钥。

### 方法 1：自动生成（推荐）

系统会自动生成一个随机的 API 密钥。只需设置任意字符串：

**GitHub Secrets 设置：**
1. Name: `BING_API_KEY`
2. Value: 任意 32 位十六进制字符串，例如：`a1b2c3d4e5f6789012345678901234567890abcd`

**本地开发设置：**
```bash
export BING_API_KEY="a1b2c3d4e5f6789012345678901234567890abcd"
```

### 方法 2：使用在线生成器

1. 访问 [UUID Generator](https://www.uuidgenerator.net/) 或类似工具
2. 生成一个 UUID 并移除连字符
3. 使用生成的字符串作为 API 密钥

### 验证 IndexNow 密钥

系统会自动在你的网站根目录创建密钥验证文件：
- 文件路径：`https://your-website.com/{api-key}.txt`
- 文件内容：API 密钥本身

## 3. 可选环境变量设置

### 通知邮箱 (NOTIFICATION_EMAIL)

用于接收提交结果通知：

```bash
export NOTIFICATION_EMAIL="admin@your-website.com"
```

### SMTP 配置 (SMTP_CONFIG)

用于发送邮件通知的 SMTP 服务器配置：

```bash
export SMTP_CONFIG='{"host":"smtp.gmail.com","port":587,"secure":false,"auth":{"user":"your-email@gmail.com","pass":"your-app-password"}}'
```

**Gmail 配置示例：**
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

**注意：** 如果使用 Gmail，需要启用"两步验证"并生成"应用专用密码"。

## 4. 环境变量验证

### 使用验证脚本

```bash
npm run validate-github-env
```

### 手动验证

**验证 Google 服务账户密钥：**
```bash
# 检查环境变量是否设置
echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq .

# 验证 JSON 格式
echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq '.client_email'
```

**验证 Bing API 密钥：**
```bash
# 检查环境变量是否设置
echo $BING_API_KEY

# 验证长度（应该是 32-64 个字符）
echo $BING_API_KEY | wc -c
```

## 5. 不同环境的设置方法

### GitHub Actions

在仓库的 Settings > Secrets and variables > Actions 中设置：

| Secret Name | Description |
|-------------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google 服务账户 JSON 密钥 |
| `BING_API_KEY` | Bing IndexNow API 密钥 |
| `NOTIFICATION_EMAIL` | 通知邮箱（可选） |
| `SMTP_CONFIG` | SMTP 配置（可选） |

### 本地开发

创建 `.env` 文件（不要提交到 Git）：

```bash
# .env
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
BING_API_KEY=a1b2c3d4e5f6789012345678901234567890abcd
NOTIFICATION_EMAIL=admin@your-website.com
SMTP_CONFIG={"host":"smtp.gmail.com",...}
```

然后在脚本中加载：
```bash
# 加载环境变量
source .env

# 或使用 dotenv
npm install dotenv
node -r dotenv/config scripts/submit-urls.js
```

### Docker 环境

```dockerfile
# Dockerfile
ENV GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
ENV BING_API_KEY='a1b2c3d4e5f6789012345678901234567890abcd'
```

或使用 docker-compose.yml：
```yaml
version: '3'
services:
  app:
    build: .
    environment:
      - GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
      - BING_API_KEY=a1b2c3d4e5f6789012345678901234567890abcd
```

## 6. 安全最佳实践

### 保护敏感信息

1. **永远不要**将密钥提交到 Git 仓库
2. 使用 `.gitignore` 忽略包含密钥的文件
3. 定期轮换 API 密钥
4. 使用最小权限原则

### .gitignore 配置

```gitignore
# 环境变量文件
.env
.env.local
.env.*.local

# Google 服务账户密钥
*service-account*.json
*credentials*.json

# 缓存和日志文件
.cache/
*.log
```

### 密钥轮换

**Google 服务账户密钥：**
1. 在 Google Cloud Console 中创建新密钥
2. 更新环境变量
3. 删除旧密钥

**Bing API 密钥：**
1. 生成新的随机字符串
2. 更新环境变量
3. 系统会自动更新验证文件

## 7. 故障排除

### 常见错误及解决方案

**错误：** `缺少 GOOGLE_SERVICE_ACCOUNT_KEY 环境变量`
- **解决：** 确保环境变量已正确设置

**错误：** `GOOGLE_SERVICE_ACCOUNT_KEY 格式无效，必须是有效的 JSON`
- **解决：** 检查 JSON 格式，确保没有换行符或特殊字符问题

**错误：** `Permission denied. Failed to verify the URL ownership.`
- **解决：** 在 Google Search Console 中添加服务账户为用户

**错误：** `缺少 BING_API_KEY 环境变量`
- **解决：** 设置 Bing API 密钥环境变量

### 调试技巧

1. **启用调试日志：**
   ```bash
   export DEBUG=true
   npm run submit-urls:test
   ```

2. **检查 API 连接：**
   ```bash
   node scripts/diagnose-apis.js
   ```

3. **验证配置：**
   ```bash
   npm run validate-github-env
   ```