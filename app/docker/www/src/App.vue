<template>
  <div class="container">
    <h1>
      📸 飞牛相册热力图
      <span v-if="isDemo" class="demo-badge">演示模式</span>
    </h1>
    <p class="subtitle">展示每日照片数量，类似GitHub贡献图</p>

    <PeriodSelector v-model="currentPeriod" @update:modelValue="handlePeriodChange" @refresh="handleRefresh" />

    <div class="stats">
      <StatCard title="总照片数" :value="stats.totalPhotos" />
      <StatCard title="有照片天数" :value="stats.photoDays" />
      <StatCard title="最多照片日" :value="stats.maxPhotos" />
      <StatCard title="日均照片" :value="stats.avgPhotos" />
    </div>

    <HeatmapChart
      :data="filteredData"
      :period="currentPeriod"
      :loading="loading"
      :error="error"
    />

    <div class="footer">
      数据来源：飞牛NAS相册 | 最后更新：{{ lastUpdate }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PeriodSelector from './components/PeriodSelector.vue'
import StatCard from './components/StatCard.vue'
import HeatmapChart from './components/HeatmapChart.vue'
import { usePhotoData } from './composables/usePhotoData'
import type { Period } from './types'

const { filteredData, stats, loading, error, isDemo, currentPeriod, loadData, refresh } = usePhotoData()

const lastUpdate = ref('-')

function handlePeriodChange(period: Period) {
  loadData(period)
  lastUpdate.value = new Date().toLocaleString('zh-CN')
}

function handleRefresh() {
  refresh()
  lastUpdate.value = new Date().toLocaleString('zh-CN')
}

onMounted(() => {
  loadData('year')
  lastUpdate.value = new Date().toLocaleString('zh-CN')
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
    sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

h1 {
  color: #333;
  margin-bottom: 10px;
  font-size: 32px;
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
}

.demo-badge {
  display: inline-block;
  background: #f39c12;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
  vertical-align: middle;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.footer {
  margin-top: 40px;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
