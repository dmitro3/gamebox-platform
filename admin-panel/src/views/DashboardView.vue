<template>
  <div>
    <div class="page-header"><h2>📊 数据看板</h2></div>

    <!-- KPI 卡片 -->
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="6" v-for="k in kpis" :key="k.label">
        <el-card shadow="never" class="kpi-card">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value" :style="{ color: k.color }">{{ k.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 待处理提醒 -->
    <el-row :gutter="16" style="margin-bottom:20px">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>⏳ 待处理事项</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="待审上分">
              <el-badge :value="stats?.pendingRecharge" type="danger" />
            </el-descriptions-item>
            <el-descriptions-item label="待审下分">
              <el-badge :value="stats?.pendingWithdraw" type="warning" />
            </el-descriptions-item>
          </el-descriptions>
          <div style="margin-top:12px;display:flex;gap:10px">
            <el-button type="primary" size="small" @click="$router.push('/recharge')">去审核</el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="never">
          <template #header><span>📅 今日概览</span></template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="新增玩家">{{ stats?.todayNew ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="活跃玩家">{{ stats?.activeToday ?? '—' }}</el-descriptions-item>
            <el-descriptions-item label="今日流水">{{ fmtNum(stats?.todayBetFlow) }}</el-descriptions-item>
            <el-descriptions-item label="今日盈亏">
              <span :style="{ color: (stats?.todayPnl ?? 0) >= 0 ? '#67c23a' : '#f56c6c' }">
                {{ fmtNum(stats?.todayPnl) }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <!-- 趋势图 -->
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span>📈 近期趋势</span>
          <el-radio-group v-model="days" size="small" @change="loadTrend">
            <el-radio-button :label="7">7 天</el-radio-button>
            <el-radio-button :label="30">30 天</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div ref="chartEl" style="height:320px" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { dashboardApi, type DashboardStats, type TrendPoint } from '@/api/admin'

const stats = ref<DashboardStats | null>(null)
const trend = ref<TrendPoint[]>([])
const days = ref<7 | 30>(7)
const chartEl = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const kpis = computed(() => [
  { label: '总玩家数', value: fmtNum(stats.value?.totalPlayers), color: '#409eff' },
  { label: '平台余额', value: fmtNum(stats.value?.platformBalance), color: '#d4a93c' },
  { label: '今日流水', value: fmtNum(stats.value?.todayBetFlow), color: '#9b59b6' },
  { label: '今日盈亏', value: fmtNum(stats.value?.todayPnl), color: (stats.value?.todayPnl ?? 0) >= 0 ? '#67c23a' : '#f56c6c' },
])

function fmtNum(n?: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('zh-CN')
}

function buildChart() {
  if (!chartEl.value) return
  if (!chart) chart = echarts.init(chartEl.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['投注流水', '平台盈亏', '新增用户'] },
    xAxis: { type: 'category', data: trend.value.map(t => t.date) },
    yAxis: [{ type: 'value', name: '积分' }, { type: 'value', name: '人数', position: 'right' }],
    series: [
      { name: '投注流水', type: 'bar', data: trend.value.map(t => t.betFlow), itemStyle: { color: '#9b59b6' } },
      { name: '平台盈亏', type: 'line', data: trend.value.map(t => t.pnl), itemStyle: { color: '#d4a93c' } },
      { name: '新增用户', type: 'line', yAxisIndex: 1, data: trend.value.map(t => t.newUsers), itemStyle: { color: '#67c23a' } },
    ],
  })
}

async function loadStats() {
  try { stats.value = await dashboardApi.stats() } catch { /* ignore */ }
}

async function loadTrend() {
  try {
    trend.value = await dashboardApi.trend(days.value)
    buildChart()
  } catch { /* ignore */ }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadTrend()])
  buildChart()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', () => chart?.resize())
})
</script>

<style scoped>
.kpi-card { text-align: center; }
.kpi-label { font-size: 12px; color: #909399; margin-bottom: 8px; }
.kpi-value { font-size: 28px; font-weight: 700; }
</style>
