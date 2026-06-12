<template>
  <div class="page activity-page">
    <div class="act-header">
      <button class="back-btn" @click="router.back()">‹</button>
      <span class="title">活动中心</span>
      <span class="balance">{{ walletStore.balance.toLocaleString() }} 分</span>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-tip">加载中…</div>

    <template v-else>
      <!-- 无活动 -->
      <div v-if="activities.length === 0" class="empty-tip">
        <div class="empty-icon">🎁</div>
        <div>暂无进行中的活动</div>
      </div>

      <!-- 活动列表 -->
      <div v-else class="act-list">
        <div v-for="act in activities" :key="act.id" class="act-card"
          :class="{ claimed: !!act.claim }">

          <!-- 横幅图（有则显示） -->
          <img v-if="act.bannerUrl" :src="act.bannerUrl" class="act-banner" alt="">

          <div class="act-body">
            <div class="act-type-badge" :class="act.type.toLowerCase()">
              {{ typeLabel(act.type) }}
            </div>
            <div class="act-title">{{ act.title }}</div>

            <!-- 新人礼描述 -->
            <template v-if="act.type === 'NEWBIE'">
              <div class="act-desc">注册后 {{ act.config.expiresHours ?? 24 }} 小时内领取</div>
              <div class="act-reward">奖励：<b>+{{ act.config.reward }} 分</b></div>
            </template>

            <!-- 首充/VIP 阶梯 -->
            <template v-else-if="act.config.tiers">
              <div class="tier-table">
                <div v-for="t in act.config.tiers" :key="t.minDeposit" class="tier-row">
                  <span class="tier-cond">充值满 {{ t.minDeposit }}</span>
                  <span class="tier-reward">送 {{ t.reward }} 分</span>
                </div>
              </div>
            </template>

            <!-- 领取按钮 -->
            <div class="act-footer">
              <div v-if="act.claim" class="claimed-tag">
                已领取 +{{ act.claim.rewardPoints }} 分
              </div>
              <button v-else class="claim-btn"
                :disabled="claiming === act.id"
                @click="doClaim(act)">
                {{ claiming === act.id ? '领取中…' : '立即领取' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div class="page-bottom-spacer" />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useToast } from '@/composables/useToast'
import { activityApi, type ActivityItem } from '@/api/activity'
import TabBar from '@/components/TabBar.vue'

const router = useRouter()
const walletStore = useWalletStore()
const { success: toastOk, error: toastErr } = useToast()

const loading    = ref(true)
const activities = ref<ActivityItem[]>([])
const claiming   = ref<string | null>(null)

async function loadList() {
  try {
    activities.value = await activityApi.list()
  } catch { /* 静默 */ } finally {
    loading.value = false
  }
}

async function doClaim(act: ActivityItem) {
  claiming.value = act.id
  try {
    const res = await activityApi.claim(act.id)
    toastOk(`领取成功！+${res.reward} 分`)
    act.claim = {
      id: res.claim.id,
      status: res.claim.status,
      rewardPoints: res.reward,
      claimedAt: new Date().toISOString(),
    }
    walletStore.fetchBalance()
  } catch (e: unknown) {
    toastErr((e as Error).message)
  } finally {
    claiming.value = null
  }
}

function typeLabel(t: string) {
  return { NEWBIE: '新人礼', FIRST_DEPOSIT: '首充礼', VIP: 'VIP礼包', PROMO: '促销', WIN_STREAK: '连赢', ACCUMULATE: '累计' }[t] ?? t
}

onMounted(() => {
  walletStore.fetchBalance()
  loadList()
})
</script>

<style scoped>
.activity-page { min-height: 100vh; background: #0d0508; color: #fff; padding-bottom: 60px; }

.act-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: rgba(20,6,14,0.96);
  border-bottom: 1px solid rgba(255,100,150,0.2);
}
.back-btn { background: none; border: none; color: #ff6496; font-size: 28px; cursor: pointer; }
.title { font-size: 18px; font-weight: 700; color: #ff8fb5; }
.balance { font-size: 13px; color: #804060; }

.loading-tip, .empty-tip {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; color: rgba(255,255,255,0.35); gap: 12px;
}
.empty-icon { font-size: 48px; }

.act-list { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.act-card {
  border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(255,100,150,0.25);
  background: linear-gradient(135deg, rgba(40,12,26,0.9), rgba(20,6,14,0.95));
  transition: transform 0.2s;
}
.act-card.claimed { opacity: 0.65; }

.act-banner { width: 100%; height: 120px; object-fit: cover; display: block; }

.act-body { padding: 14px 16px 16px; }

.act-type-badge {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; margin-bottom: 8px;
  background: rgba(255,100,150,0.15); color: #ff6496;
  border: 1px solid rgba(255,100,150,0.3);
}
.act-type-badge.vip { background: rgba(180,120,255,0.15); color: #cc99ff; border-color: rgba(180,120,255,0.3); }
.act-type-badge.first_deposit { background: rgba(255,200,50,0.15); color: #ffd700; border-color: rgba(255,200,50,0.3); }

.act-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 10px; }
.act-desc { font-size: 13px; color: rgba(255,255,255,0.55); margin-bottom: 4px; }
.act-reward { font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 12px; }
.act-reward b { color: #ffd700; font-size: 18px; }

.tier-table { margin-bottom: 12px; display: flex; flex-direction: column; gap: 5px; }
.tier-row {
  display: flex; justify-content: space-between;
  padding: 6px 10px; border-radius: 8px;
  background: rgba(255,255,255,0.04); font-size: 13px;
}
.tier-cond { color: rgba(255,255,255,0.6); }
.tier-reward { color: #ffd700; font-weight: 600; }

.act-footer { display: flex; justify-content: flex-end; }
.claim-btn {
  padding: 10px 28px; border-radius: 24px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #ff6496, #c0254f);
  color: #fff; font-size: 15px; font-weight: 700;
  box-shadow: 0 4px 16px rgba(255,100,150,0.4);
  transition: all 0.2s;
}
.claim-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

.claimed-tag {
  padding: 8px 20px; border-radius: 24px;
  border: 1px solid rgba(0,220,100,0.4);
  color: #00dc64; font-size: 14px;
}

.page-bottom-spacer { height: 80px; }
</style>
