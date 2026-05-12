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
Copy-Item docker/manifest.json $BUILD_DIR/
Copy-Item docker/docker-compose.yml $BUILD_DIR/

# 创建图标
if (Test-Path "public/icon.png") {
    Copy-Item "public/icon.png" "$BUILD_DIR/icon.png"
}

# 创建截图
if (Test-Path "public/screenshot.png") {
    Copy-Item "public/screenshot.png" "$BUILD_DIR/screenshot.png"
}

Write-Host "[5/5] 创建 fpk 包..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$FPK_NAME = "feiniu-photo-heatmap-$timestamp.fpk"

# 使用 tar 或 zip
$useTar = $false
try {
    tar --version 2>&1 | Out-Null
    $useTar = $true
} catch {}

if ($useTar) {
    tar -czvf "$BUILD_DIR\$FPK_NAME" -C $BUILD_DIR .
} else {
    # 使用 PowerShell Compress-Archive
    $tempDir = "$BUILD_DIR\temp"
    Copy-Item "$BUILD_DIR\*" $tempDir -Recurse -ErrorAction SilentlyContinue
    Compress-Archive -Path "$tempDir\*" -DestinationPath "$BUILD_DIR\$FPK_NAME" -Force
    Remove-Item $tempDir -Recurse -Force
}

Write-Host ""
Write-Host "构建完成！" -ForegroundColor Green
Write-Host "FPK 文件: $BUILD_DIR\$FPK_NAME"
Write-Host ""
Write-Host "安装说明:" -ForegroundColor Yellow
Write-Host "1. 将 fpk 文件上传到飞牛 NAS"
Write-Host "2. 在 fnOS 应用中心导入 fpk 文件"
Write-Host "3. 配置飞牛 NAS 地址、用户名和密码"
Write-Host "4. 等待安装完成"
Write-Host ""
