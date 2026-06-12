<template>
  <div>
    <div class="page-header"><h2>🎮 游戏管理</h2></div>

    <el-card shadow="never">
      <el-table :data="games" v-loading="loading" stripe>
        <el-table-column label="游戏" width="160">
          <template #default="{ row }">
            <div style="font-weight:600">{{ row.name }}</div>
            <div style="font-size:11px;color:#909399">{{ row.code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="category" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.category === 'SLOT' ? 'primary' : 'info'">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'ONLINE'"
              active-text="上架"
              inactive-text="下架"
              @change="(v: boolean) => toggleStatus(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="下注范围" width="130">
          <template #default="{ row }">{{ row.minBet }} ~ {{ row.maxBet }}</template>
        </el-table-column>
        <el-table-column label="当前 RTP">
          <template #default="{ row }">
            <span v-if="activeConfig(row)">{{ (activeConfig(row)!.rtp * 100).toFixed(1) }}%</span>
            <span v-else style="color:#f56c6c">未配置</span>
          </template>
        </el-table-column>
        <el-table-column label="配置版本">
          <template #default="{ row }">
            <el-tag v-if="activeConfig(row)" size="small">v{{ activeConfig(row)!.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="openConfig(row)">配置爆率</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 爆率配置弹窗 -->
    <el-dialog v-model="configVisible" :title="`配置爆率 · ${configGame?.name}`" width="700px">
      <!-- 历史版本 -->
      <div style="margin-bottom:16px">
        <div style="font-weight:600;margin-bottom:8px">历史版本</div>
        <el-table :data="configHistory" size="small" stripe>
          <el-table-column label="版本" prop="version" width="70" />
          <el-table-column label="RTP" width="80">
            <template #default="{ row }">{{ (row.rtp * 100).toFixed(1) }}%</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.active ? 'success' : 'info'" size="small">{{ row.active ? '生效中' : '历史' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间">
            <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button v-if="!row.active" size="small" type="warning" @click="activateVer(row.version)">激活</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 新版本 -->
      <el-divider>新建版本</el-divider>
      <el-form :model="newConfig" label-width="80px" size="small">
        <el-form-item label="RTP">
          <el-input-number v-model="newConfig.rtp" :min="0.5" :max="0.99" :step="0.01" :precision="2" />
          <span style="margin-left:8px;color:#909399">（0.50 ~ 0.99）</span>
        </el-form-item>
        <el-form-item label="奖项配置">
          <el-button size="small" @click="addItem">+ 增加奖项</el-button>
          <el-table :data="newConfig.items" style="margin-top:8px" size="small">
            <el-table-column label="奖项名">
              <template #default="{ row }"><el-input v-model="row.label" size="small" /></template>
            </el-table-column>
            <el-table-column label="赔率(x)" width="110">
              <template #default="{ row }"><el-input-number v-model="row.multiplier" :min="0" :precision="1" size="small" style="width:100%" /></template>
            </el-table-column>
            <el-table-column label="权重" width="110">
              <template #default="{ row }"><el-input-number v-model="row.weight" :min="1" :precision="0" size="small" style="width:100%" /></template>
            </el-table-column>
            <el-table-column width="60">
              <template #default="{ $index }">
                <el-button size="small" type="danger" @click="newConfig.items.splice($index, 1)">删</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configVisible = false">取消</el-button>
        <el-button type="primary" :loading="opLoading" @click="saveConfig">保存并激活</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { gameAdminApi, type GameAdmin, type GameConfigAdmin } from '@/api/admin'

const games = ref<GameAdmin[]>([])
const loading = ref(false)
const opLoading = ref(false)
const configVisible = ref(false)
const configGame = ref<GameAdmin | null>(null)
const configHistory = ref<GameConfigAdmin[]>([])

const newConfig = reactive({
  rtp: 0.95,
  items: [{ label: '谢谢参与', multiplier: 0, weight: 40 }] as { label: string; multiplier: number; weight: number }[],
})

function activeConfig(g: GameAdmin) { return g.configs.find(c => c.active) }

async function load() {
  loading.value = true
  try { games.value = await gameAdminApi.list() } finally { loading.value = false }
}

async function toggleStatus(row: GameAdmin, online: boolean) {
  try {
    await gameAdminApi.setStatus(row.code, online ? 'ONLINE' : 'OFFLINE')
    row.status = online ? 'ONLINE' : 'OFFLINE'
    ElMessage.success(online ? '已上架' : '已下架')
  } catch (e: unknown) { ElMessage.error((e as Error).message) }
}

async function openConfig(row: GameAdmin) {
  configGame.value = row
  configHistory.value = await gameAdminApi.listConfigs(row.code)
  // 预填当前激活配置的 payTable
  const cur = configHistory.value.find(c => c.active)
  if (cur && Array.isArray(cur.payTable)) {
    newConfig.items = (cur.payTable as { label: string; multiplier: number; weight: number }[]).map(p => ({ ...p }))
    newConfig.rtp = cur.rtp
  }
  configVisible.value = true
}

function addItem() { newConfig.items.push({ label: '新奖项', multiplier: 1, weight: 5 }) }

async function saveConfig() {
  if (!configGame.value) return
  opLoading.value = true
  try {
    await gameAdminApi.createConfig(configGame.value.code, { rtp: newConfig.rtp, payTable: newConfig.items })
    ElMessage.success('已保存并激活新版本')
    configVisible.value = false
    load()
  } catch (e: unknown) { ElMessage.error((e as Error).message) }
  finally { opLoading.value = false }
}

async function activateVer(version: number) {
  if (!configGame.value) return
  await ElMessageBox.confirm(`确认激活 v${version}？`, '确认', { type: 'warning' })
  try {
    await gameAdminApi.activateConfig(configGame.value.code, version)
    ElMessage.success(`v${version} 已激活`)
    configHistory.value = await gameAdminApi.listConfigs(configGame.value.code)
    load()
  } catch (e: unknown) { ElMessage.error((e as Error).message) }
}

function fmtTime(s: string) { return new Date(s).toLocaleString('zh-CN', { hour12: false }) }

onMounted(load)
</script>
