export interface DailyStat {
  date: string  // 格式: yyyy-MM-dd
  count: number // 该日照片数量
}

export interface PhotoStats {
  totalPhotos: number  // 总照片数
  totalDays: number    // 有照片的天数
  dailyStats: DailyStat[]
}

export interface PhotoAlbumConfig {
  baseUrl: string      // 飞牛 NAS 的 URL
  username: string      // 用户名
  password: string      // 密码
  albumPath: string     // 相册路径，默认为 "/photos"
}
