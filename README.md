# 飞牛NAS相册热力图

[![GitHub](https://img.shields.io/badge/GitHub-lmy071-blue?logo=github)](https://github.com/lmy071/feiniu-photo-heatmap)

一个飞牛NAS应用，用于读取飞牛相册照片数据，生成类似GitHub贡献图的热力图，展示每日照片数量。

## 🌐 在线演示

克隆仓库后在本地运行即可查看效果。

## 功能特性

- 📸 读取飞牛相册所有照片
- 📊 生成类似GitHub的贡献热力图
- 📅 支持按年/月查看
- 🎨 自定义颜色主题
- 📱 响应式设计，支持移动端

## 安装部署

### 方法一：FPK包安装
1. 下载 `feiniu-photo-heatmap.fpk` 包
2. 在飞牛NAS应用中心中安装
3. 启动应用

### 方法二：手动部署
```bash
# 克隆仓库
git clone https://github.com/lmy071/feiniu-photo-heatmap.git

# 安装依赖
cd feiniu-photo-heatmap
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置飞牛NAS的IP地址等信息

# 启动服务
npm start
```

## 配置

在项目根目录创建 `.env` 文件（参考 `.env.example`）：
```bash
# 飞牛NAS配置
NAS_IP=192.168.1.100
NAS_PORT=8080
NAS_USER=your_username
NAS_PASS=your_password

# 应用端口
PORT=8088
```

或者在环境变量中配置：
- `NAS_IP`: 飞牛NAS IP地址
- `NAS_PORT`: API端口（默认8080）
- `NAS_USER`: 用户名（可选）
- `NAS_PASS`: 密码（可选）

## 开发

```bash
# 开发模式
npm run dev

# 打包FPK
npm run package
```

## 技术栈

- 后端：Node.js + Express
- 前端：Cal-Heatmap + D3.js
- 打包：Webpack

## 许可证

MIT License

## 作者

lmy071 - Initial work

## 仓库地址

- GitHub: https://github.com/lmy071/feiniu-photo-heatmap
- Issue跟踪: https://github.com/lmy071/feiniu-photo-heatmap/issues

## 致谢

- 飞牛NAS团队
- Cal-Heatmap项目
