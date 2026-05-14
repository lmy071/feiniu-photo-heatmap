import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ──────── 配置 ──────────────────────────────────────────────────
dotenv.config({ path: path.join(__dirname, '.env') });

const CONFIG = {
  // 扫描路径（逗号分隔）
  SCAN_PATHS: (process.env.SCAN_PATHS || '/photos').split(',').map(s => s.trim()),
  PORT: parseInt(process.env.PORT || '3000', 10),
  CACHE_FILE: path.join(__dirname, 'photo-cache.json'),
  MIN_RESCAN_INTERVAL: 1000 * 60 * 5, // 5 分钟防抖
};

// ──────── 文件类型 ──────────────────────────────────────────────
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif']);
const LIVE_VIDEO_EXTS = new Set(['.mov']);

const isImage = (name) => IMAGE_EXTS.has(path.extname(name).toLowerCase());
const isLiveVideo = (name) => LIVE_VIDEO_EXTS.has(path.extname(name).toLowerCase());

/**
 * 基线名归一化：去掉扩展名，去掉编辑后缀变体
 *   IMG_1234-E.HEIC → img_1234
 *   IMG_1234_1.JPG  → img_1234
 *   IMG_1234.MOV    → img_1234
 */
function baseName(filename) {
  let name = path.basename(filename);
  name = name.slice(0, -path.extname(name).length);
  // 仅剥离已知编辑后缀: -E, _1 等短后缀
  name = name.replace(/[-_][Ee]$/, '').replace(/[-_][0-9]$/, '').replace(/-Edit$/i, '');
  return name.toLowerCase();
}

// ──────── 状态 ──────────────────────────────────────────────────
let scanState = { scanning: false, total: 0, done: 0, lastError: null };

/** 文件映射: path → { date, mtime, size, isLive } */
let fileDB = {};

/** 已计算的统计快照 */
let statsCache = null;
let lastScanTime = 0;

// ──────── 持久缓存 ─────────────────────────────────────────────

function loadCache() {
  try {
    if (!fs.existsSync(CONFIG.CACHE_FILE)) return false;
    const raw = fs.readFileSync(CONFIG.CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (data.version === 3) {
      fileDB = data.files || {};
      statsCache = data.stats || null;
      lastScanTime = data.lastScan || 0;
      console.log(`[Cache] 加载 ${Object.keys(fileDB).length} 条记录`);
      return true;
    }
  } catch (e) {
    console.warn('[Cache] 加载失败:', e.message);
  }
  return false;
}

function saveCache() {
  try {
    const dir = path.dirname(CONFIG.CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG.CACHE_FILE, JSON.stringify({
      version: 3,
      files: fileDB,
      stats: statsCache,
      lastScan: lastScanTime,
    }), 'utf-8');
  } catch (e) {
    console.error('[Cache] 保存失败:', e.message);
  }
}

// ──────── 扫描引擎 ─────────────────────────────────────────────

/**
 * 递归遍历目录，返回所有图片和 .mov 文件的绝对路径
 */
async function collectFiles(rootDir) {
  const result = [];

  async function walk(dir) {
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); }
    catch { return; }

    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === '@eaDir' || e.name === '#recycle') continue;
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) await walk(fp);
      else if (e.isFile()) {
        if (isImage(e.name) || isLiveVideo(e.name)) result.push(fp);
      }
    }
  }

  await walk(rootDir);
  return result;
}

/**
 * 获取文件日期（优先 birthtime，回退 mtime）
 */
async function fileDate(fp) {
  try {
    const s = await fsp.stat(fp);
    const ts = s.birthtimeMs || s.mtimeMs;
    const d = new Date(ts);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      mtime: s.mtimeMs,
      size: s.size,
    };
  } catch { return null; }
}

/**
 * 增量扫描：仅处理新增/变更/删除的文件
 */
async function doScan(scanPaths) {
  // 收集所有原始文件
  let raw = [];
  for (const sp of scanPaths) {
    if (!fs.existsSync(sp)) { console.warn(`[Scan] 路径不存在: ${sp}`); continue; }
    raw.push(...await collectFiles(sp));
  }

  scanState.total = raw.length;
  scanState.done = 0;

  // 增量处理
  const updated = { ...fileDB };
  let changed = 0;

  for (const fp of raw) {
    const old = fileDB[fp];
    let s;
    try { s = await fsp.stat(fp); } catch { continue; }
    const mtime = s.mtimeMs, size = s.size;

    if (old && old.mtime === mtime && old.size === size) {
      updated[fp] = old;
    } else {
      const info = await fileDate(fp);
      if (info) {
        updated[fp] = { date: info.date, mtime: info.mtime, size: info.size, isLive: false };
        changed++;
      }
    }
    scanState.done++;
  }

  // 清理已删除
  const diskSet = new Set(raw);
  for (const fp of Object.keys(updated)) {
    if (!diskSet.has(fp)) delete updated[fp];
  }

  // ── 实况照片检测 ──
  // 按目录分组，同目录下同基线名的图片+mov 配对
  const dirGroups = {};
  for (const fp of Object.keys(updated)) {
    const d = path.dirname(fp);
    if (!dirGroups[d]) dirGroups[d] = [];
    dirGroups[d].push(fp);
  }

  const liveImages = new Set();
  for (const fps of Object.values(dirGroups)) {
    const movBases = new Set(
      fps.filter(f => isLiveVideo(f)).map(f => baseName(f))
    );
    if (movBases.size === 0) continue;
    for (const fp of fps) {
      if (isImage(fp) && movBases.has(baseName(fp))) {
        liveImages.add(fp);
      }
    }
  }

  // 标记实况并过滤：只保留图片，移除所有 .mov
  const final = {};
  let liveCount = 0;
  for (const [fp, info] of Object.entries(updated)) {
    if (isLiveVideo(fp)) continue;               // .mov 不计入
    if (liveImages.has(fp)) {
      info.isLive = true;
      liveCount++;
    }
    final[fp] = info;
  }

  console.log(`[Scan] 照片 ${Object.keys(final).length} 张（含 ${liveCount} 个实况），${changed} 条变更`);
  return { files: final, liveCount };
}

// ──────── 统计计算 ─────────────────────────────────────────────

function computeStats(files) {
  const dayMap = new Map();
  for (const info of Object.values(files)) {
    dayMap.set(info.date, (dayMap.get(info.date) || 0) + 1);
  }
  const daily = Array.from(dayMap.entries())
    .map(([d, c]) => ({ date: d, count: c }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalPhotos: Object.keys(files).length,
    totalDays: daily.length,
    dailyStats: daily,
    lastScan: lastScanTime,
  };
}

// ──────── Express API ─────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// 前端静态文件
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) app.use(express.static(publicDir));

/** GET /api/photos/stats — 统计查询 */
app.get('/api/photos/stats', (req, res) => {
  if (!statsCache) {
    return res.status(503).json({
      message: '数据未就绪',
      scanning: scanState.scanning,
    });
  }

  const { startDate, endDate } = req.query;
  let data = statsCache;

  if (startDate || endDate) {
    const filtered = data.dailyStats.filter(s => {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      return true;
    });
    data = { ...data, dailyStats: filtered, totalDays: filtered.length };
  }

  res.json(data);
});

/** POST /api/photos/rescan — 触发扫描 */
app.post('/api/photos/rescan', async (req, res) => {
  if (scanState.scanning) return res.status(429).json({ message: '扫描中', scanning: true });

  if (lastScanTime > 0 && Date.now() - lastScanTime < CONFIG.MIN_RESCAN_INTERVAL) {
    return res.json({ message: '距上次扫描不足 5 分钟', skipped: true, lastScan: new Date(lastScanTime).toISOString() });
  }

  res.json({ message: '扫描已启动', scanning: true });

  scanState.scanning = true;
  scanState.lastError = null;

  try {
    const { files } = await doScan(CONFIG.SCAN_PATHS);
    fileDB = files;
    lastScanTime = Date.now();
    statsCache = computeStats(files);
    saveCache();
  } catch (e) {
    scanState.lastError = e.message;
    console.error('[Scan] 失败:', e);
  } finally {
    scanState.scanning = false;
  }
});

/** GET /api/photos/status — 扫描状态 */
app.get('/api/photos/status', (req, res) => {
  res.json({
    scanning: scanState.scanning,
    progress: scanState.total > 0 ? Math.round((scanState.done / scanState.total) * 100) : 0,
    lastScan: lastScanTime ? new Date(lastScanTime).toISOString() : null,
    totalPhotos: statsCache?.totalPhotos || 0,
    totalDays: statsCache?.totalDays || 0,
    scanPaths: CONFIG.SCAN_PATHS,
    lastError: scanState.lastError,
  });
});

/** GET /api/health */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cached: !!statsCache });
});

/** SPA fallback */
app.get('*', (req, res) => {
  const index = path.join(publicDir, 'index.html');
  if (fs.existsSync(index)) res.sendFile(index);
  else res.status(404).json({ error: 'frontend not built' });
});

// ──────── 启动 ─────────────────────────────────────────────────

async function startup() {
  const loaded = loadCache();
  if (loaded && statsCache) {
    console.log(`[Start] 缓存命中：${statsCache.totalPhotos} 张照片，${statsCache.totalDays} 天`);
  } else {
    console.log('[Start] 无缓存，后台扫描中...');
    scanState.scanning = true;
    doScan(CONFIG.SCAN_PATHS).then(({ files }) => {
      fileDB = files;
      lastScanTime = Date.now();
      statsCache = computeStats(files);
      saveCache();
    }).catch(e => {
      scanState.lastError = e.message;
      console.error('[Start] 初始扫描失败:', e);
    }).finally(() => { scanState.scanning = false; });
  }

  app.listen(CONFIG.PORT, () => {
    console.log(`[Server] http://localhost:${CONFIG.PORT}`);
    console.log(`[Server] 扫描路径: ${CONFIG.SCAN_PATHS.join(', ')}`);
  });
}

startup();
