const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// FPK打包脚本
async function packageFPK() {
    const projectRoot = path.resolve(__dirname, '..');
    const packageJson = require(path.join(projectRoot, 'package.json'));
    const outputFileName = `${packageJson.name}-v${packageJson.version}.fpk`;
    const outputPath = path.join(projectRoot, 'dist', outputFileName);
    
    // 确保dist目录存在
    if (!fs.existsSync(path.join(projectRoot, 'dist'))) {
        fs.mkdirSync(path.join(projectRoot, 'dist'), { recursive: true });
    }
    
    console.log('📦 开始打包 FPK...');
    console.log(`📝 输出文件: ${outputFileName}`);
    
    // 创建归档
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
    });
    
    output.on('close', function() {
        console.log(`✅ 打包完成!`);
        console.log(`📦 文件大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📍 文件路径: ${outputPath}`);
    });
    
    archive.on('error', function(err) {
        throw err;
    });
    
    archive.pipe(output);
    
    // 需要打包的文件和目录
    const includePaths = [
        'public/',
        'server.js',
        'package.json',
        'feiniu-app.json',
        'README.md'
    ];
    
    // 排除的文件
    const excludePatterns = [
        'node_modules/**',
        'dist/**',
        '.git/**',
        '*.log',
        '.env'
    ];
    
    // 添加文件到归档
    includePaths.forEach(p => {
        const fullPath = path.join(projectRoot, p);
        if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                archive.directory(fullPath, p);
            } else {
                archive.file(fullPath, { name: p });
            }
            console.log(`  ✓ 添加: ${p}`);
        } else {
            console.warn(`  ⚠ 跳过(不存在): ${p}`);
        }
    });
    
    await archive.finalize();
    
    // 同时创建一个符号链接或副本作为最新版本
    const latestPath = path.join(projectRoot, 'dist', `${packageJson.name}.fpk`);
    fs.copyFileSync(outputPath, latestPath);
    console.log(`📎 最新版本: ${latestPath}`);
}

// 执行打包
packageFPK().catch(console.error);
