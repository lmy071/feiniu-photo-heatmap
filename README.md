# 📸 飞牛相册照片热力图

类似 GitHub 提交热力图的可视化工具，展示飞牛相册中每日照片数量分布。

## 功能特性

- 🎨 类似 GitHub 贡献热力图的视觉效果
- 📊 统计每日照片数量分布
- 🖱️ 悬停查看每日照片数量详情
- 🔄 自动缓存数据，减少 API 调用
- 🐳 支持 Docker 部署
- 📦 支持飞牛 NAS (fnOS) fpk 安装包

## 项目结构

```
feiniu-photo-heatmap/
├── src/                    # Vue 前端源码
│   ├── components/         # Vue 组件
│   ├── composables/        # Vue Composables
│   ├── types/              # TypeScript 类型定义
│   └── assets/             # 静态资源
├── server/                 # Node.js 后端服务
│   └── index.js            # Express 服务器
├── docker/                 # Docker 部署文件
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── manifest.json       # fnOS 应用描述
├── scripts/                # 构建脚本
│   ├── build-fpk.sh       # Linux/Mac 构建脚本
│   └── build-fpk.ps1       # Windows 构建脚本
└── package.json
```

## 快速开始

### 方式一：Docker 部署

1. 克隆项目并进入目录：
```bash
git clone https://github.com/your-repo/feiniu-photo-heatmap.git
cd feiniu-photo-heatmap
```

2. 配置环境变量：
```bash
cp server/.env.example server/.env
# 编辑 .env 文件，填入你的飞牛 NAS 配置
```

3. 启动服务：
```bash
docker-compose -f docker/docker-compose.yml up -d
```

4. 访问 http://localhost:3000

### 方式二：本地开发

1. 安装前端依赖：
```bash
npm install
```

2. 安装后端依赖：
```bash
cd server
npm install
cd ..
```

3. 配置后端环境变量：
```bash
cp server/.env.example server/.env
# 编辑 .env 文件
```

4. 启动后端服务：
```bash
npm run server
```

5. 启动前端开发服务器：
```bash
npm run dev
```

6. 访问 http://localhost:5173

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| FEINIU_URL | 飞牛 NAS 的 WebDAV 地址 | http://192.168.1.100:3000 |
| FEINIU_USERNAME | WebDAV 用户名 | admin |
| FEINIU_PASSWORD | WebDAV 密码 | (无) |
| ALBUM_PATH | 相册路径 | /photos |
| PORT | 服务端口 | 3000 |

### 飞牛 NAS WebDAV 配置

飞牛 NAS 的相册通常可以通过 WebDAV 访问：
- 地址格式：`http://<NAS_IP>:<端口>` 或 `https://<域名>`
- 默认 WebDAV 端口：3000
- 用户名密码与 NAS 登录凭据相同

## 构建 fpk 安装包

### 前置要求

- Docker 已安装并运行

### Windows

```powershell
.\scripts\build-fpk.ps1
```

### Linux / Mac

```bash
chmod +x scripts/build-fpk.sh
./scripts/build-fpk.sh
```

构建完成后，fpk 文件会生成在 `build/` 目录下。

### 安装 fpk

1. 将生成的 fpk 文件上传到飞牛 NAS
2. 登录 fnOS 管理界面
3. 进入「应用中心」→「导入应用」
4. 选择 fpk 文件
5. 填写配置信息（飞牛 NAS 地址、用户名、密码）
6. 点击安装

## API 接口

### 获取照片统计

```
GET /api/photos/stats
```

可选查询参数：
- `startDate`: 起始日期 (YYYY-MM-DD)
- `endDate`: 结束日期 (YYYY-MM-DD)

响应示例：
```json
{
  "totalPhotos": 1234,
  "totalDays": 365,
  "dailyStats": [
    { "date": "2024-01-01", "count": 5 },
    { "date": "2024-01-02", "count": 12 }
  ]
}
```

### 健康检查

```
GET /api/health
```

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Node.js + Express
- **WebDAV 客户端**: webdav
- **部署**: Docker

## 注意事项

1. 首次加载可能需要较长时间获取所有照片信息
2. 照片数据会缓存 30 分钟
3. 确保 WebDAV 访问权限正确配置

## License

MIT
