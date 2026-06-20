<template>
  <Transition name="fade">
    <div v-if="visible" class="mj-sheet-mask" @click.self="emit('close')">
      <div class="mj-sheet" role="dialog" aria-labelledby="mj-sheet-title">
        <div class="mj-sheet__handle" aria-hidden="true" />

        <div class="mj-sheet__head">
          <h2 id="mj-sheet-title" class="mj-sheet__title">游戏说明</h2>
          <button type="button" class="mj-sheet__close" aria-label="关闭" @click="emit('close')">×</button>
        </div>

        <div class="mj-sheet__tabs">
          <button
            type="button"
            class="mj-sheet__tab"
            :class="{ 'is-active': tab === 'pay' }"
            @click="tab = 'pay'"
          >
            赔付表
          </button>
          <button
            type="button"
            class="mj-sheet__tab"
            :class="{ 'is-active': tab === 'rules' }"
            @click="tab = 'rules'"
          >
            规则
          </button>
        </div>

        <div class="mj-sheet__body">
          <!-- 赔付表 -->
          <div v-if="tab === 'pay'" class="mj-pay">
            <div class="mj-info-pills">
              <div class="mj-info-pill">
                <span class="mj-info-pill__label">投注总额</span>
                <span class="mj-info-pill__value">¥{{ betAmount.toFixed(2) }}</span>
              </div>
              <div class="mj-info-pill">
                <span class="mj-info-pill__label">中奖路数</span>
                <span class="mj-info-pill__value">1024</span>
              </div>
              <div class="mj-info-pill">
                <span class="mj-info-pill__label">基础投注</span>
                <span class="mj-info-pill__value">{{ baseBet }}</span>
              </div>
            </div>

            <section class="mj-block">
              <h3 class="mj-block__title">特殊符号</h3>
              <div class="mj-special-grid">
                <div class="mj-special-card">
                  <img :src="`${symBase}/wild.png`" class="mj-special-card__icon" alt="" />
                  <div class="mj-special-card__text">
                    <strong>百搭</strong>
                    <span>可替代除「胡」外所有符号</span>
                  </div>
                </div>
                <div class="mj-special-card">
                  <img :src="`${symBase}/hu.png`" class="mj-special-card__icon" alt="" />
                  <div class="mj-special-card__text">
                    <strong>胡（Scatter）</strong>
                    <span>3 个触发 12 次免费旋转，每多 1 个 +2 次</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="mj-block">
              <h3 class="mj-block__title">符号赔付</h3>
              <p class="mj-block__sub">从左至右 3 / 4 / 5 连，以下为当前投注对应金额</p>

              <div class="mj-pay-list">
                <div v-for="id in paySymbols" :key="id" class="mj-pay-row">
                  <div class="mj-pay-row__symbol">
                    <img :src="`${symBase}/${id}.png`" class="mj-pay-row__icon" alt="" />
                    <span class="mj-pay-row__name">{{ labels[id] }}</span>
                  </div>
                  <div class="mj-pay-row__pays">
                    <div class="mj-pay-cell">
                      <span class="mj-pay-cell__tag">×3</span>
                      <span class="mj-pay-cell__amt">¥{{ formatPay(id, 0) }}</span>
                    </div>
                    <div class="mj-pay-cell">
                      <span class="mj-pay-cell__tag">×4</span>
                      <span class="mj-pay-cell__amt">¥{{ formatPay(id, 1) }}</span>
                    </div>
                    <div class="mj-pay-cell mj-pay-cell--max">
                      <span class="mj-pay-cell__tag">×5</span>
                      <span class="mj-pay-cell__amt">¥{{ formatPay(id, 2) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mj-formula-box">
                <span class="mj-formula-box__label">计算公式</span>
                <p class="mj-formula-box__text">
                  中奖金额 =（投注总额 ÷ 20）× 符号赔付 × 中奖路数 × 连击倍数
                </p>
              </div>
            </section>

            <section class="mj-block">
              <h3 class="mj-block__title">连击倍数</h3>
              <div class="mj-mult-ladder">
                <div class="mj-mult-group">
                  <span class="mj-mult-group__label">主游戏</span>
                  <div class="mj-mult-chips">
                    <span v-for="m in cascadeMults" :key="`c-${m}`" class="mj-mult-chip">×{{ m }}</span>
                  </div>
                </div>
                <div class="mj-mult-group">
                  <span class="mj-mult-group__label">免费旋转</span>
                  <div class="mj-mult-chips">
                    <span v-for="m in freeSpinMults" :key="`f-${m}`" class="mj-mult-chip mj-mult-chip--free">×{{ m }}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- 规则 -->
          <div v-else class="mj-rules">
            <section class="mj-rule-card">
              <div class="mj-rule-card__badge">1</div>
              <div>
                <h3>游戏简介</h3>
                <p>
                  《麻将胡了》为 5 轴 4 行视频老虎机，共 1024 条固定中奖路。符号从左至右连续出现在相邻转轴即可中奖，位置不限行。
                </p>
              </div>
            </section>

            <section class="mj-rule-card">
              <div class="mj-rule-card__badge">2</div>
              <div>
                <h3>级联消除</h3>
                <p>
                  中奖符号消除后，上方符号下落补位，可连续触发新的中奖。每轮连击倍数递增：
                </p>
                <div class="mj-mult-chips mj-mult-chips--inline">
                  <span v-for="(m, i) in cascadeMults" :key="`rc-${m}`" class="mj-mult-chip">
                    <template v-if="i > 0">→</template>
                    ×{{ m }}
                  </span>
                </div>
                <p class="mj-rule-card__extra">
                  免费旋转内为 ×2 → ×4 → ×6 → ×10。
                </p>
              </div>
            </section>

            <section class="mj-rule-card">
              <div class="mj-rule-card__badge">3</div>
              <div>
                <h3>镀金符号</h3>
                <p>
                  第 2、3、4 轴上的普通符号可能带金色边框。参与中奖后转为百搭，帮助延续连击。
                </p>
              </div>
            </section>

            <section class="mj-rule-card">
              <div class="mj-rule-card__badge">4</div>
              <div>
                <h3>免费旋转</h3>
                <p>
                  任意位置出现 3 个及以上「胡」符号触发免费旋转（含级联过程中）。基础 12 次，每多 1 个 Scatter 额外 +2 次，可重复触发。
                </p>
              </div>
            </section>

            <section class="mj-rule-card">
              <div class="mj-rule-card__badge">5</div>
              <div>
                <h3>投注设置</h3>
                <p>
                  投注总额 = 投注大小 × 投注倍数 × 基础投注（20）。点击底部金额栏可调整投注。
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  BASE_BET,
  PAY_SYMBOLS,
  PAYTABLE,
  SYMBOL_LABELS,
  CASCADE_MULTIPLIERS,
  FREE_SPIN_MULTIPLIERS,
  type PaySymbolId,
} from '../games/mahjong/mahjongWays1'

const props = defineProps<{
  visible: boolean
  initialTab?: 'pay' | 'rules'
  betAmount: number
}>()

const emit = defineEmits<{ close: [] }>()

const symBase = '/images/games/mahjong/classic/symbols'
const baseBet = BASE_BET
const paySymbols = PAY_SYMBOLS
const labels = SYMBOL_LABELS
const cascadeMults = CASCADE_MULTIPLIERS
const freeSpinMults = FREE_SPIN_MULTIPLIERS
const tab = ref<'pay' | 'rules'>(props.initialTab ?? 'pay')

watch(
  () => props.initialTab,
  (v) => {
    if (v) tab.value = v
  },
)

watch(
  () => props.visible,
  (v) => {
    if (v && props.initialTab) tab.value = props.initialTab
  },
)

function formatPay(id: PaySymbolId, idx: 0 | 1 | 2): string {
  const unit = props.betAmount / BASE_BET
  return (unit * PAYTABLE[id][idx]).toFixed(2)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+QingKe+HuangYou&display=swap');

.mj-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

.mj-sheet {
  width: 100%;
  max-width: 520px;
  max-height: min(88vh, 760px);
  background: linear-gradient(180deg, rgba(22, 10, 6, 0.99) 0%, rgba(10, 5, 3, 0.995) 100%);
  border: 1px solid rgba(255, 200, 90, 0.42);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 36px rgba(0, 0, 0, 0.55);
}

.mj-sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 210, 120, 0.35);
  margin: 10px auto 0;
  flex-shrink: 0;
}

.mj-sheet__head {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 10px 16px 6px;
  flex-shrink: 0;
}

.mj-sheet__title {
  margin: 0;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', sans-serif;
  font-size: clamp(18px, 4.8vw, 22px);
  font-weight: 400;
  color: #ffd878;
  letter-spacing: 2px;
  text-shadow: 0 0 8px rgba(255, 180, 60, 0.45);
}

.mj-sheet__close {
  position: absolute;
  right: 14px;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 180, 80, 0.28);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: #ffb4a8;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, background 0.15s;
}

.mj-sheet__close:hover {
  transform: scale(1.06);
  background: rgba(255, 120, 80, 0.12);
}

.mj-sheet__tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  flex-shrink: 0;
}

.mj-sheet__tab {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid rgba(255, 200, 100, 0.22);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 220, 180, 0.72);
  font-size: 14px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}

.mj-sheet__tab.is-active {
  background: linear-gradient(180deg, rgba(255, 190, 60, 0.18) 0%, rgba(140, 50, 20, 0.12) 100%);
  border-color: rgba(255, 200, 90, 0.55);
  color: #fff8e8;
  text-shadow: 0 0 6px rgba(255, 180, 60, 0.35);
}

.mj-sheet__body {
  overflow-y: auto;
  padding: 4px 16px calc(20px + env(safe-area-inset-bottom, 0px));
  color: rgba(255, 240, 220, 0.88);
  font-size: 13px;
  line-height: 1.6;
  -webkit-overflow-scrolling: touch;
}

/* 通用信息块 */
.mj-info-pills {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.mj-info-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 200, 100, 0.16);
}

.mj-info-pill__label {
  font-size: 11px;
  color: rgba(255, 210, 160, 0.65);
  white-space: nowrap;
}

.mj-info-pill__value {
  font-size: 14px;
  font-weight: 600;
  color: #fff3dc;
  font-variant-numeric: tabular-nums;
}

.mj-block {
  margin-bottom: 18px;
}

.mj-block__title {
  margin: 0 0 8px;
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: #ffd080;
  letter-spacing: 1px;
}

.mj-block__sub {
  margin: 0 0 10px;
  font-size: 12px;
  color: rgba(255, 220, 190, 0.55);
}

/* 特殊符号 */
.mj-special-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mj-special-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 200, 100, 0.14);
  text-align: center;
}

.mj-special-card__icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(255, 200, 80, 0.35));
}

.mj-special-card__text strong {
  display: block;
  color: #fff8ec;
  font-size: 13px;
  margin-bottom: 4px;
}

.mj-special-card__text span {
  font-size: 11px;
  color: rgba(255, 220, 190, 0.6);
  line-height: 1.45;
}

/* 赔付列表 */
.mj-pay-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mj-pay-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.mj-pay-row__symbol {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

.mj-pay-row__icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}

.mj-pay-row__name {
  font-size: 12px;
  color: rgba(255, 235, 210, 0.85);
  white-space: nowrap;
}

.mj-pay-row__pays {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.mj-pay-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 52px;
  padding: 4px 4px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.18);
}

.mj-pay-cell--max {
  background: rgba(255, 160, 70, 0.12);
  border: 1px solid rgba(255, 180, 90, 0.25);
}

.mj-pay-cell__tag {
  font-size: 10px;
  color: rgba(255, 200, 130, 0.65);
}

.mj-pay-cell__amt {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #fff3dc;
}

.mj-pay-cell--max .mj-pay-cell__amt {
  color: #ffe8b8;
  text-shadow: 0 0 6px rgba(255, 160, 70, 0.4);
}

.mj-formula-box {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 190, 60, 0.08);
  border: 1px solid rgba(255, 200, 90, 0.22);
}

.mj-formula-box__label {
  display: block;
  font-size: 11px;
  color: rgba(255, 210, 150, 0.75);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.mj-formula-box__text {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 240, 220, 0.82);
  line-height: 1.55;
}

/* 倍数阶梯 */
.mj-mult-ladder {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mj-mult-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mj-mult-group__label {
  font-size: 12px;
  color: rgba(255, 210, 160, 0.65);
}

.mj-mult-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.mj-mult-chips--inline {
  margin-top: 8px;
}

.mj-mult-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 200, 100, 0.1);
  border: 1px solid rgba(255, 200, 90, 0.28);
  color: #ffe8b0;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.mj-mult-chip--free {
  background: rgba(255, 140, 80, 0.12);
  border-color: rgba(255, 160, 90, 0.35);
  color: #ffd4a8;
}

/* 规则卡片 */
.mj-rules {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mj-rule-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 200, 100, 0.12);
}

.mj-rule-card__badge {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 190, 60, 0.15);
  border: 1px solid rgba(255, 200, 90, 0.4);
  color: #ffd878;
  font-size: 13px;
  font-weight: 700;
}

.mj-rule-card h3 {
  margin: 0 0 6px;
  font-family: 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: 15px;
  font-weight: 400;
  color: #ffd080;
  letter-spacing: 0.5px;
}

.mj-rule-card p {
  margin: 0;
  color: rgba(255, 235, 210, 0.78);
  font-size: 13px;
  line-height: 1.6;
}

.mj-rule-card__extra {
  margin-top: 8px !important;
  font-size: 12px !important;
  color: rgba(255, 210, 160, 0.65) !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (min-width: 520px) {
  .mj-sheet-mask {
    align-items: center;
    padding: 16px;
  }

  .mj-sheet {
    border-radius: 16px;
    border-bottom: 1px solid rgba(255, 200, 90, 0.42);
    max-height: 85vh;
  }

  .mj-sheet__handle {
    display: none;
  }
}
</style>
