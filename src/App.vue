<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PhotoHeatmap from './components/PhotoHeatmap.vue'
import { usePhotoStats } from './composables/usePhotoStats'

const { stats, loading, error, fetchStats, setDateRange } = usePhotoStats()

const dateRange = ref({
  startDate: '',
  endDate: ''
})

const handleRangeChange = (range: { startDate: string; endDate: string }) => {
  dateRange.value = range
  setDateRange(range.startDate, range.endDate)
}

onMounted(async () => {
  await fetchStats()
})
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>📸 飞牛相册照片热力图</h1>
      <p>查看每日照片数量分布，类似 GitHub 提交热力图</p>
    </header>

    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>正在加载照片数据...</p>
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else-if="stats">
      <div class="stats-bar">
        <div class="total">
          共 <strong>{{ stats.totalPhotos.toLocaleString() }}</strong> 张照片，
          覆盖 <strong>{{ stats.totalDays }}</strong> 天
        </div>
        <div class="legend">
          <span>少</span>
          <div class="legend-box" style="background-color: #0e4429;"></div>
          <div class="legend-box" style="background-color: #006d32;"></div>
          <div class="legend-box" style="background-color: #26a641;"></div>
          <div class="legend-box" style="background-color: #39d353;"></div>
          <div class="legend-box" style="background-color: #57ab5a;"></div>
          <span>多</span>
        </div>
      </div>

      <PhotoHeatmap 
        :data="stats.dailyStats" 
        :on-range-change="handleRangeChange"
      />
    </div>
  </div>
</template>

<style scoped>
</style>
