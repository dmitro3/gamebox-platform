<template>
  <!-- 大厅专属屏幕级装饰层（与原型一致） -->
  <div class="lobby-deco" aria-hidden="true">
    <img class="lobby-deco-crown" src="/images/crown-emblem.png" alt="">
    <img class="lobby-deco-corner lobby-deco-corner-tl" src="/images/corner-flourish.png" alt="">
    <img class="lobby-deco-corner lobby-deco-corner-tr" src="/images/corner-flourish.png" alt="">
    <img class="lobby-deco-corner lobby-deco-corner-bl" src="/images/corner-flourish.png" alt="">
    <img class="lobby-deco-corner lobby-deco-corner-br" src="/images/corner-flourish.png" alt="">
  </div>

  <!-- 屏幕级 fixed 顶角按钮 -->
  <button class="lobby-back" @click="router.back()" aria-label="返回"></button>
  <button class="lobby-logout" @click="openLogout" aria-label="退出登录"></button>

  <div class="page lobby-page">
    <div class="page-body">

      <h1 class="lobby-title">游 戏 大 厅</h1>

      <!-- 跑马灯：玩家喜报（横向无缝滚动，内容双份拼接） -->
      <div class="lobby-marquee">
        <div class="lm-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M3 10v4l7 3V7L3 10z"/>
            <path d="M10 7l8-3v16l-8-3"/>
            <path d="M6 17v2a1.5 1.5 0 0 0 3 0v-1"/>
          </svg>
        </div>
        <div class="lm-track-wrap">
          <div class="lm-track" @click="toast('恭喜！祝您也好运连连')">
            <template v-for="dup in 2">
              <template v-for="(it, i) in marqueeItems" :key="`${dup}-${i}`">
                <span class="lm-item" data-type="win">
                  <span class="lm-emoji">🎉</span>
                  <span class="lm-text" v-html="it"></span>
                </span>
                <span class="lm-sep">◆</span>
              </template>
            </template>
          </div>
        </div>
      </div>

      <!-- 游戏列表：一行一张，结构与原型 game-lobby.js 渲染输出一致 -->
      <div class="games-list">
        <div
          v-for="g in GAMES"
          :key="g.key"
          class="game-card"
          :data-game="g.key"
          @click="onGameClick(g)"
        >
          <div v-if="g.tag" class="gc-tag">{{ g.tag }}</div>

          <div class="gc-main">
            <div class="gc-icon">
              <img v-if="g.iconImg" :src="g.iconImg" alt="">
              <svg v-else viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" v-html="g.svg"></svg>
            </div>

            <div :class="['gc-name', g.name.length >= 5 ? 'gc-name-tight' : '']">{{ g.name }}</div>

            <div class="gc-status">
              <div class="gc-issue">第 <span class="gc-issue-no">{{ cardState[g.key]?.issue ?? '000000' }}</span> 期</div>
              <div :class="['gc-countdown', cardState[g.key]?.cdClass]">{{ cardState[g.key]?.cdText ?? '--:--' }}</div>
            </div>
          </div>

          <div class="gc-foot">
            <div class="gc-foot-issue"><span class="gc-foot-issue-no">{{ cardState[g.key]?.prevIssue ?? '000000' }}</span> 期</div>
            <div class="gc-foot-numbers"></div>
          </div>
        </div>
      </div>

      <div class="lobby-spacer"></div>
    </div>
  </div>

  <TabBar />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useToast } from '@/composables/useToast'
import { useBodyClass } from '@/composables/useBodyClass'
import { gamesApi } from '@/api/games'
import TabBar from '@/components/TabBar.vue'
import '@/assets/game-lobby.css'

useBodyClass('lobby-bg')

const router = useRouter()
const userStore = useUserStore()
const { toast } = useToast()


/* ===== 游戏列表（与原型 game-lobby.js 的 GAMES 一致） =====
 * type: 'lottery' 定时开奖（期号+倒计时）；'instant' 即时开局
 * route: 已接入后端的游戏跳转路由；无 route 的卡片点击提示「即将上线」 */
interface LobbyGame {
  key: string
  name: string
  tag?: string
  type: 'lottery' | 'instant'
  intervalSec?: number
  iconImg?: string
  svg?: string
  route?: string
  backendCode?: string
}

const GAMES: LobbyGame[] = [
  {
    key: 'mahjong', name: '麻将胡了', tag: '热 门', type: 'instant',
    iconImg: '/images/games/mahjong.png',
    route: '/game/slot/slots-mahjong', backendCode: 'slots-mahjong',
  },
  {
    key: 'queen', name: '赏金女王', tag: '热 门', type: 'instant',
    iconImg: '/images/games/queen.png',
    route: '/game/slot/slots-queen', backendCode: 'slots-queen',
  },
  {
    key: 'ssc', name: '时时彩', type: 'lottery', intervalSec: 600,
    iconImg: '/images/games/ssc.png',
    route: '/game/lottery/ssc', backendCode: 'ssc',
  },
  {
    key: 'ffc', name: '分分彩', type: 'lottery', intervalSec: 60,
    iconImg: '/images/games/ffc.png',
    route: '/game/lottery/ffc', backendCode: 'ffc',
  },
  {
    key: 'speed-racing', name: '极速赛车', type: 'lottery', intervalSec: 60,
    iconImg: '/images/games/speed-racing.png',
    route: '/game/lottery/speed-racing', backendCode: 'speed-racing',
  },
  {
    key: 'bjsc', name: '北京赛车', type: 'lottery', intervalSec: 300,
    iconImg: '/images/games/bjsc.png',
    route: '/game/lottery/bjsc', backendCode: 'bjsc',
  },
  {
    key: 'speed-boat', name: '极速飞艇', type: 'lottery', intervalSec: 60,
    iconImg: '/images/games/speed-boat.png',
  },
  {
    key: 'lhc', name: '六合彩', type: 'lottery', intervalSec: 60,
    iconImg: '/images/games/hk-mark6.png',
  },
  {
    key: 'kuai3', name: '极速快三', type: 'lottery', intervalSec: 60,
    iconImg: '/images/games/kuai3.png',
    route: '/game/lottery/kuai3', backendCode: 'kuai3',
  },
  {
    key: 'zhajinhua', name: '炸金花', tag: '热 门', type: 'lottery', intervalSec: 60,
    iconImg: '/images/games/zhajinhua.png',
  },
  {
    key: 'douniu', name: '斗牛', type: 'lottery', intervalSec: 63,
    iconImg: '/images/games/douniu.png',
  },
  {
    key: 'baccarat', name: '百家乐', tag: '热 门', type: 'lottery', intervalSec: 60,
    iconImg: '/images/games/baccarat.png',
    route: '/game/table/baccarat', backendCode: 'baccarat',
  },
  {
    key: 'slots', name: '老虎机', type: 'instant',
    iconImg: '/images/games/slots.png',
    route: '/game/slot/slots-classic', backendCode: 'slots-classic',
  },
  {
    key: 'bcbm', name: '奔驰宝马', tag: '新 品', type: 'instant',
    svg: `<rect x="6" y="22" width="36" height="14" rx="4" fill="rgba(244,211,107,0.18)" stroke="currentColor" stroke-width="1.6"/>
          <rect x="12" y="14" width="16" height="10" rx="3" fill="rgba(244,211,107,0.28)" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="14" cy="38" r="4" fill="rgba(244,211,107,0.35)" stroke="currentColor" stroke-width="1.2"/>
          <circle cx="34" cy="38" r="4" fill="rgba(244,211,107,0.35)" stroke="currentColor" stroke-width="1.2"/>
          <path d="M8 18 H16 M32 18 H40" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
          <circle cx="24" cy="10" r="2.2" fill="currentColor" opacity="0.8"/>`,
    route: '/game/arcade/bcbm', backendCode: 'bcbm',
  },
  {
    key: 'laba', name: '经典拉霸', tag: '新 品', type: 'instant',
    svg: `<rect x="5" y="10" width="38" height="30" rx="4" fill="rgba(244,211,107,0.12)" stroke="currentColor" stroke-width="1.6"/>
          <rect x="9" y="14" width="9" height="22" rx="2" fill="rgba(244,211,107,0.28)" stroke="currentColor" stroke-width="1.2"/>
          <rect x="19.5" y="14" width="9" height="22" rx="2" fill="rgba(244,211,107,0.38)" stroke="currentColor" stroke-width="1.2"/>
          <rect x="30" y="14" width="9" height="22" rx="2" fill="rgba(244,211,107,0.28)" stroke="currentColor" stroke-width="1.2"/>
          <text x="14" y="28" font-size="10" font-weight="900" fill="currentColor" text-anchor="middle">7</text>
          <text x="24" y="28" font-size="10" font-weight="900" fill="currentColor" text-anchor="middle">7</text>
          <text x="34" y="28" font-size="10" font-weight="900" fill="currentColor" text-anchor="middle">7</text>
          <line x1="5" y1="25" x2="43" y2="25" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>`,
  },
  {
    key: 'longhu', name: '龙虎斗', tag: '新 品', type: 'instant',
    svg: `<path d="M8 28 Q6 14 18 10 Q28 8 30 20 Q32 32 22 36 Q12 38 8 28 Z" fill="rgba(220,60,40,0.35)" stroke="currentColor" stroke-width="1.6"/>
          <circle cx="16" cy="20" r="1.5" fill="currentColor"/>
          <path d="M40 28 Q42 14 30 10 Q20 8 18 20 Q16 32 26 36 Q36 38 40 28 Z" fill="rgba(240,170,50,0.30)" stroke="currentColor" stroke-width="1.6"/>
          <circle cx="32" cy="20" r="1.5" fill="currentColor"/>
          <line x1="24" y1="12" x2="24" y2="40" stroke="currentColor" stroke-width="1.8" opacity="0.5"/>
          <rect x="18" y="38" width="12" height="4" rx="1" fill="rgba(244,211,107,0.35)" stroke="currentColor" stroke-width="1.2"/>`,
    route: '/game/table/dragon-tiger', backendCode: 'dragon-tiger',
  },
  {
    key: 'lucky-wheel', name: '幸运转盘', type: 'instant',
    svg: `<circle cx="24" cy="24" r="17" fill="rgba(244,211,107,0.15)" stroke="currentColor" stroke-width="1.6"/>
          <path d="M24 7 V41 M7 24 H41 M12 12 L36 36 M36 12 L12 36" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
          <circle cx="24" cy="24" r="4" fill="rgba(244,211,107,0.4)" stroke="currentColor" stroke-width="1.4"/>
          <path d="M24 2 L21 8 H27 Z" fill="currentColor"/>`,
    route: '/game/lucky-wheel', backendCode: 'lucky-wheel',
  },
]

/* ===== 跑马灯喜报（与原型同款随机模板） ===== */
const NAME_PREFIX = ['黄金', '银河', '夜行', '闪电', '深海', '炽焰', '寒霜', '疾风', '幻影', '星辰', '破晓', '孤狼', '雷霆', '流沙', '沧海']
const NAME_SUFFIX = ['猎手', '行者', '刺客', '骑士', '大师', '旅人', '贵族', '王者', '使者', '武士', '船长', '法师', '剑客', '少年', '侠客']

const marqueeItems = ref<string[]>([])

function fmt(n: number) { return n.toLocaleString('en-US') }
function randName() {
  return NAME_PREFIX[Math.floor(Math.random() * NAME_PREFIX.length)]
    + NAME_SUFFIX[Math.floor(Math.random() * NAME_SUFFIX.length)]
}
function randGame() {
  return GAMES[Math.floor(Math.random() * GAMES.length)].name.replace(/\s+/g, '')
}
function randAmount() {
  const r = Math.random()
  if (r < 0.55) return 500 + Math.floor(Math.random() * 5000)
  if (r < 0.85) return 5000 + Math.floor(Math.random() * 30000)
  return 30000 + Math.floor(Math.random() * 70000)
}
function buildMarquee() {
  const tpls = [
    () => `${randName()} 在「${randGame()}」赢得 <span class="num">${fmt(randAmount())}</span> 积分`,
    () => `${randName()} 在「${randGame()}」连赢 ${3 + Math.floor(Math.random() * 8)} 场获 <span class="num">${fmt(randAmount())}</span> 积分`,
    () => `${randName()} 单场最大赢取 <span class="num">${fmt(randAmount())}</span> 积分`,
    () => `${randName()} 累计有效投注突破 <span class="num">${fmt(50 + Math.floor(Math.random() * 200))}</span> 万`,
    () => `${randName()} 解锁日积月累终极豪礼 <span class="num">${fmt(randAmount())}</span> 积分`,
  ]
  const items: string[] = []
  for (let i = 0; i < 6; i++) {
    items.push(tpls[Math.floor(Math.random() * tpls.length)]())
  }
  marqueeItems.value = items
}

/* ===== 期号 / 倒计时滴答（与原型规则一致） ===== */
const DRAW_SEC = 2
const FREEZE_SEC = 5

interface CardState { issue: string; prevIssue: string; cdText: string; cdClass: string }
const cardState = reactive<Record<string, CardState>>({})

function todayStartMs() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
function pad(n: number, w: number) { return String(n).padStart(w, '0') }
function fmtIssue6(seq: number) { return pad(Math.max(1, seq), 6) }
function fmtMmss(sec: number) {
  const s = Math.max(0, Math.ceil(sec))
  return pad(Math.floor(s / 60), 2) + ':' + pad(s % 60, 2)
}

function tickAll() {
  for (const g of GAMES) {
    if (g.type !== 'lottery' || !g.intervalSec) {
      cardState[g.key] = { issue: '— —', prevIssue: '— —', cdText: '实时进行', cdClass: 'is-instant' }
      continue
    }
    const interval = g.intervalSec
    const elapsed = (Date.now() - todayStartMs()) / 1000
    const seq = Math.floor(elapsed / interval) + 1
    const r = interval - (elapsed % interval)

    let cdText: string
    let cdClass = ''
    if (r > interval - DRAW_SEC) {
      cdText = '开奖中'; cdClass = 'is-drawing'
    } else if (r <= FREEZE_SEC) {
      cdText = '封盘中'; cdClass = 'is-freeze'
    } else {
      cdText = fmtMmss(r)
    }
    cardState[g.key] = {
      issue: fmtIssue6(seq),
      prevIssue: seq > 1 ? fmtIssue6(seq - 1) : '— —',
      cdText,
      cdClass,
    }
  }
}

/* ===== 后端在线游戏（决定卡片是否可进入） ===== */
const onlineCodes = ref<Set<string>>(new Set())

function onGameClick(g: LobbyGame) {
  if (g.route) {
    // 后端列表加载失败时不拦路，直接按已实现路由跳转
    if (onlineCodes.value.size === 0 || !g.backendCode || onlineCodes.value.has(g.backendCode)) {
      router.push(g.route)
      return
    }
  }
  toast(`${g.name.replace(/\s+/g, '')} · 即将上线`)
}

let timer: ReturnType<typeof setInterval>

onMounted(async () => {
  buildMarquee()
  tickAll()
  timer = setInterval(tickAll, 1000)
  try {
    const list = await gamesApi.list()
    onlineCodes.value = new Set(list.map(g => g.code))
  } catch {
    // 后端不可达时不阻断大厅渲染
  }
})

onUnmounted(() => clearInterval(timer))

function openLogout() {
  if (window.confirm('确定要退出当前账号吗？')) {
    userStore.logout()
    window.location.replace('/login')
  }
}
</script>
