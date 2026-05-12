import type { ApiResponse, DailyPhotoCount } from '../types'

const API_BASE = '/api'

export async function fetchPhotoData(): Promise<{ data: DailyPhotoCount[]; demo: boolean }> {
  const response = await fetch(`${API_BASE}/photos`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`)
  }

  const result: ApiResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || '未知错误')
  }

  return {
    data: result.data ?? [],
    demo: result.demo ?? false,
  }
}
