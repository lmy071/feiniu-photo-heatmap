<script setup lang="ts">
import { computed, ref } from 'vue'
import { format, subDays, startOfWeek, eachDayOfInterval, getDay, addDays, startOfYear, endOfYear } from 'date-fns'
import type { DailyStat } from '../types/photo'

const props = defineProps<{
  data: DailyStat[]
}>()

const emit = defineEmits<{
  rangeChange: [start: string, end: string]
}>()

// ── 配置 ──
const CELL_SIZE = 13
const CELL_GAP = 3
const LABEL_HEIGHT = 22
const SIDE_MARGIN = 40

const COLORS = [
  '#161b22',  // 0
  '#0e4429',  // 1-3
  '#006d32',  // 4-10
  '#26a641',  // 11-25
  '#39d353',  // 26-50
  '#57ab5a',  // 51+
]

function getColor(count: number): string {
  if (count === 0) return COLORS[0]
  if (count <= 3) return COLORS[1]
  if (count <= 10) return COLORS[2]
  if (count <= 25) return COLORS[3]
  if (count <= 50) return COLORS[4]
  return COLORS[5]
}

// ── 视图控制 ──
const viewYear = ref(new Date().getFullYear())
const availableYears = computed(() => {
  if (!props.data.length) return [new Date().getFullYear()]
  const years = new Set<number>()
  for (const d of props.data) years.add(parseInt(d.date.slice(0, 4)))
  return Array.from(years).sort((a, b) => b - a) // 降序
})

function goPrevYear() {
  const min = Math.min(...availableYears.value)
  if (viewYear.value > min) viewYear.value--
  updateRange()
}

function goNextYear() {
  const max = Math.max(...availableYears.value)
  if (viewYear.value < max) viewYear.value++
  updateRange()
}

function goYear(y: number) {
  viewYear.value = y
  updateRange()
}

// 取该年数据
const yearData = computed(() => {
  const prefix = String(viewYear.value)
  return props.data.filter(d => d.date.startsWith(prefix))
})

const countMap = computed(() => {
  const m = new Map<string, number>()
  for (const d of yearData.value) m.set(d.date, d.count)
  return m
})

// ── 网格生成 ──
function getYearStart(y: number) {
  const d = startOfYear(new Date(y, 0, 1))
  return startOfWeek(d, { weekStartsOn: 0 })
}

function getYearEnd(y: number) {
  return endOfYear(new Date(y, 11, 31))
}

const grid = computed(() => {
  const start = getYearStart(viewYear.value)
  const end = getYearEnd(viewYear.value)
  const days = eachDayOfInterval({ start, end })

  const weeks: { date: Date; count: number; ds: string }[][] = []
  let cur: { date: Date; count: number; ds: string }[] = []

  for (const day of days) {
    const ds = format(day, 'yyyy-MM-dd')
    const count = countMap.value.get(ds) || 0
    cur.push({ date: day, count, ds })

    if (getDay(day) === 6) {
      weeks.push(cur)
      cur = []
    }
  }
  if (cur.length) weeks.push(cur)

  return weeks
})

// ── 月份标签 ──
const monthLabels = computed(() => {
  const labels: { text: string; x: number }[] = []
  let last = -1

  for (let wi = 0; wi < grid.value.length; wi++) {
    const firstDay = grid.value[wi][0].date
    const m = firstDay.getMonth()
    if (m !== last) {
      labels.push({
        text: format(firstDay.date, 'MMM'),
        x: wi * (CELL_SIZE + CELL_GAP),
      })
      last = m
    }
  }
  return labels
})

// ── SVG 尺寸 ──
const svgW = computed(() => grid.value.length * (CELL_SIZE + CELL_GAP) + SIDE_MARGIN)
const svgH = 7 * (CELL_SIZE + CELL_GAP) + LABEL_HEIGHT + 30

// ── Tooltip ──
const tip = ref({ show: false, x: 0, y: 0, date: '', count: 0 })

function showTip(e: MouseEvent, day: { date: Date; count: number; ds: string }) {
  tip.value = {
    show: true,
    x: e.clientX,
    y: e.clientY,
    date: format(day.date, 'yyyy年MM月dd日'),
    count: day.count,
  }
}

function hideTip() { tip.value.show = false }

// ── 范围更新 ──
function updateRange() {
  const y = viewYear.value
  const start = `${y}-01-01`
  const end = `${y}-12-31`
  emit('rangeChange', start, end)
}

// 初始化时触发
updateRange()

// ── 统计数据 ──
const yearSummary = computed(() => {
  const data = yearData.value
  const total = data.reduce((s, d) => s + d.count, 0)
  const days = data.filter(d => d.count > 0).length
  const max = data.reduce((m, d) => Math.max(m, d.count), 0)
  const avg = days > 0 ? Math.round(total / days) : 0
  return { total, days, max, avg }
})
</script>

<template>
  <div class="heatmap-wrap">
    <!-- 年份导航 -->
    <div class="year-nav">
      <button class="btn-icon" @click="goPrevYear" :disabled="viewYear <= Math.min(...availableYears)">‹</button>
      <div class="year-select">
        <span class="year-label">{{ viewYear }}</span>
        <div class="year-dropdown">
          <button v-for="y in availableYears" :key="y" :class="{ active: y === viewYear }" @click="goYear(y)">{{ y }}</button>
        </div>
      </div>
      <button class="btn-icon" @click="goNextYear" :disabled="viewYear >= Math.max(...availableYears)">›</button>
    </div>

    <!-- 年度汇总 -->
    <div class="summary-row">
      <span class="summary-item">📷 {{ yearSummary.total }} 张</span>
      <span class="summary-item">📅 {{ yearSummary.days }} 天有照片</span>
      <span class="summary-item">🔥 日均 {{ yearSummary.avg }} 张</span>
      <span class="summary-item">🏆 单日最多 {{ yearSummary.max }} 张</span>
    </div>

    <!-- 热力图 -->
    <div class="heatmap-scroll">
      <svg :width="svgW" :height="svgH" class="heatmap-svg">
        <!-- 月份 -->
        <g :transform="`translate(${SIDE_MARGIN}, 0)`">
          <text v-for="l in monthLabels" :key="l.text + l.x"
            :x="l.x" y="12" class="month-label">{{ l.text }}</text>
        </g>

        <!-- 星期 -->
        <g :transform="`translate(${SIDE_MARGIN}, ${LABEL_HEIGHT})`">
          <text v-for="i in [0,2,4,6]" :key="i"
            x="-6" :y="i * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2"
            class="day-label">{{ ['日','一','二','三','四','五','六'][i] }}</text>
        </g>

        <!-- 格子 -->
        <g :transform="`translate(${SIDE_MARGIN}, ${LABEL_HEIGHT})`">
          <g v-for="(week, wi) in grid" :key="wi"
            :transform="`translate(${wi * (CELL_SIZE + CELL_GAP)}, 0)`">
            <rect v-for="day in week" :key="day.ds"
              x="0" :y="getDay(day.date) * (CELL_SIZE + CELL_GAP)"
              :width="CELL_SIZE" :height="CELL_SIZE"
              :fill="getColor(day.count)" rx="2" class="cell"
              @mouseenter="showTip($event, day)" @mouseleave="hideTip"
            />
          </g>
        </g>
      </svg>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <span>少</span>
      <span v-for="c in COLORS" :key="c" class="legend-cell" :style="{ background: c }"></span>
      <span>多</span>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div v-if="tip.show" class="tooltip" :style="{ left: tip.x + 12 + 'px', top: tip.y - 10 + 'px' }">
        <div class="tip-date">{{ tip.date }}</div>
        <div class="tip-count">{{ tip.count }} 张照片</div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.heatmap-wrap {
  padding: 16px 0;
}

.year-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.btn-icon {
  background: none;
  border: 1px solid #30363d;
  color: #c9d1d9;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.btn-icon:hover:not(:disabled) { background: #21262d; }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }

.year-select { position: relative; }
.year-label {
  font-size: 20px;
  font-weight: 600;
  color: #f0f6fc;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 6px;
}
.year-label:hover { background: #21262d; }

.year-dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
}
.year-select:hover .year-dropdown { display: flex; flex-direction: column; }
.year-dropdown button {
  background: none;
  border: none;
  color: #c9d1d9;
  padding: 6px 16px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
}
.year-dropdown button:hover { background: #21262d; }
.year-dropdown button.active { color: #39d353; font-weight: 600; }

.summary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}
.summary-item {
  font-size: 13px;
  color: #8b949e;
}

.heatmap-scroll { overflow-x: auto; }

.heatmap-svg { display: block; }

.month-label { font-size: 10px; fill: #8b949e; }
.day-label { font-size: 9px; fill: #8b949e; text-anchor: end; }

.cell { cursor: pointer; transition: opacity 0.15s; }
.cell:hover { opacity: 0.7; stroke: #f0f6fc; stroke-width: 1; }

.legend {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 12px;
  font-size: 11px;
  color: #8b949e;
}
.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.tooltip {
  position: fixed;
  background: #1c2128;
  border: 1px solid #444c56;
  border-radius: 6px;
  padding: 8px 14px;
  pointer-events: none;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  white-space: nowrap;
  transform: translateY(-100%);
}
.tip-date { font-size: 12px; color: #adbac7; margin-bottom: 2px; }
.tip-count { font-size: 14px; color: #f0f6fc; font-weight: 600; }
</style>
