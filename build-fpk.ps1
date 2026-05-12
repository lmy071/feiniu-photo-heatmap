# build-fpk.ps1 - Build fnOS application FPK package
# FPK format = ZIP archive containing all app files

$ErrorActionPreference = "Stop"

$ProjectDir = $PSScriptRoot
$AppName = "feiniu-photo-heatmap"
$OutputFpk = Join-Path $ProjectDir "$AppName.fpk"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Build fnOS App FPK Package" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check manifest file
$ManifestPath = Join-Path $ProjectDir "manifest"
if (-not (Test-Path $ManifestPath)) {
    Write-Host "[ERROR] Manifest file not found: $ManifestPath" -ForegroundColor Red
    exit 1
}

# Remove old FPK if exists
if (Test-Path $OutputFpk) {
    Write-Host "[INFO] Removing old FPK file..." -ForegroundColor Yellow
    Remove-Item $OutputFpk -Force
}

Write-Host "[Step 1] Packaging FPK file..." -ForegroundColor Green
Write-Host "  Source: $ProjectDir"
Write-Host "  Output: $OutputFpk"
Write-Host ""

# Create temp directory for packaging
$TempDir = Join-Path $ProjectDir "._temp_fpk_build"
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Items to package (directories get filtered, files copied directly)
$DirsToPackage = @("app", "cmd", "config", "wizard")
$FilesToPackage = @("manifest", "ICON.PNG", "ICON_256.PNG")

# Exclude patterns for directory copying
$ExcludeDirs = @("node_modules", "dist", ".vite", ".DS_Store")
$ExcludeFiles = @("package-lock.json", "tsconfig.tsbuildinfo")

# Copy directories with exclusions
foreach ($dir in $DirsToPackage) {
    $srcPath = Join-Path $ProjectDir $dir
    if (Test-Path $srcPath) {
        $dstPath = Join-Path $TempDir $dir
        # Use robocopy for efficient filtered copy
        $excludeArgs = $ExcludeDirs | ForEach-Object { "/XD", $_ }
        $excludeFileArgs = $ExcludeFiles | ForEach-Object { "/XF", "$_" }
        robocopy $srcPath $dstPath /E /NFL /NDL /NJH /NJS /NC /NS /NP @excludeArgs @excludeFileArgs | Out-Null
        Write-Host "  [OK] Added: $dir"
    } else {
        Write-Host "  [SKIP] Not found: $dir" -ForegroundColor Yellow
    }
}

# Copy individual files
foreach ($file in $FilesToPackage) {
    $srcPath = Join-Path $ProjectDir $file
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $TempDir -Force
        Write-Host "  [OK] Added: $file"
    } else {
        Write-Host "  [SKIP] Not found: $file" -ForegroundColor Yellow
    }
}

# Compress to ZIP then rename to .fpk
Write-Host ""
Write-Host "[Step 2] Compressing..." -ForegroundColor Green
$TempZip = Join-Path $ProjectDir "._temp.zip"
if (Test-Path $TempZip) {
    Remove-Item $TempZip -Force
}

try {
    Compress-Archive -Path "$TempDir\*" -DestinationPath $TempZip -CompressionLevel Optimal
    Write-Host "  [OK] Compressed: $TempZip"
    
    # Rename to .fpk
    Move-Item -Path $TempZip -Destination $OutputFpk -Force
    Write-Host "  [OK] Renamed to FPK: $OutputFpk"
} catch {
    Write-Host "[ERROR] Compression failed: $_" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
    }
    if (Test-Path $TempZip) {
        Remove-Item $TempZip -Force
    }
}

# Show result
Write-Host ""
$FileInfo = Get-Item $OutputFpk
$SizeKB = [math]::Round($FileInfo.Length / 1KB, 2)
$SizeMB = [math]::Round($FileInfo.Length / 1MB, 2)

Write-Host "========================================" -ForegroundColor Green
Write-Host "  FPK Build Success!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  File: $OutputFpk"
Write-Host "  Size: $SizeKB KB ($SizeMB MB)"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "  1. Open Feiniu NAS web interface"
Write-Host "  2. Go to App Center -> Manual Install"
Write-Host "  3. Upload this FPK file"
Write-Host ""
