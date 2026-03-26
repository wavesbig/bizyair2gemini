# BizyAir to Gemini Proxy Service Design

## Project Overview

- **Project Name**: BizyAir2Gemini Proxy
- **Type**: API Proxy Service + Web Management UI
- **Core Functionality**: 将 Gemini API 请求转换为 BizyAir 格式，支持多应用管理、模板配置、请求测试
- **Target Users**: 需要使用 BizyAir AI 服务并希望以 Gemini 格式调用的开发者

## Technology Stack

| Component | Technology |
|-----------|------------|
| Web Framework | Next.js 14 (App Router) |
| UI Library | shadcn/ui |
| UI Style | Glassmorphism + Flat Design (Pro Max) |
| Database | SQLite |
| ORM | Prisma |
| Deployment | Docker |

## UI/UX Specification

### Design Style: Glassmorphism + Flat Design

- **Background**: 深色渐变背景 + 毛玻璃效果卡片
- **Cards**: 半透明背景 (backdrop-filter: blur)，圆角 16px，细边框
- **Buttons**: 扁平化设计，悬停时有微妙阴影和缩放效果
- **Colors**:
  - 主色: #6366f1 (Indigo)
  - 辅助色: #8b5cf6 (Violet)
  - 背景: #0f172a 到 #1e1b4b 渐变
  - 文字: #f8fafc (主), #94a3b8 (次)
- **Typography**: Inter 字体，现代简洁

### Page Structure

1. **登录页** (`/login`)
   - 密码输入框
   - 登录按钮
   - Glassmorphism 风格的登录卡片

2. **仪表盘** (`/dashboard`)
   - 应用概览卡片
   - 快速操作按钮

3. **应用管理** (`/apps`)
   - 应用列表（卡片式展示）
   - 添加/编辑/删除应用
   - 应用详情：名称、描述、web_app_id、BizyAir API Key

4. **模板管理** (`/templates`)
   - 预设模板列表（TTS、图片生成等）
   - 模板详情：名称、描述、字段映射规则
   - 添加/编辑/删除映射

5. **测试页面** (`/test`)
   - 选择应用和模板
   - 输入参数表单
   - 发送请求并查看结果

6. **设置** (`/settings`)
   - 修改登录密码
   - 查看 API Key

## Data Model

### Application (应用)

```prisma
model Application {
  id          String   @id @default(cuid())
  name        String
  description String?
  webAppId    String   // BizyAir web_app_id
  apiKey      String   // BizyAir API Key (加密存储)
  modelName   String   // 对外暴露的 model 名称，如 "gpt-4-tts"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Template (模板)

```prisma
model Template {
  id            String   @id @default(cuid())
  name          String
  description   String?
  type          String   // "tts", "image", "video" 等
  mappings      Json     // 字段映射规则
  isPreset      Boolean  @default(false) // 是否为预设模板
  applicationId String?
  application   Application? @relation(fields: [applicationId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Settings (设置)

```prisma
model Settings {
  id        String   @id @default("default")
  password  String   // 管理员密码 (bcrypt 加密)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## API Endpoints

### Proxy Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | OpenAI 格式的 chat 接口 |
| `/v1/models` | GET | 列出可用模型 |

### Management API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | 登录验证 |
| `/api/auth/logout` | POST | 登出 |
| `/api/apps` | GET | 获取应用列表 |
| `/api/apps` | POST | 创建应用 |
| `/api/apps/[id]` | PUT | 更新应用 |
| `/api/apps/[id]` | DELETE | 删除应用 |
| `/api/templates` | GET | 获取模板列表 |
| `/api/templates` | POST | 创建模板 |
| `/api/templates/[id]` | PUT | 更新模板 |
| `/api/templates/[id]` | DELETE | 删除模板 |
| `/api/test` | POST | 测试请求 |
| `/api/settings` | GET | 获取设置 |
| `/api/settings/password` | PUT | 修改密码 |

## Field Mapping Logic

### 预设映射规则 (TTS 模板示例)

| OpenAI Field | BizyAir Field |
|---------------|----------------|
| messages[0].content | indexTTSGenerate.text |
| temperature | indexTTSGenerate.temperature |
| max_tokens | indexTTSGenerate.max_mel_tokens |
| seed | indexTTSGenerate.seed |
| - | indexTTSGenerate.do_sample |
| - | indexTTSGenerate.top_p |

### 请求转换流程

1. 接收 OpenAI 格式请求
2. 根据 `model` 字段查找对应 Application
3. 获取 Application 关联的 Template
4. 使用 Template 的 mappings 将 OpenAI 字段转换为 BizyAir 字段
5. 组装 BizyAir 请求体（包含 web_app_id、input_values 等）
6. 发送请求到 BizyAir API
7. 将响应转换回 OpenAI 格式并返回

## Security

- **Web UI 访问**: 需要密码登录（session-based auth）
- **API 认证**: 通过 `Authorization: Bearer <api-key>` 验证中转服务 API Key
- **密码存储**: bcrypt 加密
- **API Key 存储**: 加密存储（可选：使用 AES 加密）

## Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制 Prisma schema
COPY prisma ./prisma/
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 环境变量

| Variable | Default | Description |
|----------|---------|-------------|
| ADMIN_PASSWORD | admin123 | Web UI 登录密码 |
| DATABASE_URL | file:./dev.db | SQLite 数据库路径 |
| PROXY_API_KEY | - | 中转服务 API Key（必填） |
| ENCRYPTION_KEY | - | API Key 加密密钥（可选） |

## Acceptance Criteria

1. ✅ 可以通过 Docker 部署并启动服务
2. ✅ 访问 Web UI 需要输入密码
3. ✅ 可以添加、编辑、删除 BizyAir 应用
4. ✅ 可以创建自定义字段映射模板
5. ✅ 预设 TTS 和图片生成模板
6. ✅ 可以通过 UI 测试请求
7. ✅ 代理服务正确转换请求并返回 OpenAI 格式响应
8. ✅ UI 风格为 Glassmorphism + Flat Design
