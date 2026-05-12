#!/bin/bash
# 构建 fpk 安装包的脚本
# 用于飞牛 NAS (fnOS) 应用打包

set -e

# 颜色输出
RED='"'"'\033[0;31m'"'"'
GREEN='"'"'\033[0;32m'"'"'
YELLOW='"'"'\033[1;33m'"'"'
NC='"'"'\033[0m'"'"' # No Color

echo -e "${GREEN}=== 飞牛相册照片热力图 FPK 构建脚本 ===${NC}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行${NC}"
    exit 1
fi

# 创建构建输出目录
BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo -e "${GREEN}[1/5] 构建 Docker 镜像...${NC}"
docker build -t feiniu-photo-heatmap:latest -f docker/Dockerfile .

echo -e "${GREEN}[2/5] 导出镜像...${NC}"
docker save feiniu-photo-heatmap:latest -o "$BUILD_DIR/image.tar"

echo -e "${GREEN}[3/5] 准备配置文件...${NC}"
cp docker/manifest.json "$BUILD_DIR/"
cp docker/docker-compose.yml "$BUILD_DIR/"

# 创建图标（如果不存在，使用默认图标）
if [ -f "public/icon.png" ]; then
    cp public/icon.png "$BUILD_DIR/icon.png"
elif [ -f "public/favicon.ico" ]; then
    cp public/favicon.ico "$BUILD_DIR/icon.png"
fi

# 创建截图（如果存在）
if [ -f "public/screenshot.png" ]; then
    cp public/screenshot.png "$BUILD_DIR/screenshot.png"
fi

echo -e "${GREEN}[4/5] 生成 fpk 校验文件...${NC}"
# 生成镜像 SHA256
sha256sum "$BUILD_DIR/image.tar" > "$BUILD_DIR/image.sha256"

# 创建安装脚本
cat > "$BUILD_DIR/install.sh" << '"'"'INSTALL_SCRIPT'"'"'
#!/bin/bash
set -e

echo "正在安装飞牛相册照片热力图..."

# 加载镜像
echo "加载 Docker 镜像..."
docker load -i image.tar

# 启动容器
docker-compose up -d

echo "安装完成！"
echo "访问 http://localhost:3000 查看应用"
INSTALL_SCRIPT

chmod +x "$BUILD_DIR/install.sh"

echo -e "${GREEN}[5/5] 创建 fpk 包...${NC}"
FPK_NAME="feiniu-photo-heatmap-$(date +%Y%m%d-%H%M%S).fpk"
tar -czvf "$BUILD_DIR/$FPK_NAME" -C "$BUILD_DIR" .

echo ""
echo -e "${GREEN}构建完成！${NC}"
echo "FPK 文件: $BUILD_DIR/$FPK_NAME"
echo ""
echo -e "${YELLOW}安装说明:${NC}"
echo "1. 将 fpk 文件上传到飞牛 NAS"
echo "2. 在 fnOS 应用中心导入 fpk 文件"
echo "3. 配置飞牛 NAS 地址、用户名和密码"
echo "4. 等待安装完成"
echo ""
