# 飞牛相册热力图

展示飞牛 NAS 每日照片数量的 GitHub 风格热力图应用。

## 架构

```
浏览器 → Node.js 后端 (/api/photos) → 飞牛 NAS 相册 API
                ↓ (API 不可用时)
           演示数据降级
```

- **后端**: Express + Axios，代理飞牛 NAS API 请求（解决 CORS / 认证问题）
- **前端**: 单页 HTML，ES Module 加载 CalHeatmap 4.0
- **部署**: Docker (node:18-alpine)，飞牛 NAS 应用中心 FPK 安装

## 目录结构

```
feiniu-photo-heatmap/
├── app/
│   ├── docker/
│   │   ├── app/
│   │   │   ├── server.js          # Node.js 后端（Express + API 代理）
│   │   │   └── package.json       # 后端依赖
│   │   ├── www/
│   │   │   ├── index.html         # 前端页面
│   │   │   └── images/            # 图标资源
│   │   └── docker-compose.yaml    # Docker 编排
│   └── ui/
│       ├── config                 # 飞牛 UI 配置
│       └── images/                # UI 图标
├── cmd/                           # 飞牛应用生命周期脚本
│   ├── main                       # 启动/停止/状态检查
│   ├── install_init
│   ├── install_callback
│   ├── uninstall_init
│   ├── uninstall_callback
│   ├── upgrade_init
│   ├── upgrade_callback
│   ├── config_init
│   └── config_callback
├── config/
│   ├── privilege                  # 权限配置
│   └── resource                   # 资源配置
├── wizard/                        # 安装向导
├── manifest                       # 飞牛应用清单
├── ICON.PNG                       # 应用图标 64x64
├── ICON_256.PNG                   # 应用图标 256x256
├── build-fpk.ps1                  # FPK 构建脚本
└── README.md
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

## 功能特性

- 📊 GitHub 风格热力图，展示每日照片数量
- 📅 支持按年/全部/近一年筛选
- 🔄 演示数据自动降级（API 不可用时）
- 🐳 Docker 容器化部署
- 🔒 后端代理认证（自动转发 Cookie）

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Node.js 18 + Express + Axios |
| 前端 | 原生 HTML/JS + CalHeatmap 4.0 (CDN) |
| 部署 | Docker (node:18-alpine) |
| 打包 | FPK (飞牛应用包格式) |

## License

MIT
