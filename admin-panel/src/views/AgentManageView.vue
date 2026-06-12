<template>
  <div>
    <div class="page-header"><h2>👥 代理管理</h2></div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="代理" width="160">
          <template #default="{ row }">
            <div>{{ row.nickname }}</div>
            <div style="font-size:11px;color:#909399">{{ row.uid }}</div>
          </template>
        </el-table-column>
        <el-table-column label="层级" prop="role" width="90">
          <template #default="{ row }">
            <el-tag size="small">{{ row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="深度" prop="depth" width="70" />
        <el-table-column label="账户余额" width="130">
          <template #default="{ row }">
            <span style="color:#d4a93c;font-weight:600">{{ row.balance?.toLocaleString() ?? '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="openIssue(row)">额度下发</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top:16px;justify-content:flex-end;display:flex"
        :total="total" :page-size="20" layout="total,prev,pager,next"
        @current-change="(p: number) => { page = p; load() }"
      />
    </el-card>

    <!-- 额度下发弹窗 -->
    <el-dialog v-model="issueVisible" :title="`额度下发给 ${issueTarget?.nickname}`" width="400px">
      <el-form label-width="80px">
        <el-form-item label="下发金额">
          <el-input-number v-model="issueAmount" :min="1" :max="10000000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="issueVisible = false">取消</el-button>
        <el-button type="primary" :loading="opLoading" @click="doIssue">确认下发</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { agentApi, type AgentNode } from '@/api/admin'

const list = ref<AgentNode[]>([])
const total = ref(0)
const loading = ref(false)
const opLoading = ref(false)
const page = ref(1)
const issueVisible = ref(false)
const issueTarget = ref<AgentNode | null>(null)
const issueAmount = ref(1000)

async function load() {
  loading.value = true
  try {
    const res = await agentApi.list({ page: page.value, pageSize: 20 })
    list.value = res.list
    total.value = res.total
  } finally { loading.value = false }
}

function openIssue(row: AgentNode) { issueTarget.value = row; issueAmount.value = 1000; issueVisible.value = true }

async function doIssue() {
  if (!issueTarget.value) return
  opLoading.value = true
  try {
    await agentApi.issue(issueTarget.value.id, issueAmount.value)
    ElMessage.success('额度下发成功')
    issueVisible.value = false
    load()
  } catch (e: unknown) { ElMessage.error((e as Error).message) }
  finally { opLoading.value = false }
}

onMounted(load)
</script>
