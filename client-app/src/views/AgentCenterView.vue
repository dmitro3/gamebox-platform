<template>
  <div class="page agent-page">
    <div class="agent-header">
      <button class="back-btn" @click="router.back()">‹</button>
      <span class="title">代理中心</span>
      <span class="balance">{{ walletStore.balance.toLocaleString() }} 分</span>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-grid" v-if="overview">
      <div class="ov-card">
        <div class="ov-value">{{ overview.directCount }}</div>
        <div class="ov-label">直属下级</div>
      </div>
      <div class="ov-card">
        <div class="ov-value">{{ overview.teamCount }}</div>
        <div class="ov-label">团队总人数</div>
      </div>
      <div class="ov-card gold">
        <div class="ov-value">{{ overview.todayCommission.toLocaleString() }}</div>
        <div class="ov-label">今日佣金</div>
      </div>
      <div class="ov-card gold">
        <div class="ov-value">{{ overview.totalCommission.toLocaleString() }}</div>
        <div class="ov-label">累计佣金</div>
      </div>
    </div>

    <!-- 推广码 -->
    <div class="promo-card" v-if="overview">
      <div class="promo-label">我的邀请码（下级注册时填写）</div>
      <div class="promo-row">
        <span class="promo-code">{{ overview.promoCode }}</span>
        <button class="copy-btn" @click="copyCode">复制</button>
      </div>
    </div>

    <!-- 给下级上分 -->
    <div class="transfer-card">
      <div class="tc-title">给下级上分</div>
      <div class="tc-form">
        <input v-model="transferUid" class="tc-input" placeholder="下级 UID（9位数字）" maxlength="9">
        <input v-model.number="transferAmount" type="number" class="tc-input" placeholder="金额" min="1">
        <button class="tc-btn" :disabled="transferring" @click="doTransfer">
          {{ transferring ? '转账中…' : '上 分' }}
        </button>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-row">
      <button class="tab-btn" :class="{ active: tab === 'team' }" @click="tab = 'team'">我的团队</button>
      <button class="tab-btn" :class="{ active: tab === 'comm' }" @click="tab = 'comm'">佣金明细</button>
    </div>

    <!-- 团队列表 -->
    <div v-if="tab === 'team'" class="list-area">
      <div v-if="team.length === 0" class="empty-tip">还没有下级，把邀请码分享出去吧</div>
      <div v-for="m in team" :key="m.uid" class="member-card">
        <div class="mc-main">
          <span class="mc-name">{{ m.nickname }}</span>
          <span class="mc-uid">UID {{ m.uid }}</span>
        </div>
        <div class="mc-stats">
          <span>流水 {{ m.totalFlow.toLocaleString() }}</span>
          <span class="mc-comm">贡献佣金 {{ m.myCommission.toLocaleString() }}</span>
        </div>
        <div class="mc-time">注册于 {{ fmtDate(m.createdAt) }}</div>
      </div>
    </div>

    <!-- 佣金明细 -->
    <div v-else class="list-area">
      <div v-if="commissions.length === 0" class="empty-tip">暂无佣金记录</div>
      <div v-for="c in commissions" :key="c.id" class="comm-card">
        <div class="cc-main">
          <span class="cc-source">{{ c.sourceUser.nickname }} (L{{ c.level }})</span>
          <span class="cc-amount">+{{ c.amount.toLocaleString() }}</span>
        </div>
        <div class="cc-sub">
          流水 {{ c.baseFlow.toLocaleString() }} × {{ (c.rate * 100).toFixed(2) }}%
          · {{ fmtDate(c.settledAt) }}
        </div>
      </div>
    </div>

    <div class="page-bottom-spacer" />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useToast } from '@/composables/useToast'
import { agentApi, type AgentOverview, type TeamMember, type CommissionItem } from '@/api/agent'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()
const walletStore = useWalletStore()
const { success: toastOk, error: toastErr } = useToast()

const overview    = ref<AgentOverview | null>(null)
const team        = ref<TeamMember[]>([])
const commissions = ref<CommissionItem[]>([])
const tab         = ref<'team' | 'comm'>('team')

const transferUid    = ref('')
const transferAmount = ref<number | null>(null)
const transferring   = ref(false)

function fmtDate(s: string) {
  const d = new Date(s)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function copyCode() {
  if (!overview.value) return
  try {
    await navigator.clipboard.writeText(overview.value.promoCode)
    toastOk('邀请码已复制')
  } catch {
    toastErr('复制失败，请手动复制')
  }
}

async function doTransfer() {
  const uid = transferUid.value.trim()
  const amount = Number(transferAmount.value)
  if (!/^\d{9}$/.test(uid)) { toastErr('请输入 9 位数字 UID'); return }
  if (!Number.isInteger(amount) || amount < 1) { toastErr('请输入有效金额'); return }
  transferring.value = true
  try {
    await agentApi.transfer(uid, amount)
    toastOk(`已给 ${uid} 上分 ${amount}`)
    transferUid.value = ''
    transferAmount.value = null
    walletStore.fetchBalance()
  } catch (e: unknown) {
    toastErr((e as Error).message)
  } finally {
    transferring.value = false
  }
}

onMounted(async () => {
  walletStore.fetchBalance()
  try {
    const [ov, tm, cm] = await Promise.all([
      agentApi.overview(), agentApi.team(), agentApi.commissions(),
    ])
    overview.value = ov
    team.value = tm.list
    commissions.value = cm.list
  } catch (e: unknown) {
    toastErr((e as Error).message)
  }
})
</script>

<style scoped>
.agent-page { min-height: 100vh; background: #06080f; color: #fff; padding-bottom: 60px; }

.agent-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(8,12,24,0.96);
  border-bottom: 1px solid rgba(80,140,255,0.2);
}
.back-btn { background: none; border: none; color: #5a8cff; font-size: 28px; cursor: pointer; }
.title { font-size: 18px; font-weight: 700; color: #7da4ff; }
.balance { font-size: 13px; color: #405580; }

.overview-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
  padding: 16px;
}
.ov-card {
  padding: 14px; border-radius: 12px; text-align: center;
  background: rgba(20,30,55,0.7); border: 1px solid rgba(80,140,255,0.2);
}
.ov-card.gold { border-color: rgba(232,192,50,0.3); background: rgba(40,32,10,0.5); }
.ov-value { font-size: 24px; font-weight: 700; color: #7da4ff; }
.ov-card.gold .ov-value { color: #e8c032; }
.ov-label { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 4px; }

.promo-card {
  margin: 0 16px 14px; padding: 14px 16px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(30,50,100,0.55), rgba(15,22,45,0.8));
  border: 1px solid rgba(80,140,255,0.3);
}
.promo-label { font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
.promo-row { display: flex; align-items: center; gap: 12px; }
.promo-code {
  flex: 1; font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #7da4ff;
  font-family: monospace;
}
.copy-btn {
  padding: 8px 20px; border-radius: 20px; border: 1px solid rgba(80,140,255,0.5);
  background: rgba(80,140,255,0.15); color: #7da4ff; font-size: 13px; cursor: pointer;
}

.transfer-card {
  margin: 0 16px 16px; padding: 14px 16px; border-radius: 12px;
  background: rgba(20,30,55,0.5); border: 1px solid rgba(80,140,255,0.15);
}
.tc-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); margin-bottom: 10px; }
.tc-form { display: flex; gap: 8px; }
.tc-input {
  flex: 1; min-width: 0; padding: 9px 12px; border-radius: 8px;
  border: 1px solid rgba(80,140,255,0.25); background: rgba(10,15,30,0.8);
  color: #fff; font-size: 13px; outline: none;
}
.tc-btn {
  padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #5a8cff, #2850c8);
  color: #fff; font-size: 14px; font-weight: 600; white-space: nowrap;
}
.tc-btn:disabled { opacity: 0.5; }

.tab-row { display: flex; gap: 0; margin: 0 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.tab-btn {
  flex: 1; padding: 10px; background: none; border: none; cursor: pointer;
  color: rgba(255,255,255,0.4); font-size: 14px;
  border-bottom: 2px solid transparent;
}
.tab-btn.active { color: #7da4ff; border-bottom-color: #5a8cff; font-weight: 600; }

.list-area { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.empty-tip { text-align: center; color: rgba(255,255,255,0.3); padding: 40px 0; font-size: 13px; }

.member-card, .comm-card {
  padding: 12px 14px; border-radius: 10px;
  background: rgba(20,30,55,0.5); border: 1px solid rgba(255,255,255,0.06);
}
.mc-main { display: flex; justify-content: space-between; margin-bottom: 6px; }
.mc-name { font-size: 15px; font-weight: 600; }
.mc-uid { font-size: 12px; color: rgba(255,255,255,0.4); font-family: monospace; }
.mc-stats { display: flex; gap: 16px; font-size: 12px; color: rgba(255,255,255,0.55); margin-bottom: 4px; }
.mc-comm { color: #e8c032; }
.mc-time { font-size: 11px; color: rgba(255,255,255,0.3); }

.cc-main { display: flex; justify-content: space-between; margin-bottom: 4px; }
.cc-source { font-size: 14px; }
.cc-amount { font-size: 16px; font-weight: 700; color: #e8c032; }
.cc-sub { font-size: 12px; color: rgba(255,255,255,0.4); }

.page-bottom-spacer { height: 80px; }
</style>
