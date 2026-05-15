# 构建 fpk 安装包的脚本
# 用于飞牛 NAS (fnOS) 应用打包

$ErrorActionPreference = "Stop"

Write-Host "=== 飞牛相册照片热力图 FPK 构建脚本 ===" -ForegroundColor Green
Write-Host ""

# 检查 Docker
Write-Host "[1/5] 检查 Docker..." -ForegroundColor Green
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Host "错误: Docker 未安装" -ForegroundColor Red
    exit 1
}

# 检查 Docker 是否运行
try {
    docker info 2>&1 | Out-Null
} catch {
    Write-Host "错误: Docker 未运行" -ForegroundColor Red
    exit 1
}

# 创建构建输出目录
$BUILD_DIR = "build"
if (Test-Path $BUILD_DIR) {
    Remove-Item -Recurse -Force $BUILD_DIR
}
New-Item -ItemType Directory -Force -Path $BUILD_DIR | Out-Null

Write-Host "[2/5] 构建 Docker 镜像..." -ForegroundColor Green
docker build -t feiniu-photo-heatmap:latest -f docker/Dockerfile .

Write-Host "[3/5] 导出镜像..." -ForegroundColor Green
docker save feiniu-photo-heatmap:latest -o "$BUILD_DIR/image.tar"

Write-Host "[4/5] 准备配置文件..." -ForegroundColor Green

# 生成 manifest.json（注入构建时间戳）
$manifestRaw = Get-Content "docker/manifest.json" -Raw | ConvertFrom-Json
$manifestRaw | Add-Member -NotePropertyName "build_at" -NotePropertyValue ([int][DateTime]::UtcNow.Subtract([DateTime]"1970-01-01").TotalSeconds) -Force
if ($manifestRaw.requirements.fnos_version) {
    $manifestRaw.requirements.PSObject.Properties.Remove("fnos_version")
}
$manifestRaw | ConvertTo-Json -Depth 10 | Set-Content "$BUILD_DIR/manifest.json" -Encoding UTF8

Copy-Item docker/docker-compose.yml $BUILD_DIR/

# 创建图标（不存在时生成默认 128x128 蓝色 PNG）
if (Test-Path "public/icon.png") {
    Copy-Item "public/icon.png" "$BUILD_DIR/icon.png"
    Write-Host "  - 使用 public/icon.png" -ForegroundColor Gray
} else {
    Write-Host "  - 生成默认 icon.png" -ForegroundColor Gray
    # 128x128 最小 PNG 蓝色图标（通过 .NET 生成）
    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap 128, 128
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(240, 244, 248))
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point 0, 0),
        (New-Object System.Drawing.Point 128, 128),
        [System.Drawing.Color]::FromArgb(52, 140, 220),
        [System.Drawing.Color]::FromArgb(32, 100, 200))
    $g.FillEllipse($brush, 10, 10, 108, 108)
    $bmp.Save("$BUILD_DIR/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

# 创建截图
if (Test-Path "public/screenshot.png") {
    Copy-Item "public/screenshot.png" "$BUILD_DIR/screenshot.png"
    Write-Host "  - 使用 public/screenshot.png" -ForegroundColor Gray
} else {
    Write-Host "  - 生成默认 screenshot.png" -ForegroundColor Gray
    # 800x450 默认截图
    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap 800, 450
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(245, 247, 250))
    $font = New-Object System.Drawing.Font "Arial", 24
    $brush = [System.Drawing.Brushes]::DarkGray
    $g.DrawString("飞牛照片热力图", $font, $brush, 280, 200)
    $bmp.Save("$BUILD_DIR/screenshot.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

# 生成校验和
Write-Host "[5/5] 打包 fpk..." -ForegroundColor Green
$sha256 = (Get-FileHash "$BUILD_DIR/image.tar" -Algorithm SHA256).Hash.ToLower()
"$sha256  image.tar" | Set-Content "$BUILD_DIR/image.sha256" -NoNewline

# 安装脚本
@"
#!/bin/bash
set -e
SCRIPT_DIR="`$(cd "`$(dirname "`${BASH_SOURCE[0]}")" && pwd)"
cd "`$SCRIPT_DIR"

echo "📸 安装飞牛照片热力图..."
echo "载入 Docker 镜像..."
docker load -i image.tar
echo "启动容器..."
docker compose up -d
echo ""
echo "✅ 安装完成！访问 http://飞牛NAS的IP:3000 查看热力图"
"@ | Set-Content "$BUILD_DIR/install.sh" -Encoding UTF8

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$FPK_NAME = "feiniu-photo-heatmap-$timestamp.fpk"

# 使用 tar 打包
try {
    tar --version 2>&1 | Out-Null
    tar -czvf "$BUILD_DIR\$FPK_NAME" -C $BUILD_DIR image.tar image.sha256 docker-compose.yml manifest.json install.sh icon.png screenshot.png 2>&1
} catch {
    Write-Host "警告: tar 不可用，使用 Compress-Archive（注意：fnOS 可能不兼容 .zip 格式）" -ForegroundColor Yellow
    $files = @("image.tar", "image.sha256", "docker-compose.yml", "manifest.json", "install.sh", "icon.png", "screenshot.png")
    $tempDir = "$BUILD_DIR\temp_fpk"
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
    foreach ($f in $files) {
        Copy-Item "$BUILD_DIR\$f" "$tempDir\" -ErrorAction SilentlyContinue
    }
    Compress-Archive -Path "$tempDir\*" -DestinationPath "$BUILD_DIR\$FPK_NAME" -Force
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "构建完成！" -ForegroundColor Green
Write-Host "FPK 文件: $BUILD_DIR\$FPK_NAME"
Write-Host ""
Write-Host "安装说明:" -ForegroundColor Yellow
Write-Host "1. 将 fpk 文件上传到飞牛 NAS"
Write-Host "2. 在 fnOS 应用中心导入 fpk 文件"
Write-Host "3. 配置照片扫描路径"
Write-Host "4. 等待安装完成，访问 http://飞牛NAS的IP:3000 查看热力图"
Write-Host ""
