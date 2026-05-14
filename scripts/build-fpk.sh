#!/bin/bash
# 飞牛 NAS (fnOS) fpk 安装包构建脚本
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== 飞牛照片热力图 FPK 构建 ===${NC}"

# 前置检查
if ! command -v docker &> /dev/null; then
  echo -e "${RED}错误: Docker 未安装${NC}"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo -e "${RED}错误: Docker 未运行${NC}"
  exit 1
fi

BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo -e "${GREEN}[1/5] 构建 Docker 镜像...${NC}"
docker build -t feiniu-photo-heatmap:latest -f docker/Dockerfile .

echo -e "${GREEN}[2/5] 导出镜像...${NC}"
docker save feiniu-photo-heatmap:latest -o "$BUILD_DIR/image.tar"

echo -e "${GREEN}[3/5] 准备应用配置...${NC}"
cp docker/manifest.json "$BUILD_DIR/"
cp docker/docker-compose.yml "$BUILD_DIR/"

if [ -f "public/icon.png" ]; then
  cp public/icon.png "$BUILD_DIR/icon.png"
fi

if [ -f "public/screenshot.png" ]; then
  cp public/screenshot.png "$BUILD_DIR/screenshot.png"
fi

echo -e "${GREEN}[4/5] 生成校验和...${NC}"
sha256sum "$BUILD_DIR/image.tar" > "$BUILD_DIR/image.sha256"

# 安装脚本
cat > "$BUILD_DIR/install.sh" << 'INSTALL_SCRIPT'
#!/bin/bash
set -e
echo "安装飞牛照片热力图..."
docker load -i image.tar
docker-compose up -d
echo "安装完成！访问 http://localhost:3000 查看"
INSTALL_SCRIPT

chmod +x "$BUILD_DIR/install.sh"

echo -e "${GREEN}[5/5] 打包 fpk...${NC}"
FPK_NAME="feiniu-photo-heatmap-$(date +%Y%m%d-%H%M%S).fpk"
tar -czvf "$BUILD_DIR/$FPK_NAME" -C "$BUILD_DIR" .

echo ""
echo -e "${GREEN}✅ 构建完成！${NC}"
echo "FPK: $BUILD_DIR/$FPK_NAME"
echo ""
echo -e "${YELLOW}安装：${NC}"
echo "1. 上传 fpk 到飞牛 NAS"
echo "2. 应用中心 → 导入应用 → 选择 fpk 文件"
echo "3. 填写照片路径映射，等待安装完成"
