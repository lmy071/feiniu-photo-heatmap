<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PhotoHeatmap from './components/PhotoHeatmap.vue'
import { usePhotoStats } from './composables/usePhotoStats'

const {
  stats, status, loading, scanning, error,
  fetchStats, fetchStatus, triggerRescan,
} = usePhotoStats()

const dateRange = ref({ startDate: '', endDate: '' })

function handleRangeChange(start: string, end: string) {
  dateRange.value = { startDate: start, endDate: end }
  fetchStats(start, end)
}

async function handleRescan() {
  await triggerRescan()
  if (!error.value && stats.value) {
    // 刷新当前视图
    handleRangeChange(dateRange.value.startDate, dateRange.value.endDate)
  }
}

onMounted(async () => {
  await fetchStatus()
  if (!status.value?.lastScan) {
    // 首次加载，等待扫描
    await fetchStats()
  } else {
    await fetchStats()
  }
})
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-left">
        <h1 class="title">📸 照片热力图</h1>
        <p class="subtitle">飞牛 NAS 每日照片数量分布 · GitHub 风格</p>
      </div>
      <div class="header-right">
        <span v-if="scanning" class="badge badge-scanning">
          <span class="spinner"></span> 扫描中...
        </span>
        <span v-else-if="status?.lastScan" class="badge badge-ok">
          上次扫描: {{ new Date(status!.lastScan!).toLocaleString('zh-CN') }}
        </span>
        <span v-else class="badge badge-warn">等待首次扫描</span>
        <button class="btn-rescan" @click="handleRescan" :disabled="scanning || loading">
          ↻ 重新扫描
        </button>
      </div>
    </header>

    <!-- 总览数据 -->
    <div v-if="stats && !loading" class="overview-bar">
      共 <strong>{{ stats.totalPhotos.toLocaleString() }}</strong> 张照片，
      覆盖 <strong>{{ stats.totalDays }}</strong> 天
    </div>

    <!-- 扫描进度 -->
    <div v-if="scanning && status" class="scan-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: status.progress + '%' }"></div>
      </div>
      <span class="progress-text">{{ status.progress }}%</span>
      <span class="progress-detail" v-if="status.scanPaths.length">
        路径: {{ status.scanPaths.join(', ') }}
      </span>
    </div>

    <!-- 错误 -->
    <div v-if="error" class="error-box">
      ⚠️ {{ error }}
    </div>

    <!-- 加载骨架 -->
    <div v-if="loading && !stats" class="skeleton">
      <div class="skeleton-bar"></div>
      <div class="skeleton-grid">
        <div v-for="i in 20" :key="i" class="skeleton-row">
          <div v-for="j in 7" :key="j" class="skeleton-cell"></div>
        </div>
      </div>
    </div>

    <!-- 热力图 -->
    <div v-else-if="stats" class="heatmap-section">
      <PhotoHeatmap
        :data="stats.dailyStats"
        @range-change="handleRangeChange"
      />
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && !scanning && !error" class="empty">
      <p>还没有数据，点击「重新扫描」开始扫描。</p>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <span>飞牛照片热力图 v1.0</span>
      <a href="/api/health" target="_blank" class="health-link">健康检查</a>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.title { font-size: 22px; margin: 0; color: #f0f6fc; }
.subtitle { font-size: 13px; color: #8b949e; margin: 4px 0 0; }

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.badge-scanning { background: #1a3a1a; color: #39d353; }
.badge-ok { background: #162033; color: #58a6ff; }
.badge-warn { background: #332b00; color: #d29922; }

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid #39d353;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
  margin-right: 4px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.btn-rescan {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-rescan:hover:not(:disabled) { background: #30363d; }
.btn-rescan:disabled { opacity: 0.5; cursor: not-allowed; }

.overview-bar {
  font-size: 13px;
  color: #8b949e;
  margin-bottom: 16px;
}
.overview-bar strong { color: #f0f6fc; }

.scan-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px;
  background: #161b22;
  border-radius: 8px;
  border: 1px solid #30363d;
}
.progress-bar {
  flex: 1;
  height: 8px;
  background: #21262d;
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #0e4429, #39d353);
  border-radius: 4px;
  transition: width 0.5s;
}
.progress-text { font-size: 13px; color: #39d353; font-weight: 600; min-width: 36px; }
.progress-detail { font-size: 11px; color: #8b949e; }

.error-box {
  background: #2d1215;
  border: 1px solid #da3633;
  color: #ffa198;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

/* Skeleton */
.skeleton { margin-bottom: 20px; }
.skeleton-bar {
  height: 20px;
  width: 40%;
  background: #21262d;
  border-radius: 4px;
  margin-bottom: 16px;
  animation: pulse 1.5s infinite;
}
.skeleton-grid { display: flex; gap: 3px; }
.skeleton-row { display: flex; flex-direction: column; gap: 3px; }
.skeleton-cell {
  width: 12px;
  height: 12px;
  background: #21262d;
  border-radius: 2px;
  animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }

.heatmap-section {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 12px 20px;
}

.empty {
  text-align: center;
  padding: 60px 20px;
  color: #8b949e;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid #21262d;
  font-size: 12px;
  color: #484f58;
}
.health-link { color: #58a6ff; text-decoration: none; }
.health-link:hover { text-decoration: underline; }
</style>
