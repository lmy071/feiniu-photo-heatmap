#!/bin/bash
# 飞牛 NAS (fnOS) fpk 安装包构建脚本 - 官方规范版
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo -e "${GREEN}=== 飞牛照片热力图 FPK 构建（fnOS 规范版） ===${NC}"

# 前置检查
command -v docker >/dev/null 2>&1 || error "Docker 未安装"
docker info >/dev/null 2>&1 || error "Docker 未运行"

BUILD_DIR="build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 步骤1: 构建 Docker 镜像
info "[1/5] 构建 Docker 镜像..."
docker build -t feiniu-photo-heatmap:latest -f docker/Dockerfile .

# 步骤2: 导出镜像
info "[2/5] 导出 Docker 镜像..."
docker save feiniu-photo-heatmap:latest -o "$BUILD_DIR/image.tar"
sha256sum "$BUILD_DIR/image.tar" > "$BUILD_DIR/image.sha256"

# 步骤3: 准备 FPK 目录
info "[3/5] 准备 FPK 文件结构..."
FPK_DIR="$BUILD_DIR/fpk"
mkdir -p "$FPK_DIR/cmd" "$FPK_DIR/config" "$FPK_DIR/ui/images" "$FPK_DIR/wizard"

# 创建 app.tgz（包含 docker-compose.yaml）
mkdir -p "$BUILD_DIR/app-content/docker"
cp docker/docker-compose.yml "$BUILD_DIR/app-content/docker/docker-compose.yaml"
cd "$BUILD_DIR/app-content"
tar -czf "$FPK_DIR/app.tgz" docker/
cd ../..

# 复制框架文件
cp fnos/manifest "$FPK_DIR/"
cp fnos/cmd/* "$FPK_DIR/cmd/" 2>/dev/null || true
cp fnos/config/* "$FPK_DIR/config/"
cp fnos/ui/config "$FPK_DIR/ui/"
cp fnos/wizard/* "$FPK_DIR/wizard/" 2>/dev/null || true

# 复制 Docker 镜像
cp "$BUILD_DIR/image.tar" "$FPK_DIR/"
cp "$BUILD_DIR/image.sha256" "$FPK_DIR/"

# 生成图标
python3 << 'PYEOF'
import struct, zlib
def chunk(t,d):
    c=t+d;return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
hdr=b'\x89PNG\r\n\x1a\n'
def make_icon(size, path):
    ihdr=chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))
    raw=b'';cx,cy,md=size/2,size/2,size/2
    for y in range(size):
        raw+=b'\x00'
        for x in range(size):
            d=((x-cx)**2+(y-cy)**2)**0.5
            r,g,b=(52-int(d/md*20),120-int(d/md*40),220-int(d/md*80)) if d<md else (240,244,248)
            raw+=struct.pack('BBB',max(0,r),max(0,g),max(0,b))
    idat=chunk(b'IDAT',zlib.compress(raw));iend=chunk(b'IEND',b'')
    with open(path,'wb') as f:f.write(hdr+ihdr+idat+iend)
make_icon(64, '${FPK_DIR}/ICON.PNG')
make_icon(256, '${FPK_DIR}/ICON_256.PNG')
PYEOF

# 步骤4: 更新校验和
info "[4/5] 更新 manifest 校验和..."
CHECKSUM=$(md5sum "$FPK_DIR/app.tgz" | cut -d' ' -f1)
sed -i "s/^checksum.*/checksum        = ${CHECKSUM}/" "$FPK_DIR/manifest"

BUILD_DATE=$(date +%Y%m%d)
# 步骤5: 打包 FPK
info "[5/5] 打包 FPK..."
FPK_NAME="feiniu-photo-heatmap_1.0.0_x86_${BUILD_DATE}.fpk"
cd "$FPK_DIR"
tar -czf "../../$BUILD_DIR/$FPK_NAME" \
  app.tgz manifest image.tar image.sha256 cmd/ config/ ICON.PNG ICON_256.PNG ui/ wizard/
cd ../..

echo ""
info "✅ 构建完成！"
echo "FPK: $BUILD_DIR/$FPK_NAME ($(du -h "$BUILD_DIR/$FPK_NAME" | cut -f1))"
echo ""
echo -e "${YELLOW}安装：${NC}"
echo "1. 将 fpk 文件上传到飞牛 NAS"
echo "2. 应用中心 → 导入应用 → 选择 fpk 文件"
echo "3. 安装向导中配置照片扫描路径"
echo "4. 等待安装完成，访问 http://飞牛NAS的IP:3000 查看热力图"
