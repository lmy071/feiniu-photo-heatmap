import { ref, computed } from 'vue'
import type { DailyPhotoCount, Period, StatsData } from '../types'
import { fetchPhotoData } from '../api/photos'

function generateDemoData(): DailyPhotoCount[] {
  const photos: DailyPhotoCount[] = []
  const now = new Date()
  const startDate = new Date(now.getFullYear() - 2, 0, 1)

  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    const month = d.getMonth()
    let baseProb = 0.3

    if (dayOfWeek === 0 || dayOfWeek === 6) baseProb += 0.25
    if ([1, 2, 5, 10].includes(month)) baseProb += 0.15
    if ([6, 7, 8].includes(month)) baseProb += 0.1

    if (Math.random() < baseProb) {
      const count = Math.floor(Math.random() * Math.random() * 25) + 1
      photos.push({
        date: new Date(d).toISOString().split('T')[0],
        count,
      })
    }
  }

  return photos
}

export function usePhotoData() {
  const allData = ref<DailyPhotoCount[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isDemo = ref(false)
  const currentPeriod = ref<Period>('year')

  const filteredData = computed(() => {
    const data = allData.value
    const period = currentPeriod.value
    const now = new Date()

    switch (period) {
      case 'year': {
        const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        return data.filter((d) => new Date(d.date) >= start)
      }
      case 'all':
        return data
      default: {
        const yr = parseInt(period)
        if (isNaN(yr)) return data
        const s = new Date(yr, 0, 1)
        const e = new Date(yr, 11, 31)
        return data.filter((d) => {
          const dt = new Date(d.date)
          return dt >= s && dt <= e
        })
      }
    }
  })

  const stats = computed<StatsData>(() => {
    const data = filteredData.value
    if (!data || data.length === 0) {
      return { totalPhotos: 0, photoDays: 0, maxPhotos: 0, avgPhotos: 0, maxDate: '-' }
    }
    const total = data.reduce((s, i) => s + i.count, 0)
    const days = data.length
    const maxItem = data.reduce((m, i) => (i.count > m.count ? i : m), { count: 0, date: '-' })
    return {
      totalPhotos: total,
      photoDays: days,
      maxPhotos: maxItem.count,
      avgPhotos: parseFloat((total / days).toFixed(1)),
      maxDate: maxItem.date,
    }
  })

  async function loadData(period: Period) {
    currentPeriod.value = period
    error.value = null

    if (allData.value.length === 0) {
      loading.value = true
      try {
        const result = await fetchPhotoData()
        allData.value = result.data
        isDemo.value = result.demo
      } catch (e) {
        // API 不可用时降级到演示数据
        console.warn('[热力图] API不可用，使用演示数据:', e instanceof Error ? e.message : String(e))
        allData.value = generateDemoData()
        isDemo.value = true
      } finally {
        loading.value = false
      }
    }
  }

  function refresh() {
    allData.value = []
    isDemo.value = false
    error.value = null
    loadData(currentPeriod.value)
  }

  return {
    allData,
    filteredData,
    stats,
    loading,
    error,
    isDemo,
    currentPeriod,
    loadData,
    refresh,
  }
}
