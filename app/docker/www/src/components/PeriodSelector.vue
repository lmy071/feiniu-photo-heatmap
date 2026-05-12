<template>
  <div class="controls">
    <button
      v-for="p in periods"
      :key="p.value"
      :class="['btn', { active: modelValue === p.value }]"
      @click="$emit('update:modelValue', p.value)"
    >
      {{ p.label }}
    </button>
    <button class="btn" @click="$emit('refresh')">🔄 刷新</button>
  </div>
</template>

<script setup lang="ts">
import type { Period } from '../types'

interface PeriodOption {
  label: string
  value: Period
}

defineProps<{
  modelValue: Period
}>()

defineEmits<{
  'update:modelValue': [value: Period]
  refresh: []
}>()

const now = new Date()
const currentYear = now.getFullYear()

const periods: PeriodOption[] = [
  { label: '近一年', value: 'year' },
  { label: '全部', value: 'all' },
  { label: String(currentYear), value: String(currentYear) },
  { label: String(currentYear - 1), value: String(currentYear - 1) },
]
</script>

<style scoped>
.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #667eea;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn.active {
  background: #764ba2;
}
</style>
