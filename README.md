# 飞牛相册热力图

展示飞牛 NAS 每日照片数量的 GitHub 风格热力图应用。

## 架构

```
浏览器 → Vue 3 SPA → /api/photos → Node.js 后端 → 飞牛 NAS 相册 API
                                              ↓ (API 不可用时)
                                         演示数据降级
```

- **前端**: Vue 3 + TypeScript + Vite，CalHeatmap 4.0 渲染热力图
- **后端**: Express + Axios，代理飞牛 NAS API 请求（解决 CORS / 认证问题）
- **部署**: Docker (node:18-alpine)，飞牛 NAS 应用中心 FPK 安装

## 目录结构

```
feiniu-photo-heatmap/
├── app/
│   ├── docker/
│   │   ├── app/
│   │   │   ├── server.js          # Node.js 后端（Express + API 代理）
│   │   │   └── package.json       # 后端依赖
│   │   ├── www/                   # Vue 3 + TypeScript 前端项目
│   │   │   ├── src/
│   │   │   │   ├── api/           # API 调用层
│   │   │   │   ├── components/    # Vue 组件
│   │   │   │   ├── composables/   # 组合式函数
│   │   │   │   ├── types/         # TypeScript 类型定义
│   │   │   │   ├── App.vue        # 根组件
│   │   │   │   └── main.ts        # 入口
│   │   │   ├── index.html         # HTML 模板
│   │   │   ├── vite.config.ts     # Vite 配置
│   │   │   ├── tsconfig.json      # TypeScript 配置
│   │   │   └── package.json       # 前端依赖
│   │   └── docker-compose.yaml    # Docker 编排
│   └── ui/
│       ├── config                 # 飞牛 UI 配置
│       └── images/                # UI 图标
├── cmd/                           # 飞牛应用生命周期脚本
├── config/                        # 权限和资源配置
├── wizard/                        # 安装向导
├── manifest                       # 飞牛应用清单
├── ICON.PNG / ICON_256.PNG        # 应用图标
├── build-fpk.ps1                  # FPK 构建脚本
└── README.md
```

## 前端开发

```bash
cd app/docker/www

# 安装依赖
npm install

# 开发模式（热更新，自动代理 /api 到后端）
npm run dev

# 生产构建
npm run build
```

## 构建 & 安装

### 构建 FPK

```powershell
.\build-fpk.ps1
```

### 安装到飞牛 NAS

1. 打开飞牛 NAS 网页界面
2. 进入 **应用中心 → 手动安装**
3. 上传生成的 `.fpk` 文件
4. 安装后访问 `http://NAS-IP:8088`

## Docker 启动流程

容器启动时自动执行：
1. 安装前端依赖 + 构建 Vue 项目 → `www/dist/`
2. 安装后端依赖 + 启动 Express 服务
3. 后端服务静态文件 `www/dist/` 并代理 `/api/*` 请求

## 功能特性

- 📊 GitHub 风格热力图，展示每日照片数量
- 📅 支持按年/全部/近一年筛选
- 🔄 演示数据自动降级（API 不可用时）
- 🐳 Docker 容器化部署
- 🔒 后端代理认证（自动转发 Cookie）
- 💡 Vue 3 + TypeScript + Vite 现代前端架构

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端框架 | Vue 3.5 + TypeScript 5.7 |
| 构建工具 | Vite 6 |
| 热力图 | CalHeatmap 4.2 |
| 后端 | Node.js 18 + Express + Axios |
| 部署 | Docker (node:18-alpine) |
| 打包 | FPK (飞牛应用包格式) |

## License

MIT
