# 飞牛NAS相册热力图

一个飞牛NAS应用，用于读取飞牛相册照片数据，生成类似GitHub贡献图的热力图，展示每日照片数量。

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
git clone https://github.com/yourusername/feiniu-photo-heatmap.git

# 安装依赖
cd feiniu-photo-heatmap
npm install

# 启动服务
npm start
```

## 配置

在 `config.json` 中配置：
- `nas_ip`: 飞牛NAS IP地址
- `api_port`: API端口
- `username`: 用户名（可选）

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

Your Name - Initial work

## 致谢

- 飞牛NAS团队
- Cal-Heatmap项目
