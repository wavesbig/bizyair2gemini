# BizyAir Proxy (Gemini / OpenAI Compatible)

一个基于 Next.js + Prisma 的 BizyAir 代理服务，提供：

- 管理后台（应用管理、字段映射、测试页、设置页）
- 对外代理 API（`/api/v1`、`/api/v1beta`）
- 字段映射与节点绑定（将外部请求转换为 BizyAir `input_values`）
- Docker 一键部署与镜像发布脚本

---

## 1. 核心能力

- 支持 OpenAI 风格接口：`/api/v1/chat/completions`
- 支持 Gemini 风格接口：`/api/v1beta/models/:model/generateContent`
- 支持模型列表接口：`/api/v1/models`
- 应用级映射配置：`sourcePath -> BizyAir 字段 key`
- 支持从 BizyAir 配置片段导入并提取真实字段前缀（节点绑定）
- 后台统一管理 `Proxy API Key`、管理员密码、应用启停状态

---

## 2. 技术栈

- Next.js 16 (App Router)
- React 19
- Prisma 5 + SQLite
- shadcn/base UI
- Docker + Docker Compose

---

## 3. 目录说明

关键目录：

- `src/app`：页面与 API 路由
- `src/components`：界面组件（包含应用管理与布局）
- `src/lib`：通用逻辑（鉴权、Prisma、文档构建、节点绑定等）
- `prisma`：schema、迁移、seed
- `docker`：容器入口脚本
- `scripts`：发布相关脚本

---

## 4. 本地开发

### 4.1 安装依赖

```bash
npm install
```

### 4.2 初始化数据库

```bash
npm run db:init
```

### 4.3 启动开发环境

```bash
npm run dev
```

默认访问：

- 后台：`http://localhost:3000`

---

## 5. 环境变量

请基于 `.env.example` 创建 `.env`：

```bash
cp .env.example .env
```

主要变量：

- `IMAGE_NAME`：Docker Compose 拉取镜像名
- `APP_PORT`：容器映射端口
- `DATA_DIR`：SQLite 数据持久化目录
- `ADMIN_PASSWORD`：后台登录密码
- `PROXY_API_KEY`：对外代理接口密钥（`Authorization: Bearer ...`）
- `LOG_LEVEL`：日志级别

---

## 6. Docker 部署

### 6.1 快速启动

```bash
cp .env.example .env
docker compose up -d
```

服务会在首次启动时自动执行：

- `prisma migrate deploy`
- `prisma db seed`

数据落在挂载目录（默认 `./data`）。

### 6.2 健康检查

健康检查接口：

- `GET /api/health`

Compose 和镜像均已内置健康检查策略。

---

## 7. 对外 API 用法

### 7.1 查询可用模型

```bash
curl -X GET "https://your-domain.com/api/v1/models" \
  -H "Authorization: Bearer YOUR_PROXY_API_KEY"
```

### 7.2 Gemini 风格请求

```bash
curl -X POST "https://your-domain.com/api/v1beta/models/your-model-name/generateContent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \
  -d '{
    "contents": [
      {
        "parts": [
          { "text": "一只站在霓虹雨夜街头的橘猫，电影感，细节丰富" }
        ]
      }
    ],
    "generationConfig": {
      "imageConfig": { "aspectRatio": "1:1", "imageSize": "1024" },
      "seed": 12345,
      "temperature": 0.8,
      "topP": 0.95
    }
  }'
```

### 7.3 OpenAI 风格请求

```bash
curl -X POST "https://your-domain.com/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \
  -d '{
    "model": "your-model-name",
    "messages": [
      { "role": "user", "content": "请生成一张图片：美丽的日落" }
    ],
    "temperature": 0.8
  }'
```

---

## 8. 映射与节点绑定机制

应用配置里有两块关键数据：

- `mappings`：字段映射规则（JSON 字符串）
- `nodeIds`：节点与字段绑定信息（JSON 字符串）

当前支持两类占位符：

- 旧占位符（兼容）：`{PromptNode}`、`{LoadImage_1}`、`{TTSNode}`
- 新占位符（推荐）：`{PromptField:prompt}`、`{LoadImageField:1}`、`{TTSField:text}`

运行时会先替换占位符，再把请求体字段映射到 BizyAir 的 `input_values`。

---

## 9. 镜像发布

### 9.1 首次配置（每台设备一次）

复制 `.docker-publish.example.json` 为 `.docker-publish.json` 并填写：

```json
{
  "dockerUser": "your-dockerhub-user",
  "imageName": "bizyair2gemini"
}
```

### 9.2 Windows

```powershell
.\upload-docker.ps1 -AlsoLatest
```

### 9.3 macOS / Linux

```bash
chmod +x ./upload-docker.sh
./upload-docker.sh --also-latest
```

发布脚本特性：

- 自动递增补丁版本号（`x.y.z`）
- 发布成功后才写回 `package.json` 版本
- 预检 Docker / 登录状态 / Git 工作区
- 支持 `latest` 标签同步推送

常用参数：

- Windows: `-Version 0.1.0`, `-NoLogin`, `-AllowDirty`
- macOS/Linux: `--version 0.1.0`, `--no-login`, `--allow-dirty`

---

## 10. 安全建议

- 不要提交数据库文件：`dev.db`、`prisma/dev.db`
- 不要将真实 `PROXY_API_KEY` 写入公开仓库
- 若疑似泄露，请立即轮换：
  - BizyAir 上游 `apiKey`
  - 本服务 `PROXY_API_KEY`
  - 管理员密码

---

## 11. 常见问题

### 11.1 容器显示 `unhealthy`

优先检查：

1. `/api/health` 能否访问
2. `DATABASE_URL` 与数据目录挂载是否正确
3. 容器日志里是否有 Prisma 初始化错误

### 11.2 登录或代理请求 401

分别检查：

- 后台登录：`ADMIN_PASSWORD`
- 对外代理：请求头 `Authorization: Bearer YOUR_PROXY_API_KEY`

---

## 12. License

如需开源协议，请在仓库补充 `LICENSE` 文件并在此处声明。
