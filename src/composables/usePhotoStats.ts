import { ref } from 'vue'
import axios from 'axios'
import type { PhotoStats } from '../types/photo'

export function usePhotoStats() {
  const stats = ref<PhotoStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchStats = async (startDate?: string, endDate?: string) => {
    loading.value = true
    error.value = null

    try {
      const params: Record<string, string> = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const response = await axios.get<PhotoStats>('/api/photos/stats', { params })
      stats.value = response.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        error.value = err.response?.data?.message || err.message
      } else {
        error.value = '获取照片数据失败'
      }
      console.error('Failed to fetch photo stats:', err)
    } finally {
      loading.value = false
    }
  }

  const setDateRange = (startDate: string, endDate: string) => {
    fetchStats(startDate, endDate)
  }

  return {
    stats,
    loading,
    error,
    fetchStats,
    setDateRange
  }
}
