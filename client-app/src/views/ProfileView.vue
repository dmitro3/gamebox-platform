<template>
  <div class="screen-deco" aria-hidden="true">
    <img class="cd cd-tl" src="/images/corner-flourish.png" alt="">
    <img class="cd cd-tr" src="/images/corner-flourish.png" alt="">
    <img class="cd cd-bl" src="/images/corner-flourish.png" alt="">
    <img class="cd cd-br" src="/images/corner-flourish.png" alt="">
  </div>

  <div class="page settings-page">

    <div class="app-bar">
      <div class="back" @click="router.back()">‹</div>
      <div class="title">我 的</div>
      <div class="right"></div>
    </div>

    <div class="page-body">

      <!-- 卡片 1：用户名片 -->
      <div class="user-card user-bar" title="个人资料">
        <div class="avatar-luxe-wrap">
          <img class="avatar-img" :src="avatarSrc" alt="">
          <img class="avatar-frame" src="/images/avatar-ring.png" alt="">
        </div>
        <div class="user-info">
          <div class="user-name">{{ userStore.profile?.nickname ?? '———' }}</div>
          <div class="user-divider" aria-hidden="true"><span class="user-divider-gem"></span></div>
          <div class="user-id">
            <span class="id-dot"></span>ID&nbsp;<span id="userId">{{ userStore.profile?.uid ?? '———' }}</span>
          </div>
        </div>
      </div>

      <!-- 卡片 2：钱包中心 -->
      <div :class="['settings-card', 'wallet-card', hidden ? 'is-hidden' : '']">
        <div class="wc-title-row">
          <span class="wc-title">钱 包 中 心</span>
          <button class="wc-eye" type="button" aria-label="显示/隐藏余额" @click="toggleHidden">
            <svg class="wc-eye-show" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <svg class="wc-eye-hide" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18"/>
              <path d="M2 12s4-7 10-7c2.4 0 4.4 1 6 2"/>
              <path d="M22 12s-4 7-10 7c-2.4 0-4.4-1-6-2"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <div class="wc-balance-row">
          <span class="wc-balance">{{ hidden ? '*****' : fmtNum(walletStore.balance) }}</span>
          <span class="wc-currency">积 分</span>
        </div>
        <div class="wc-stats-row">
          <div class="wc-stat">
            <span class="ws-label">流 水</span>
            <span class="ws-value">{{ hidden ? '***' : fmtInt(stats.turnover) }}</span>
          </div>
          <div class="wc-stat">
            <span class="ws-label">回 水</span>
            <span class="ws-value">{{ hidden ? '***' : fmtInt(stats.rebate) }}</span>
          </div>
          <div class="wc-stat">
            <span class="ws-label">盈 利</span>
            <span class="ws-value">{{ hidden ? '***' : fmtInt(stats.pnl) }}</span>
          </div>
        </div>
      </div>

      <!-- 卡片 3：2 行 3 列网格 -->
      <div class="settings-card grid-card grid-3col">
        <button type="button" class="gc-item" @click="router.push('/password')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
          </span>
          <span class="gc-text">账 号 管 理</span>
        </button>
        <button type="button" class="gc-item" @click="router.push('/apply-records')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>
          </span>
          <span class="gc-text">申 请 记 录</span>
        </button>
        <button type="button" class="gc-item" @click="router.push('/bets')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18l-2 7H5z"/><path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/><circle cx="12" cy="14" r="2"/></svg>
          </span>
          <span class="gc-text">竞 猜 记 录</span>
        </button>
        <button type="button" class="gc-item" @click="router.push('/activities')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="1"/><path d="M3 8l9-5 9 5"/><path d="M12 8v12"/></svg>
          </span>
          <span class="gc-text">福 利 中 心</span>
        </button>
        <button type="button" class="gc-item" @click="router.push('/points-log')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H9"/></svg>
          </span>
          <span class="gc-text">积 分 账 变</span>
        </button>
        <button type="button" class="gc-item" @click="router.push('/agent')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.4"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M14 19c0-2.2 1.6-4 4-4s4 1.8 4 4"/></svg>
          </span>
          <span class="gc-text">代 理 中 心</span>
        </button>
      </div>

      <!-- 卡片 4：1 行 4 列网格 -->
      <div class="settings-card grid-card grid-4col">
        <button type="button" class="gc-item" @click="shareFriend">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/><path d="M17 14h4v7h-7v-4"/></svg>
          </span>
          <span class="gc-text">分享好友</span>
        </button>
        <button type="button" class="gc-item" @click="checkUpdate">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13-6.2"/><path d="M17 2.5v3.5h-3.5"/><path d="M20 12a8 8 0 0 1-13 6.2"/><path d="M7 21.5v-3.5h3.5"/></svg>
          </span>
          <span class="gc-text">检查更新</span>
        </button>
        <button type="button" class="gc-item" @click="toast('游戏介绍 · 即将开放')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none"/></svg>
          </span>
          <span class="gc-text">游戏介绍</span>
        </button>
        <button type="button" class="gc-item" @click="router.push('/cs')">
          <span class="gc-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 1 0-15.1 5.4L4 21l4.1-1.9A8.5 8.5 0 0 0 21 11.5z"/></svg>
          </span>
          <span class="gc-text">在线客服</span>
        </button>
      </div>

      <!-- 卡片 5：退出登录 -->
      <div class="settings-card logout-card">
        <button type="button" class="logout-btn" @click="openLogout">退 出 登 录</button>
      </div>

      <div class="lobby-spacer"></div>
    </div>
  </div>

  <TabBar />
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useWalletStore } from '@/stores/wallet'
import { useToast } from '@/composables/useToast'
import { useBodyClass } from '@/composables/useBodyClass'
import TabBar from '@/components/TabBar.vue'
import '@/assets/settings.css'

useBodyClass('deco-bg')

const router = useRouter()
const userStore = useUserStore()
const walletStore = useWalletStore()
const { toast } = useToast()

const avatarSrc = computed(() => userStore.profile?.avatar || '/images/avatars/001.jpg')

/* 钱包中心：余额隐藏开关（与原型同款 localStorage 记忆） */
const WALLET_STORE = computed(() => `wallet_hidden_${userStore.profile?.uid ?? ''}`)
const hidden = ref(false)

function toggleHidden() {
  hidden.value = !hidden.value
  localStorage.setItem(WALLET_STORE.value, hidden.value ? '1' : '0')
}

/* 流水 / 回水 / 盈利：后端暂未提供汇总接口，先展示 0（与原型一致） */
const stats = reactive({ turnover: 0, rebate: 0, pnl: 0 })

const fmtNum = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n: number) => Number(n).toLocaleString('en-US')

function shareFriend() {
  const code = userStore.profile?.promoCode
  if (code) {
    navigator.clipboard?.writeText(`邀请码：${code}，快来加入金御汇！`)
    toast('邀请信息已复制，快去分享吧')
  } else {
    router.push('/agent')
  }
}

function checkUpdate() {
  toast('当前已是最新版本 v1.0.0')
}

function openLogout() {
  if (window.confirm('确定要退出当前账号吗？')) {
    userStore.logout()
    window.location.replace('/login')
  }
}

onMounted(() => {
  hidden.value = localStorage.getItem(WALLET_STORE.value) === '1'
  walletStore.fetchBalance()
})
</script>
