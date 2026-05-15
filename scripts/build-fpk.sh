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

# 生成 manifest.json（注入构建时间戳）
python3 -c "
import json, time
with open('docker/manifest.json') as f:
    m = json.load(f)
m['build_at'] = int(time.time())
if 'fnos_version' in m.get('requirements', {}):
    del m['requirements']['fnos_version']
m['min_fnos_version'] = m.get('min_fnos_version', '1.0.0')
with open('${BUILD_DIR}/manifest.json', 'w') as f:
    json.dump(m, f, indent=2, ensure_ascii=False)
    f.write(chr(10))
"
echo "  - manifest.json 已生成 (build_at: $(date +%s))"

cp docker/docker-compose.yml "$BUILD_DIR/"

# 复制图标和截图（不存在时生成占位图）
if [ -f "public/icon.png" ]; then
  cp public/icon.png "$BUILD_DIR/icon.png"
  echo "  - 使用 public/icon.png"
else
  echo "  - 生成默认 icon.png"
  python3 -c "
import struct, zlib
def chunk(t,d):c=t+d;return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
hdr=b'\x89PNG\r\n\x1a\n'
w,h=128,128
ihdr=chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))
raw=b''
cx,cy,md=w/2,h/2,min(w,h)/2
for y in range(h):
  raw+=b'\x00'
  for x in range(w):
    d=((x-cx)**2+(y-cy)**2)**0.5
    if d<md:
      t=d/md;r,g,b=52-int(t*20),120-int(t*40),220-int(t*80)
    else:r,g,b=240,244,248
    raw+=struct.pack('BBB',max(0,r),max(0,g),max(0,b))
idat=chunk(b'IDAT',zlib.compress(raw))
iend=chunk(b'IEND',b'')
with open('${BUILD_DIR}/icon.png','wb')as f:f.write(hdr+ihdr+idat+iend)
"
fi

if [ -f "public/screenshot.png" ]; then
  cp public/screenshot.png "$BUILD_DIR/screenshot.png"
  echo "  - 使用 public/screenshot.png"
else
  echo "  - 生成默认 screenshot.png"
  python3 -c "
import struct, zlib
def chunk(t,d):c=t+d;return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
hdr=b'\x89PNG\r\n\x1a\n'
w,h=800,450
ihdr=chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))
raw=b''
for y in range(h):
  raw+=b'\x00'
  for x in range(w):
    if y<50 or y>h-50:r,g,b=240,244,248
    elif 100<y<150 and 100<x<700:
      bw,bg=40,10;rx=(x-100)%(bw+bg)
      if rx<bw:iv=80+140*((x-100)//(bw+bg)%7)//7;r,g,b=50,min(200,iv+50),230-iv//3
      else:r,g,b=240,244,248
    elif 180<y<220 and 150<x<650:r,g,b=52,120,220
    else:r,g,b=245,247,250
    raw+=struct.pack('BBB',r,g,b)
idat=chunk(b'IDAT',zlib.compress(raw))
iend=chunk(b'IEND',b'')
with open('${BUILD_DIR}/screenshot.png','wb')as f:f.write(hdr+ihdr+idat+iend)
"
fi

echo -e "${GREEN}[4/5] 生成校验和...${NC}"
sha256sum "$BUILD_DIR/image.tar" > "$BUILD_DIR/image.sha256"

# 安装脚本
cat > "$BUILD_DIR/install.sh" << 'INSTALL_SCRIPT'
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📸 安装飞牛照片热力图..."
echo "载入 Docker 镜像..."
docker load -i image.tar
echo "启动容器..."
docker compose up -d
echo ""
echo "✅ 安装完成！访问 http://飞牛NAS的IP:3000 查看热力图"
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
