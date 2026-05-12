<script setup lang="ts">
import { computed, ref } from 'vue'
import { format, subDays, startOfWeek, eachDayOfInterval, getDay } from 'date-fns'
import type { DailyStat } from '../types/photo'

interface Props {
  data: DailyStat[]
  onRangeChange?: (range: { startDate: string; endDate: string }) => void
}

const props = defineProps<Props>()

const CELL_SIZE = 12
const CELL_GAP = 3
const MONTH_LABEL_HEIGHT = 20

const COLORS = [
  '#161b22',
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
  '#57ab5a'
]

const getColor = (count: number): string => {
  if (count === 0) return COLORS[0]
  if (count <= 3) return COLORS[1]
  if (count <= 10) return COLORS[2]
  if (count <= 25) return COLORS[3]
  if (count <= 50) return COLORS[4]
  return COLORS[5]
}

const generateGrid = computed(() => {
  const today = new Date()
  const oneYearAgo = subDays(today, 364)
  const startDate = startOfWeek(oneYearAgo, { weekStartsOn: 0 })
  
  const days = eachDayOfInterval({ start: startDate, end: today })
  
  const weeks: { date: Date; count: number; dayStr: string }[][] = []
  let currentWeek: { date: Date; count: number; dayStr: string }[] = []
  
  days.forEach((day, index) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const stat = props.data.find(s => s.date === dayStr)
    const count = stat?.count || 0
    
    currentWeek.push({ date: day, count, dayStr })
    
    if (getDay(day) === 6 || index === days.length - 1) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  
  return weeks
})

const monthLabels = computed(() => {
  const labels: { month: string; offset: number }[] = []
  const weeks = generateGrid.value
  let lastMonth = -1
  
  weeks.forEach((week, weekIndex) => {
    const firstDay = week[0]
    const month = firstDay.date.getMonth()
    
    if (month !== lastMonth) {
      labels.push({
        month: format(firstDay.date, 'MMM'),
        offset: weekIndex * (CELL_SIZE + CELL_GAP)
      })
      lastMonth = month
    }
  })
  
  return labels
})

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const tooltip = ref<{ show: boolean; x: number; y: number; date: string; count: number }>({
  show: false,
  x: 0,
  y: 0,
  date: '',
  count: 0
})

const showTooltip = (event: MouseEvent, day: { date: Date; count: number; dayStr: string }) => {
  tooltip.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    date: format(day.date, 'yyyy年MM月dd日'),
    count: day.count
  }
}

const hideTooltip = () => {
  tooltip.value.show = false
}

const svgWidth = computed(() => generateGrid.value.length * (CELL_SIZE + CELL_GAP) + 50)
const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + MONTH_LABEL_HEIGHT + 20
</script>

<template>
  <div class="heatmap-container">
    <svg 
      :width="svgWidth" 
      :height="svgHeight" 
      class="heatmap-svg"
    >
      <g :transform="`translate(30, ${MONTH_LABEL_HEIGHT})`">
        <text
          v-for="label in monthLabels"
          :key="label.month + label.offset"
          :x="label.offset"
          y="0"
          class="month-label"
        >
          {{ label.month }}
        </text>
      </g>
      
      <g :transform="`translate(30, ${MONTH_LABEL_HEIGHT + 10})`">
        <g class="week-labels">
          <text
            v-for="(day, index) in weekDays"
            :key="day"
            x="-5"
            :y="index * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 2"
            class="day-label"
            :style="{ opacity: index % 2 === 1 ? 1 : 0 }"
          >
            {{ day }}
          </text>
        </g>
        
        <g class="cells">
          <g
            v-for="(week, weekIndex) in generateGrid"
            :key="weekIndex"
            :transform="`translate(${weekIndex * (CELL_SIZE + CELL_GAP)}, 0)`"
          >
            <rect
              v-for="day in week"
              :key="day.dayStr"
              x="0"
              :y="getDay(day.date) * (CELL_SIZE + CELL_GAP)"
              :width="CELL_SIZE"
              :height="CELL_SIZE"
              :fill="getColor(day.count)"
              rx="2"
              class="cell"
              @mouseenter="showTooltip($event, day)"
              @mouseleave="hideTooltip"
            />
          </g>
        </g>
      </g>
    </svg>
    
    <div
      v-if="tooltip.show"
      class="tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tooltip-date">{{ tooltip.date }}</div>
      <div class="tooltip-count">
        <strong>{{ tooltip.count }}</strong> 张照片
      </div>
    </div>
  </div>
</template>

<style scoped>
.heatmap-container {
  overflow-x: auto;
  padding: 20px 0;
}

.heatmap-svg {
  display: block;
}

.month-label {
  font-size: 10px;
  fill: #8b949e;
}

.day-label {
  font-size: 9px;
  fill: #8b949e;
  text-anchor: end;
}

.cell {
  cursor: pointer;
  transition: opacity 0.2s;
}

.cell:hover {
  opacity: 0.8;
}

.tooltip {
  position: fixed;
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.tooltip-date {
  font-size: 12px;
  color: #c9d1d9;
  margin-bottom: 4px;
}

.tooltip-count {
  font-size: 14px;
  color: #f0f6fc;
}

.tooltip-count strong {
  color: #39d353;
}
</style>
