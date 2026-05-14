import { ref, readonly } from 'vue'
import type { PhotoStats, ScanStatus } from '../types/photo'

const API_BASE = '/api'

export function usePhotoStats() {
  const stats = ref<PhotoStats | null>(null)
  const status = ref<ScanStatus | null>(null)
  const loading = ref(false)
  const scanning = ref(false)
  const error = ref<string | null>(null)

  async function fetchStats(startDate?: string, endDate?: string) {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const qs = params.toString()
      const res = await fetch(`${API_BASE}/photos/stats${qs ? '?' + qs : ''}`)

      if (!res.ok) {
        if (res.status === 503) throw new Error('数据正在准备中，请稍候...')
        throw new Error(`请求失败 (${res.status})`)
      }

      stats.value = await res.json()
    } catch (e: any) {
      error.value = e.message || '获取数据失败'
      console.error('[fetchStats]', e)
    } finally {
      loading.value = false
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch(`${API_BASE}/photos/status`)
      status.value = await res.json()
      scanning.value = status.value.scanning
    } catch {
      // 静默
    }
  }

  async function triggerRescan() {
    scanning.value = true
    error.value = null

    try {
      const res = await fetch(`${API_BASE}/photos/rescan`, { method: 'POST' })
      const data = await res.json()
      if (data.skipped) {
        scanning.value = false
        return
      }
      // 轮询等待扫描完成
      await pollUntilComplete()
      await fetchStats()
    } catch (e: any) {
      error.value = e.message || '触发扫描失败'
      scanning.value = false
    }
  }

  async function pollUntilComplete() {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 2000))
      try {
        const res = await fetch(`${API_BASE}/photos/status`)
        const s: ScanStatus = await res.json()
        status.value = s
        scanning.value = s.scanning

        if (!s.scanning) {
          if (s.lastError) error.value = s.lastError
          return
        }
      } catch {
        // 继续轮询
      }
    }
    // 超时
    scanning.value = false
    error.value = '扫描超时，请刷新页面重试'
  }

  return {
    stats: readonly(stats),
    status: readonly(status),
    loading: readonly(loading),
    scanning: readonly(scanning),
    error: readonly(error),
    fetchStats,
    fetchStatus,
    triggerRescan,
  }
}
