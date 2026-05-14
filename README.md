# 📸 飞牛照片热力图

> 扫描飞牛 NAS 照片目录，生成 GitHub 风格的每日照片数量热力图。

![](https://img.shields.io/badge/Vue-3.4-4FC08D)
![](https://img.shields.io/badge/Node-20%2B-339933)
![](https://img.shields.io/badge/fnOS-%E2%89%A51.0.0-blue)

## 功能特性

- 🎨 **GitHub 风格热力图** — 直观展示每日照片数量分布
- 📅 **年份切换** — 支持浏览不同年份的照片统计
- 📊 **年度汇总** — 日均数量、单日最高、活跃天数一目了然
- 🖱️ **悬停详情** — 鼠标悬停查看每日具体照片数
- 📸 **实况照片支持** — 自动识别并合并 HEIC+MO V 实况照片对，不重复计数
- 💾 **增量持久缓存** — 仅扫描变更文件，重启不丢失
- 🔄 **后台扫描** — 不阻塞服务启动，实时进度查询
- 🐳 **Docker 部署** — 支持飞牛 NAS fpk 安装包

## 项目结构

```
feiniu-photo-heatmap/
├── src/                      # Vue 3 前端源码
│   ├── components/           # 组件（热力图、导航等）
│   ├── composables/          # API 调用封装
│   ├── types/                # TypeScript 类型定义
│   └── assets/               # 全局样式
├── server/                   # Node.js 后端服务
│   ├── index.js              # Express 服务器（文件扫描 + API）
│   ├── package.json
│   └── .env.example          # 环境变量模板
├── docker/                   # Docker / fpk 部署文件
│   ├── Dockerfile            # 多阶段构建
│   ├── docker-compose.yml    # 容器编排
│   └── manifest.json         # fnOS 应用描述
├── scripts/                  # 构建脚本
│   ├── build-fpk.sh          # Linux/Mac fpk 打包
│   └── build-fpk.ps1         # Windows fpk 打包
└── package.json
```

## 快速开始

### Docker 部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/lmy071/feiniu-photo-heatmap.git
cd feiniu-photo-heatmap

# 构建并启动
docker compose -f docker/docker-compose.yml up -d
```

> 默认将宿主机的 `/vol1/1000/Photo` 挂载到容器内的 `/photos` 路径。
> 如果照片在其他目录，修改 `docker-compose.yml` 中的 `volumes` 映射。

### 本地开发

```bash
# 1. 安装依赖
npm install
cd server && npm install && cd ..

# 2. 配置扫描路径
cp server/.env.example server/.env
# 编辑 server/.env，设置 SCAN_PATHS 指向你的照片目录

# 3. 启动后端（端口 3000）
npm run server &

# 4. 启动前端开发服务器（端口 5173，自动代理 API）
npm run dev
```

访问 http://localhost:5173

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `SCAN_PATHS` | 照片扫描路径，逗号分隔支持多个 | `/photos` |
| `PORT` | 服务端口 | `3000` |

### 扫描路径说明

项目采用**本地文件系统扫描**，不再依赖 WebDAV。扫描目录下所有图片文件（`.jpg` `.jpeg` `.png` `.gif` `.webp` `.bmp` `.heic` `.heif`），按文件的创建/修改时间统计每日数量。

**实况照片处理**：自动识别同目录下同基线名的 `.HEIC` + `.MO V` 对（如 `IMG_1234.HEIC` + `IMG_1234.MO V`），合并为**一张**照片计数。`-E`、`_1` 等编辑后缀自动匹配。

### 飞牛 NAS 路径参考

| NAS 型号 | 默认照片路径 |
|----------|-------------|
| fnOS 默认 | `/vol1/1000/Photo` |
| 传统 DSM | `/volume1/photo` |
| 自定义 | 按实际配置 |

## API 接口

### `GET /api/photos/stats`
获取照片统计数据，支持日期范围筛选。

| 参数 | 类型 | 说明 |
|------|------|------|
| `startDate` | string | 起始日期 (yyyy-MM-dd)，可选 |
| `endDate` | string | 结束日期 (yyyy-MM-dd)，可选 |

```json
{
  "totalPhotos": 12345,
  "totalDays": 365,
  "dailyStats": [
    { "date": "2024-01-01", "count": 5 },
    { "date": "2024-01-02", "count": 12 }
  ],
  "lastScan": 1715670000000
}
```

### `POST /api/photos/rescan`
触发后台重新扫描。5 分钟防抖，频繁调用自动跳过。

### `GET /api/photos/status`
查询扫描状态和进度。

```json
{
  "scanning": false,
  "progress": 100,
  "lastScan": "2026-05-14T12:00:00.000Z",
  "totalPhotos": 12345,
  "totalDays": 365,
  "scanPaths": ["/photos"],
  "lastError": null
}
```

### `GET /api/health`
健康检查。

## fpk 安装包

### 构建

```bash
# 前置要求：Docker + Node.js 20+
bash scripts/build-fpk.sh
```

构建产物位于 `build/feiniu-photo-heatmap-{日期}.fpk`。

### 安装

1. 上传 fpk 文件到飞牛 NAS
2. **应用中心** → **导入应用** → 选择 fpk
3. 确认照片路径映射配置
4. 安装完成，访问 `http://<NAS_IP>:3000`

## 数据缓存

项目使用 JSON 文件持久缓存（`server/photo-cache.json`），记录每个文件的 `mtime` 和 `size`：

- **首次启动**：全量扫描，写入缓存
- **后续启动**：仅处理新增/变更的文件（增量扫描）
- **手动刷新**：调用 `POST /api/photos/rescan` 或点击页面"重新扫描"按钮
- **缓存路径**：`server/photo-cache.json`

## 技术栈

| 层 | 技术 |
|----|------|
| **前端** | Vue 3 + TypeScript + Vite |
| **后端** | Node.js + Express |
| **存储** | 文件系统直接扫描 + JSON 缓存 |
| **部署** | Docker + fnOS fpk |

## License

MIT
