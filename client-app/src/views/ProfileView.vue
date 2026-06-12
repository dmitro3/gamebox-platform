<template>
  <div class="page profile-page">
    <!-- 用户信息卡 -->
    <div class="user-card">
      <div class="avatar">{{ avatarChar }}</div>
      <div class="user-info">
        <div class="user-name">{{ userStore.profile?.nickname ?? '—' }}</div>
        <div class="user-uid">UID {{ userStore.profile?.uid ?? '—' }}</div>
      </div>
      <div class="user-balance">
        <div class="ub-value">{{ walletStore.balance.toLocaleString() }}</div>
        <div class="ub-label">积分余额</div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div class="menu-list">
      <div class="menu-item" @click="router.push('/agent')">
        <span class="mi-icon blue">♟</span>
        <span class="mi-text">代理中心</span>
        <span class="mi-sub">团队 · 佣金 · 邀请码</span>
        <span class="mi-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/activities')">
        <span class="mi-icon pink">🎁</span>
        <span class="mi-text">活动中心</span>
        <span class="mi-sub">新人礼 · 首充 · VIP</span>
        <span class="mi-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/recharge')">
        <span class="mi-icon gold">¥</span>
        <span class="mi-text">充值提现</span>
        <span class="mi-sub"></span>
        <span class="mi-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/flow')">
        <span class="mi-icon green">▤</span>
        <span class="mi-text">账变明细</span>
        <span class="mi-sub"></span>
        <span class="mi-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/bets')">
        <span class="mi-icon purple">♠</span>
        <span class="mi-text">投注记录</span>
        <span class="mi-sub">输赢一目了然</span>
        <span class="mi-arrow">›</span>
      </div>
      <div class="menu-item" @click="router.push('/password')">
        <span class="mi-icon gray">🔒</span>
        <span class="mi-text">修改密码</span>
        <span class="mi-sub"></span>
        <span class="mi-arrow">›</span>
      </div>
    </div>

    <!-- 退出 -->
    <button class="logout-btn" @click="logoutModal = true">退出登录</button>

    <AppModal
      :visible="logoutModal"
      title="退出登录"
      message="确定要退出当前账号吗？"
      show-cancel
      danger
      @ok="confirmLogout"
      @cancel="logoutModal = false"
    />

    <div class="page-bottom-spacer" />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useWalletStore } from '@/stores/wallet'
import TabBar from '@/components/TabBar.vue'
import AppModal from '@/components/AppModal.vue'

const router = useRouter()
const userStore = useUserStore()
const walletStore = useWalletStore()
const logoutModal = ref(false)

const avatarChar = computed(() => (userStore.profile?.nickname ?? '玩')[0])

function confirmLogout() {
  userStore.logout()
  logoutModal.value = false
  router.push('/login')
}

onMounted(() => walletStore.fetchBalance())
</script>

<style scoped>
.profile-page { min-height: 100vh; background: #0a0a12; color: #fff; padding: 20px 16px 60px; }

.user-card {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 16px; border-radius: 16px; margin-bottom: 20px;
  background: linear-gradient(135deg, rgba(40,40,75,0.8), rgba(18,18,35,0.95));
  border: 1px solid rgba(140,140,255,0.2);
}
.avatar {
  width: 56px; height: 56px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700;
  background: linear-gradient(135deg, #5a8cff, #7d5aff);
  flex-shrink: 0;
}
.user-info { flex: 1; }
.user-name { font-size: 18px; font-weight: 700; }
.user-uid { font-size: 12px; color: rgba(255,255,255,0.4); font-family: monospace; margin-top: 2px; }
.user-balance { text-align: right; }
.ub-value { font-size: 20px; font-weight: 700; color: #e8c032; }
.ub-label { font-size: 11px; color: rgba(255,255,255,0.4); }

.menu-list {
  border-radius: 14px; overflow: hidden;
  background: rgba(25,25,45,0.6); border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 24px;
}
.menu-item {
  display: flex; align-items: center; gap: 12px;
  padding: 15px 16px; cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  transition: background 0.15s;
}
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: rgba(255,255,255,0.05); }
.mi-icon {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
}
.mi-icon.blue  { background: rgba(90,140,255,0.15); color: #7da4ff; }
.mi-icon.pink  { background: rgba(255,100,150,0.15); }
.mi-icon.gold  { background: rgba(232,192,50,0.15); color: #e8c032; }
.mi-icon.green { background: rgba(0,200,90,0.15); color: #00e567; }
.mi-icon.purple { background: rgba(170,90,255,0.15); color: #c98fff; }
.mi-icon.gray  { background: rgba(255,255,255,0.08); font-size: 14px; }
.mi-text { font-size: 15px; font-weight: 500; }
.mi-sub { flex: 1; font-size: 11px; color: rgba(255,255,255,0.3); text-align: right; }
.mi-arrow { font-size: 20px; color: rgba(255,255,255,0.25); }

.logout-btn {
  width: 100%; padding: 14px; border-radius: 12px; cursor: pointer;
  border: 1px solid rgba(255,80,80,0.3); background: rgba(255,80,80,0.08);
  color: #ff7070; font-size: 15px; font-weight: 600;
}

.page-bottom-spacer { height: 80px; }
</style>
