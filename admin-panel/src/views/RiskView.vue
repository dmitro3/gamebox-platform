<template>
  <div>
    <div class="page-header">
      <h2>⚠️ 风控告警</h2>
      <el-radio-group v-model="filter.handled" size="small" @change="load">
        <el-radio-button :label="false">未处理</el-radio-button>
        <el-radio-button :label="true">已处理</el-radio-button>
        <el-radio-button label="">全部</el-radio-button>
      </el-radio-group>
    </div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="级别" width="90">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="type" width="180" />
        <el-table-column label="关联对象" prop="targetId" width="180">
          <template #default="{ row }">
            <el-text truncated>{{ row.targetId ?? '—' }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="详情">
          <template #default="{ row }">
            <el-text truncated>{{ JSON.stringify(row.detail) }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.handled" size="small" type="success" @click="handle(row)">标记处理</el-button>
            <el-text v-else type="success" size="small">已处理</el-text>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top:16px;justify-content:flex-end;display:flex"
        :total="total" :page-size="20" layout="total,prev,pager,next"
        @current-change="(p: number) => { filter.page = p; load() }"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { riskApi, type RiskEvent } from '@/api/admin'

const list = ref<RiskEvent[]>([])
const total = ref(0)
const loading = ref(false)
const filter = reactive<{ handled: boolean | ''; page: number; pageSize: number }>({ handled: false, page: 1, pageSize: 20 })

async function load() {
  loading.value = true
  try {
    const res = await riskApi.list({
      handled: filter.handled === '' ? undefined : filter.handled,
      page: filter.page, pageSize: filter.pageSize,
    })
    list.value = res.list
    total.value = res.total
  } finally { loading.value = false }
}

async function handle(row: RiskEvent) {
  try {
    await riskApi.handle(row.id)
    row.handled = true
    ElMessage.success('已标记处理')
  } catch (e: unknown) { ElMessage.error((e as Error).message) }
}

function levelType(l: string) { return l === 'CRITICAL' ? 'danger' : l === 'WARN' ? 'warning' : 'info' }
function fmtTime(s: string) { return new Date(s).toLocaleString('zh-CN', { hour12: false }) }

onMounted(load)
</script>
