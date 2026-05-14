export interface DailyStat {
  date: string   // yyyy-MM-dd
  count: number
}

export interface PhotoStats {
  totalPhotos: number
  totalDays: number
  dailyStats: DailyStat[]
  lastScan: number
}

export interface ScanStatus {
  scanning: boolean
  progress: number
  lastScan: string | null
  totalPhotos: number
  totalDays: number
  scanPaths: string[]
  lastError: string | null
}
