<template>
  <div>
    <div class="page-header"><h2>📋 操作日志</h2></div>
    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="操作人" width="140">
          <template #default="{ row }">
            <div>{{ row.operator.nickname }}</div>
            <div style="font-size:11px;color:#909399">{{ row.operator.uid }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作类型" prop="action" width="200" />
        <el-table-column label="目标" prop="target" width="180">
          <template #default="{ row }"><el-text truncated>{{ row.target ?? '—' }}</el-text></template>
        </el-table-column>
        <el-table-column label="详情">
          <template #default="{ row }">
            <el-text truncated>{{ JSON.stringify(row.detail) }}</el-text>
          </template>
        </el-table-column>
        <el-table-column label="IP" prop="ip" width="130" />
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top:16px;justify-content:flex-end;display:flex"
        :total="total" :page-size="pageSize" layout="total,prev,pager,next"
        @current-change="(p: number) => { page = p; load() }"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminLogApi, type AdminLogItem } from '@/api/admin'

const list = ref<AdminLogItem[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 20

async function load() {
  loading.value = true
  try {
    const res = await adminLogApi.list({ page: page.value, pageSize })
    list.value = res.list
    total.value = res.total
  } finally { loading.value = false }
}

function fmtTime(s: string) { return new Date(s).toLocaleString('zh-CN', { hour12: false }) }

onMounted(load)
</script>
