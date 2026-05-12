export interface DailyPhotoCount {
  date: string   // YYYY-MM-DD
  count: number
}

export interface ApiResponse {
  success: boolean
  data: DailyPhotoCount[]
  demo?: boolean
  message?: string
  error?: string
}

export type Period = 'year' | 'all' | string  // string = year like '2024'

export interface StatsData {
  totalPhotos: number
  photoDays: number
  maxPhotos: number
  avgPhotos: number
  maxDate: string
}
