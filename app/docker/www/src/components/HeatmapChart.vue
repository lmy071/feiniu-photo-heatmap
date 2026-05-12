<template>
  <div class="heatmap-wrapper">
    <div v-if="loading" class="loading">正在加载相册数据...</div>
    <div v-else-if="error" class="error">
      <p>⚠️ 加载数据失败</p>
      <p class="error-detail">{{ error }}</p>
    </div>
    <div v-else ref="heatmapRef" class="heatmap-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import CalHeatmap from 'cal-heatmap'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import type { DailyPhotoCount, Period } from '../types'

const props = defineProps<{
  data: DailyPhotoCount[]
  period: Period
  loading: boolean
  error: string | null
}>()

const heatmapRef = ref<HTMLElement | null>(null)
let calInstance: CalHeatmap | null = null

function renderHeatmap() {
  if (!heatmapRef.value || props.data.length === 0) return

  // Destroy previous instance
  if (calInstance) {
    try {
      calInstance.destroy()
    } catch {
      // ignore
    }
    calInstance = null
  }

  // Clear container
  heatmapRef.value.innerHTML = ''

  // Determine date range
  let startDt: Date
  let endDt: Date

  if (props.period === 'year') {
    startDt = new Date()
    startDt.setFullYear(startDt.getFullYear() - 1)
    endDt = new Date()
  } else if (props.period === 'all') {
    const dates = props.data.map((d) => new Date(d.date)).sort((a, b) => a.getTime() - b.getTime())
    startDt = dates[0] ?? new Date()
    endDt = dates[dates.length - 1] ?? new Date()
  } else {
    const yr = parseInt(props.period)
    startDt = new Date(yr, 0, 1)
    endDt = new Date(yr, 11, 31)
  }

  const rangeMonths = Math.ceil((endDt.getTime() - startDt.getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1

  // Build data as array of { date, count } for CalHeatmap
  const dataSource = props.data.map((item) => ({
    date: item.date,
    value: item.count,
  }))

  calInstance = new CalHeatmap()

  // Plugins must be passed as second argument to paint()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(calInstance as any).paint(
    {
      data: {
        source: dataSource,
        type: 'json',
        x: 'date',
        y: 'value',
        groupY: 'max',
      },
      date: { start: startDt, end: endDt },
      range: rangeMonths,
      domain: {
        type: 'month',
        gutter: 4,
        label: { text: 'MMM', textAlign: 'start', position: 'top' },
      },
      subDomain: {
        type: 'day',
        gutter: 3,
        width: 12,
        height: 12,
        label: '',
      },
      scale: {
        color: {
          type: 'threshold',
          range: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
          domain: [1, 3, 6, 10],
        },
      },
      itemSelector: heatmapRef.value,
    },
    [
      [
        Tooltip,
        {
          text: function (date: Date, value: number | null) {
            const y = date.getFullYear()
            const m = String(date.getMonth() + 1).padStart(2, '0')
            const d = String(date.getDate()).padStart(2, '0')
            return `${y}年${m}月${d}日: ${value || 0} 张照片`
          },
        },
      ],
    ]
  )
}

// Watch for data/period changes
watch(
  () => [props.data, props.period, props.loading],
  async () => {
    if (!props.loading && !props.error && props.data.length > 0) {
      await nextTick()
      renderHeatmap()
    }
  },
  { deep: true }
)

onMounted(() => {
  if (!props.loading && !props.error && props.data.length > 0) {
    renderHeatmap()
  }
})

onBeforeUnmount(() => {
  if (calInstance) {
    try {
      calInstance.destroy()
    } catch {
      // ignore
    }
  }
})
</script>

<style scoped>
.heatmap-wrapper {
  margin-top: 30px;
  overflow-x: auto;
}

.heatmap-container {
  min-height: 200px;
  width: 100%;
}

.loading {
  text-align: center;
  padding: 60px;
  color: #999;
  font-size: 18px;
}

.error {
  text-align: center;
  padding: 60px;
  color: #e74c3c;
  font-size: 16px;
}

.error-detail {
  margin-top: 10px;
  color: #999;
  font-size: 14px;
}

.heatmap-container :deep(.graph-label) {
  fill: #666;
  font-size: 12px;
}

.heatmap-container :deep(.graph-rect) {
  stroke: white;
  stroke-width: 1px;
  rx: 2;
  ry: 2;
}
</style>
