# Google Indexing API 设置指南

## 1. 创建Google Cloud项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击"选择项目" → "新建项目"
3. 项目名称：`shareking-seo-indexing`
4. 点击"创建"

## 2. 启用Indexing API

1. 在项目中搜索"Web Search Indexing API"
2. 点击"启用"
3. 等待API启用完成

## 3. 创建服务账号

1. 导航到"IAM和管理" → "服务账号"
2. 点击"创建服务账号"
3. 服务账号名称：`seo-indexing-service`
4. 描述：`用于自动提交sitemap和URL索引`
5. 点击"创建并继续"

## 4. 分配角色

1. 角色选择：`编辑者` 或 `所有者`
2. 点击"继续"
3. 点击"完成"

## 5. 创建密钥

1. 找到刚创建的服务账号
2. 点击"操作" → "管理密钥"
3. 点击"添加密钥" → "创建新密钥"
4. 选择"JSON"格式
5. 点击"创建"
6. 下载JSON密钥文件

## 6. 在Search Console中添加用户

1. 回到Google Search Console
2. 点击"设置" → "用户和权限"
3. 点击"添加用户"
4. 输入服务账号邮箱（从JSON文件中的client_email字段获取）
5. 权限选择："所有者"
6. 点击"添加"

## 7. 配置环境变量

将JSON密钥内容添加到环境变量中：

```bash
# 在.env.local文件中添加
GOOGLE_INDEXING_API_KEY={"type":"service_account","project_id":"your-project",...}
```

或者将JSON文件放在项目根目录，命名为 `google-service-account.json`