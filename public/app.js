// 全局变量
let heatmapData = {};
let calHeatmapInstance = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadData('year');
    updateLastUpdateTime();
});

// 加载数据
async function loadData(period) {
    showLoading();
    
    try {
        // 更新按钮状态
        document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // 获取数据
        const url = period === 'all' ? '/api/photos/all' : `/api/photos?year=${period}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            processData(result.data);
            renderHeatmap(period);
            updateStats(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        alert('加载数据失败：' + error.message);
    }
}

// 处理数据
function processData(data) {
    heatmapData = {};
    
    data.forEach(item => {
        // 转换为时间戳（毫秒）
        const timestamp = new Date(item.date).getTime() / 1000;
        heatmapData[timestamp] = item.count;
    });
}

// 渲染热力图
function renderHeatmap(period) {
    const container = document.getElementById('heatmap');
    container.innerHTML = '';
    
    // 销毁之前的实例
    if (calHeatmapInstance) {
        calHeatmapInstance.destroy();
    }
    
    // 创建新的热力图
    calHeatmapInstance = new CalHeatmap();
    
    const startDate = period === 'year' 
        ? new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        : new Date(period, 0, 1);
    
    const endDate = period === 'year'
        ? new Date()
        : new Date(period, 11, 31);
    
    calHeatmapInstance.paint({
        data: {
            source: heatmapData,
            type: 'json',
            x: 'timestamp',
            y: 'count',
            groupY: 'max'
        },
        date: {
            start: startDate,
            end: endDate
        },
        range: 12,
        domain: {
            type: 'month',
            gutter: 4,
            label: {
                text: 'MMM',
                textAlign: 'start',
                position: 'top'
            }
        },
        subDomain: {
            type: 'day',
            gutter: 4,
            width: 11,
            height: 11,
            label: 'D'
        },
        cellSize: 11,
        domainGutter: 4,
        domainDynamicDimension: true,
        itemSelector: '#heatmap',
        verticalOrientation: false,
        tooltip: true,
        legend: [1, 3, 5, 10, 20],
        threshold: {
            min: 1,
            max: 20,
            values: [1, 3, 5, 10, 20]
        },
        scale: {
            color: {
                range: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
            }
        }
    }, [
        [
            Tooltip,
            {
                text: function(date, value) {
                    const count = value || 0;
                    const dateStr = date.toLocaleDateString('zh-CN', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                    return `${dateStr}: ${count} 张照片`;
                }
            }
        ]
    ]);
}

// 更新统计信息
function updateStats(data) {
    // 总照片数
    const total = data.reduce((sum, item) => sum + item.count, 0);
    document.getElementById('totalPhotos').textContent = total.toLocaleString();
    
    // 最多照片日
    const maxItem = data.reduce((max, item) => item.count > max.count ? item : max, {count: 0});
    document.getElementById('maxPhotos').textContent = maxItem.count;
    
    // 最长连续拍摄
    const sortedDates = data
        .map(item => new Date(item.date))
        .sort((a, b) => a - b);
    
    let maxStreak = 0;
    let currentStreak = 0;
    let prevDate = null;
    
    sortedDates.forEach(date => {
        if (prevDate && (date - prevDate) === 86400000) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
        prevDate = date;
    });
    
    document.getElementById('longestStreak').textContent = maxStreak + ' 天';
}

// 刷新数据
function refreshData() {
    const activeBtn = document.querySelector('.btn.active');
    if (activeBtn) {
        const period = activeBtn.textContent === '近一年' ? 'year' :
                      activeBtn.textContent === '全部' ? 'all' :
                      activeBtn.textContent;
        loadData(period);
    }
    updateLastUpdateTime();
}

// 显示加载中
function showLoading() {
    const container = document.getElementById('heatmap');
    container.innerHTML = '<div class="loading">加载中</div>';
}

// 更新最后更新时间
function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = timeStr;
}

// Tooltip 插件（简化版）
const Tooltip = {
    name: 'tooltip',
    afterLoad: function() {
        console.log('Tooltip plugin loaded');
    }
};
