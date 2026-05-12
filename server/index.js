import express from '"'"'express'"'"'
import cors from '"'"'cors'"'"'
import { createClient } from '"'"'webdav'"'"'
import { readFileSync } from '"'"'fs'"'"'
import { join, dirname } from '"'"'path'"'"'
import { fileURLToPath } from '"'"'url'"'"'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 加载环境变量
try {
  const envPath = join(__dirname, '"'"'.env'"'"')
  const envContent = readFileSync(envPath, '"'"'utf-8'"'"')
  envContent.split('"'"'\n'"'"').forEach(line => {
    const [key, ...valueParts] = line.split('"'"'='"'"')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('"'"'='"'"').trim()
    }
  })
} catch (e) {
  // .env 文件不存在，使用默认值
}

// 默认配置
const CONFIG = {
  FEINIU_URL: process.env.FEINIU_URL || '"'"'http://your-fnOS-url:3000'"'"',
  FEINIU_USERNAME: process.env.FEINIU_USERNAME || '"'"'admin'"'"',
  FEINIU_PASSWORD: process.env.FEINIU_PASSWORD || '"'"'password'"'"',
  ALBUM_PATH: process.env.ALBUM_PATH || '"'"'/photos'"'"',
  PORT: process.env.PORT || 3000,
  CACHE_DURATION: 1000 * 60 * 30 // 30 分钟缓存
}

// 创建 Express 应用
const app = express()
app.use(cors())
app.use(express.json())

// 照片数据缓存
let photoStatsCache = {
  data: null,
  timestamp: 0
}

// 创建 WebDAV 客户端
const createWebDAVClient = () => {
  return createClient(CONFIG.FEINIU_URL, {
    username: CONFIG.FEINIU_USERNAME,
    password: CONFIG.FEINIU_PASSWORD
  })
}

// 获取目录中所有照片文件
async function getAllPhotos(client, dirPath = '"'"'/'"'"') {
  const photos = []
  
  try {
    const items = await client.getDirectoryContents(dirPath, { deep: true })
    
    for (const item of items) {
      if (item.type === '"'"'file'"'"') {
        const filename = item.basename.toLowerCase()
        // 检查是否为图片文件
        if (/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|raw|arw|cr2|nef|dng)$/.test(filename)) {
          photos.push({
            filename: item.basename,
            path: item.filename,
            lastModified: item.lastmod ? new Date(item.lastmod) : new Date(),
            size: item.size || 0
          })
        }
      }
    }
  } catch (err) {
    console.error(''"'"'Error getting photos from'"'"', dirPath, err)
    throw err
  }
  
  return photos
}

// 统计每日照片数量
function calculateDailyStats(photos) {
  const dailyMap = new Map()
  
  photos.forEach(photo => {
    const date = photo.lastModified.toISOString().split('"'"'T'"'"')[0]
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
  })
  
  const dailyStats = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  return dailyStats
}

// API: 获取照片统计
app.get('"'"'/api/photos/stats'"'"', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    // 检查缓存
    if (photoStatsCache.data && 
        Date.now() - photoStatsCache.timestamp < CONFIG.CACHE_DURATION) {
      let data = photoStatsCache.data
      
      // 如果指定了日期范围，过滤数据
      if (startDate || endDate) {
        data = {
          ...data,
          dailyStats: data.dailyStats.filter(stat => {
            if (startDate && stat.date < startDate) return false
            if (endDate && stat.date > endDate) return false
            return true
          })
        }
      }
      
      return res.json(data)
    }
    
    console.log(''"'"'Fetching photos from WebDAV server...'"'"')
    const client = createWebDAVClient()
    const photos = await getAllPhotos(client, CONFIG.ALBUM_PATH)
    
    const dailyStats = calculateDailyStats(photos)
    
    const result = {
      totalPhotos: photos.length,
      totalDays: dailyStats.length,
      dailyStats
    }
    
    // 更新缓存
    photoStatsCache = {
      data: result,
      timestamp: Date.now()
    }
    
    console.log(''"'"'Photos fetched successfully:'"'"', photos.length)
    res.json(result)
  } catch (err) {
    console.error(''"'"'API Error:'"'"', err)
    res.status(500).json({
      message: '"'"'获取照片数据失败'"'"',
      error: err.message
    })
  }
})

// API: 健康检查
app.get('"'"'/api/health'"'"', (req, res) => {
  res.json({ status: '"'"'ok'"'"', timestamp: new Date().toISOString() })
})

// 启动服务器
app.listen(CONFIG.PORT, () => {
  console.log(''"'"'Server running on port'"'"', CONFIG.PORT)
  console.log(''"'"'Configured Feiniu URL:'"'"', CONFIG.FEINIU_URL)
  console.log(''"'"'Album path:'"'"', CONFIG.ALBUM_PATH)
})
