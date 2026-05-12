const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8088;

// 飞牛NAS API配置
const FEINIU_CONFIG = {
    nasIp: process.env.NAS_IP || 'localhost',
    apiPort: process.env.API_PORT || '8080',
    username: process.env.NAS_USER || '',
    password: process.env.NAS_PASS || ''
};

// 静态文件服务
app.use(express.static('public'));
app.use(express.json());

// 获取相册照片数据
app.get('/api/photos', async (req, res) => {
    try {
        const { year, month } = req.query;
        
        // 调用飞牛NAS API获取照片列表
        // 注意：这里需要根据飞牛NAS的实际API进行调整
        const photos = await fetchFeiniuPhotos(FEINIU_CONFIG);
        
        // 统计每日照片数量
        const dailyCounts = processPhotosByDate(photos);
        
        res.json({
            success: true,
            data: dailyCounts
        });
    } catch (error) {
        console.error('获取照片数据失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取所有年份的统计数据
app.get('/api/photos/all', async (req, res) => {
    try {
        const photos = await fetchFeiniuPhotos(FEINIU_CONFIG);
        const dailyCounts = processPhotosByDate(photos);
        
        res.json({
            success: true,
            data: dailyCounts
        });
    } catch (error) {
        console.error('获取所有照片数据失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 模拟获取飞牛NAS照片数据
// 实际使用时需要根据飞牛NAS的API文档进行修改
async function fetchFeiniuPhotos(config) {
    // TODO: 根据实际飞牛NAS API调整
    // 示例：调用飞牛NAS的相册API
    
    try {
        // 飞牛NAS API端点（需要根据实际情况修改）
        const apiUrl = `http://${config.nasIp}:${config.apiPort}/api/photos`;
        
        // 这里使用模拟数据，实际应该调用真实API
        // const response = await axios.get(apiUrl, {
        //     auth: {
        //         username: config.username,
        //         password: config.password
        //     }
        // });
        // return response.data;
        
        // 模拟数据 - 实际使用时删除
        return generateMockPhotos();
        
    } catch (error) {
        console.error('调用飞牛NAS API失败:', error);
        throw error;
    }
}

// 生成模拟照片数据（用于测试）
function generateMockPhotos() {
    const photos = [];
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, 0, 1);
    
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        // 随机生成每天0-20张照片
        const count = Math.floor(Math.random() * 21);
        for (let i = 0; i < count; i++) {
            photos.push({
                id: `photo_${d.toISOString()}_${i}`,
                date: d.toISOString().split('T')[0],
                timestamp: d.getTime()
            });
        }
    }
    
    return photos;
}

// 处理照片数据，按日期统计
function processPhotosByDate(photos) {
    const dailyCounts = {};
    
    photos.forEach(photo => {
        const date = photo.date || new Date(photo.timestamp).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    // 转换为数组格式，便于前端使用
    return Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        count
    }));
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 飞牛相册热力图服务已启动`);
    console.log(`📍 访问地址: <ADDRESS_REDACTED>
    console.log(`📍 局域网访问: http://${getLocalIP()}:${PORT}`);
});

function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (let devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}
