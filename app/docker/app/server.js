const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../www')));

// ==================== API 代理端点 ====================

/**
 * 获取相册照片列表
 * 前端调用: GET /api/photos
 * 后端代理到飞牛 NAS 相册 API
 */
app.get('/api/photos', async (req, res) => {
    try {
        // 从请求中获取 Cookie（用于认证）
        const cookies = req.headers.cookie || '';
        
        // 飞牛 NAS 相册 API 端点列表（按优先级排序）
        const apiEndpoints = [
            'http://localhost:8080/api/v1/album/photos',
            'http://localhost:8080/api/album/list',
            'http://localhost:8080/module/api/album/get_photo_list'
        ];

        let lastError = null;

        for (const endpoint of apiEndpoints) {
            try {
                console.log(`[后端] 尝试 API 端点: ${endpoint}`);
                
                const response = await axios.get(endpoint, {
                    headers: {
                        'Cookie': cookies,
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    timeout: 5000
                });

                if (response.status === 200 && response.data) {
                    console.log(`[后端] ✅ 成功从 ${endpoint} 获取数据`);
                    const normalized = normalizeApiData(response.data);
                    return res.json({ success: true, data: normalized });
                }
            } catch (err) {
                console.log(`[后端] ❌ 端点 ${endpoint} 失败: ${err.message}`);
                lastError = err;
                continue;
            }
        }

        // 所有端点都失败，返回演示数据
        console.warn('[后端] ⚠️ 所有 API 端点均不可用，返回演示数据');
        const demoData = generateDemoData();
        return res.json({ 
            success: true, 
            data: demoData, 
            demo: true,
            message: 'API不可用，返回演示数据' 
        });

    } catch (error) {
        console.error('[后端] ❌ 服务器错误:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ==================== 数据处理函数 ====================

function normalizeApiData(raw) {
    let items = [];
    
    if (Array.isArray(raw)) {
        items = raw;
    } else if (raw.data && Array.isArray(raw.data)) {
        items = raw.data;
    } else if (raw.photos && Array.isArray(raw.photos)) {
        items = raw.photos;
    } else if (raw.items && Array.isArray(raw.items)) {
        items = raw.items;
    } else if (raw.list && Array.isArray(raw.list)) {
        items = raw.list;
    } else {
        console.warn('[后端] 无法解析API返回数据:', raw);
        return [];
    }

    const dailyCounts = {};
    items.forEach(item => {
        let dateStr = '';
        
        if (item.date) dateStr = item.date;
        else if (item.time) dateStr = item.time;
        else if (item.create_time) dateStr = item.create_time;
        else if (item.createdAt) dateStr = item.createdAt;
        else if (item.timestamp) {
            dateStr = new Date(item.timestamp).toISOString().split('T')[0];
        }
        
        if (dateStr) {
            dateStr = String(dateStr).substring(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
            }
        }
    });

    return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
}

function generateDemoData() {
    const photos = [];
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 2, 0, 1);

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const month = d.getMonth();
        let baseProb = 0.3;

        if (dayOfWeek === 0 || dayOfWeek === 6) baseProb += 0.25;
        if ([1, 2, 5, 10].includes(month)) baseProb += 0.15;
        if ([6, 7, 8].includes(month)) baseProb += 0.1;

        if (Math.random() < baseProb) {
            const count = Math.floor(Math.random() * Math.random() * 25) + 1;
            photos.push({
                date: new Date(d).toISOString().split('T')[0],
                count: count
            });
        }
    }

    return photos;
}

// ==================== 启动服务器 ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  飞牛相册热力图 - Node.js 后端');
    console.log('========================================');
    console.log(`  服务运行在: http://0.0.0.0:${PORT}`);
    console.log(`  静态文件目录: ${path.join(__dirname, '../www')}`);
    console.log('========================================');
});
