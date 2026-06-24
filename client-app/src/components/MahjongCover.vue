<template>
  <div class="mahjong-cover" v-if="visible">
    <!-- PG 正版加载动画 -->
    <div v-if="loading" class="pg-loader" aria-hidden="true">
      <div class="pg-loader__dots">
        <span class="pg-loader__dot" />
        <span class="pg-loader__dot" />
        <span class="pg-loader__dot" />
      </div>
    </div>

    <img v-else-if="coverBgUrl" :src="coverBgUrl" class="cover-bg" alt="麻将胡了" />

    <div v-if="!loading" class="ui-layer">
      <button
        v-if="startBtnUrl"
        type="button"
        class="start-btn"
        :style="startBtnStyle"
        aria-label="开始"
        @click="handleStart"
        @mousedown="startPressed = true"
        @mouseup="startPressed = false"
        @mouseleave="startPressed = false"
        @touchstart.passive="startPressed = true"
        @touchend="startPressed = false"
      />

      <div class="footer-container">
        <div class="footer-top">
          <div class="pg-brand">
            <div class="pg-logo-txt">PG</div>
            <div class="pg-logo-sub">POCKET GAMES SOFT®</div>
          </div>
          <div class="cert-group">
            <div class="cert-box">
              <div class="cert-label">权威机构</div>
              <div class="cert-val">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="white" style="margin-right:2px"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                MGA
              </div>
              <div class="cert-txt">全球最高规格牌照机构颁发牌照：<br>马耳他 (证书号: C76195)，<br>业务覆盖全球</div>
            </div>
            <div class="cert-box">
              <div class="cert-label">公平认证</div>
              <div class="cert-val">
                <i style="margin-right:2px">ga</i> bmm <span style="font-size:8px; font-weight:normal;">testlabs</span>
              </div>
              <div class="cert-txt">由最严苛的RTP认证机构颁发<br>游戏证书：GA 和 BMM，<br>所有游戏保证100%公平，赔付有保障</div>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          PGSOFT.COM 2026 © PG SOFT® 版权所有
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { pgUi } from '../games/mahjong/pgAssets'

const props = defineProps({
  visible: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['start']);

const loading = ref(true)
const startPressed = ref(false)

const coverBgUrl = computed(() => pgUi('cover'))
const startBtnUrl = computed(() =>
  startPressed.value
    ? (pgUi('btn-start-pressed') ?? pgUi('btn-start'))
    : pgUi('btn-start'),
)

const startBtnStyle = computed(() => {
  const url = startBtnUrl.value
  if (!url) return undefined
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  }
})

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 900)
})

const handleStart = () => {
  emit('start');
};
</script>

<style scoped>
.mahjong-cover {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9998;
  background-color: #000;
  overflow: hidden;
  font-family: 'PingFang SC', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.pg-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.pg-loader__dots {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 40px;
  height: 10px;
}

.pg-loader__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #30a2d0;
  animation: pg-dot-bounce 0.25s ease-out infinite alternate;
}

.pg-loader__dot:nth-child(1) { animation-delay: 0s; }
.pg-loader__dot:nth-child(2) { animation-delay: -0.075s; }
.pg-loader__dot:nth-child(3) { animation-delay: -0.15s; }

@keyframes pg-dot-bounce {
  from { transform: translateY(0); }
  to { transform: translateY(-15px); }
}

.cover-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  animation: coverScaleIn 0.8s ease-out forwards;
}

@keyframes coverScaleIn {
  from { transform: scale(1.05); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.ui-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding-bottom: 20px;
  pointer-events: none;
}

.start-btn {
  pointer-events: auto;
  margin-bottom: 52px;
  width: min(260px, 52vw);
  height: min(68px, 11vw);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.12s ease, filter 0.12s ease;
  animation: btnBreathe 2.5s infinite alternate ease-in-out;
}

@keyframes btnBreathe {
  from {
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)) brightness(1);
    transform: scale(1);
  }
  to {
    filter: drop-shadow(0 8px 25px rgba(255, 204, 0, 0.7)) brightness(1.08);
    transform: scale(1.03);
  }
}

.start-btn:active {
  transform: translateY(3px) scale(0.96);
  animation: none;
  filter: brightness(0.92);
}

.footer-container {
  pointer-events: auto;
  width: 100%;
  background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 70%, transparent 100%);
  padding: 20px 15px 10px;
  box-sizing: border-box;
}

.footer-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: 600px;
  margin: 0 auto 15px;
}

.pg-brand {
  display: flex;
  flex-direction: column;
}

.pg-logo-txt {
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 2px;
  line-height: 1;
}

.pg-logo-sub {
  color: #aaa;
  font-size: 9px;
  margin-top: 4px;
  letter-spacing: 0.5px;
}

.cert-group {
  display: flex;
  gap: 15px;
}

.cert-box {
  display: flex;
  flex-direction: column;
}

.cert-label {
  color: #999;
  font-size: 10px;
  margin-bottom: 2px;
}

.cert-val {
  color: #fff;
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.cert-txt {
  color: #666;
  font-size: 9px;
  line-height: 1.3;
  transform: scale(0.85);
  transform-origin: left top;
  width: 115%;
}

.footer-bottom {
  text-align: center;
  color: #555;
  font-size: 10px;
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 8px;
  max-width: 600px;
  margin: 0 auto;
}
</style>
