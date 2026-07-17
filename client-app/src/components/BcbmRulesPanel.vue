<template>
  <!--
    官方 GameRuleConfig mobile：480×715，4 页
    0 玩法说明 / 1 赔率 / 2 特殊奖励(大三元·大四喜·极速) / 3 特殊奖励(U弯·闪电·漂移)
  -->
  <div class="rules-root" @click.self="emit('close')">
    <div class="rules-panel">
      <div class="border-outer" aria-hidden="true" />

      <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">
        <img :src="R.close" alt="" draggable="false" />
      </button>

      <button
        v-show="page > 0"
        type="button"
        class="nav prev"
        aria-label="上一页"
        @click="page--"
      >
        <img :src="R.arrow" alt="" draggable="false" />
      </button>
      <button
        v-show="page < 3"
        type="button"
        class="nav next"
        aria-label="下一页"
        @click="page++"
      >
        <img :src="R.arrow" alt="" draggable="false" />
      </button>

      <div class="pages" :style="{ transform: `translateX(${-page * 100}%)` }">
        <!-- Page 0：玩法说明 -->
        <section class="page">
          <div class="top">
            <img class="title" :src="R.title" alt="游戏规则" draggable="false" />
          </div>
          <div class="body scroll">
            <p class="line">{{ T.p1_1 }}</p>
            <div class="brands">
              <img
                v-for="b in brands"
                :key="b.id"
                class="brand-img"
                :src="rul(`yben_rul_icon_large_${b.file}_blue.png`)"
                :alt="b.label"
                draggable="false"
              />
            </div>
            <p class="line" v-html="T.p1_2" />
            <p class="line">{{ T.p1_3 }}</p>
            <p class="line">{{ T.p1_payout }}</p>
            <div class="odds-sample">
              <img :src="rul('yben_rul_icon_rules_2000.png')" alt="" draggable="false" />
              <img :src="rul('yben_rul_icon_rules_x22.png')" alt="" draggable="false" />
            </div>
            <div v-for="row in howtoRows" :key="row.desc" class="howto">
              <img class="howto-icon" :src="row.icon" alt="" draggable="false" />
              <div class="howto-desc">{{ row.desc }}</div>
            </div>
          </div>
        </section>

        <!-- Page 1：赔率 -->
        <section class="page">
          <div class="top">
            <img class="title" :src="R.title" alt="游戏规则" draggable="false" />
            <p class="section-title">{{ T.p1_8 }}</p>
          </div>
          <div class="body scroll odds-page">
            <div class="odds-grid">
              <div v-for="row in oddsRows" :key="row[0]!.id" class="odds-row">
                <div v-for="s in row" :key="s.id" class="odds-cell">
                  <img
                    :src="rul(`yben_rul_icon_${s.brandFile}_${s.color}.png`)"
                    alt=""
                    draggable="false"
                  />
                  <span>{{ s.mult }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Page 2：特殊奖励 1–3 -->
        <section class="page">
          <div class="top">
            <img class="title" :src="R.title" alt="游戏规则" draggable="false" />
            <p class="section-title">特殊奖励</p>
          </div>
          <div class="body scroll">
            <p class="line intro">{{ T.p2_7 }}</p>
            <div
              v-for="b in bonuses.slice(0, 3)"
              :key="b.key"
              class="bonus"
            >
              <img class="bonus-icon" :src="b.icon" alt="" draggable="false" />
              <div class="bonus-copy">
                <img class="bonus-name" :src="b.name" alt="" draggable="false" />
                <p class="bonus-desc">{{ b.desc }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Page 3：特殊奖励 4–6 -->
        <section class="page">
          <div class="top">
            <img class="title" :src="R.title" alt="游戏规则" draggable="false" />
          </div>
          <div class="body scroll bonus-page">
            <div
              v-for="b in bonuses.slice(3)"
              :key="b.key"
              class="bonus"
            >
              <img class="bonus-icon" :src="b.icon" alt="" draggable="false" />
              <div class="bonus-copy">
                <img class="bonus-name" :src="b.name" alt="" draggable="false" />
                <p class="bonus-desc">{{ b.desc }}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="dots" aria-hidden="true">
        <span
          v-for="i in 4"
          :key="i"
          class="dot"
          :class="{ on: page === i - 1 }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { BCBM_BET_SLOTS } from '@/games/bcbm'

const props = withDefaults(
  defineProps<{
    /** 官方 popupGameRule(pageIndex)，历史条点击传 1=赔率页 */
    initialPage?: number
  }>(),
  { initialPage: 0 },
)

const emit = defineEmits<{ close: [] }>()

const RUL = '/images/games/bcbm/benz/rules'
const rul = (name: string) => `${RUL}/${name}`

const R = {
  close: rul('yben_msc_btn_close.png'),
  arrow: rul('yben_rul_btn_rule_arrow.png'),
  title: rul('yben_rul_txt_title_lang_hans.png'),
}

/** 文案对齐官网截图 / Benz_hans */
const T = {
  p1_1: '整个游戏共有12个下注区域，包括以下四种车标：',
  p1_2:
    '每种车标有<span class="c-red">红</span>、<span class="c-green">绿</span>、<span class="c-yellow">黄</span>3种颜色，一共12种车标进行押注，玩家可以任意选择一个或者多个车标进行押注',
  p1_3: '游戏开始，转圈开始转动，几圈以后转圈停下，显示于中央的车标为该次游戏开奖结果',
  p1_payout: '派彩金额为押注金额乘以赔率',
  p1_4: '可以自动进行押注',
  p1_5: '可以清空当前押注，并且返回相应押注',
  p1_6: '可以撤销上一步投注',
  p1_7: '完成下注后按「开始」转动转盘',
  p1_8: '赔率',
  p2_1: '同一种车的三种颜色均为中奖',
  p2_2: '同一种颜色的四种车标均为中奖',
  p2_3: '从结果灯开始顺时针数的5个图案均为中奖图案',
  p2_4: '中奖结果和前后第五个图案均为中奖',
  p2_5: '使中奖金额翻倍',
  p2_6: '所有奖项均为中奖',
  p2_7: '本游戏有六个随机触发特殊奖励',
}

const page = ref(0)
watch(
  () => props.initialPage,
  (v) => {
    page.value = Math.max(0, Math.min(3, Number(v) || 0))
  },
  { immediate: true },
)

const brands = [
  { id: 'vw', file: 'volkswagen', label: '大众' },
  { id: 'bmw', file: 'bmw', label: '宝马' },
  { id: 'benz', file: 'benz', label: '奔驰' },
  { id: 'audi', file: 'audi', label: '奥迪' },
]

/** 按钮图已含文字，右侧只放说明（对齐官网） */
const howtoRows = [
  { icon: rul('yben_rul_btn_rules_auto_lang_hans.png'), desc: T.p1_4 },
  { icon: rul('yben_rul_btn_rules_clear_lang_hans.png'), desc: T.p1_5 },
  { icon: rul('yben_rul_btn_rules_undo.png'), desc: T.p1_6 },
  { icon: rul('yben_rul_btn_rules_start_lang_hans.png'), desc: T.p1_7 },
]

const brandFile = (brand: string) => (brand === 'vw' ? 'volkswagen' : brand)

const oddsFlat = BCBM_BET_SLOTS.map((s) => ({
  ...s,
  brandFile: brandFile(s.brand),
}))

/** 官网赔率页：奔驰→宝马→奥迪→大众，每行 红|绿|黄 */
const oddsRows = [
  oddsFlat.filter((s) => s.brand === 'benz'),
  oddsFlat.filter((s) => s.brand === 'bmw'),
  oddsFlat.filter((s) => s.brand === 'audi'),
  oddsFlat.filter((s) => s.brand === 'vw'),
]

const bonuses = [
  {
    key: 'sanyuan',
    icon: rul('yben_rul_icon_three_great_scholars.png'),
    name: rul('yben_rul_txt_three_great_scholars_lang_hans.png'),
    desc: T.p2_1,
  },
  {
    key: 'sixi',
    icon: rul('yben_rul_icon_four_great_blessings.png'),
    name: rul('yben_rul_txt_four_great_blessings_lang_hans.png'),
    desc: T.p2_2,
  },
  {
    key: 'fast',
    icon: rul('yben_rul_icon_fast_and_furious.png'),
    name: rul('yben_rul_txt_fast_and_furious_lang_hans.png'),
    desc: T.p2_3,
  },
  {
    key: 'uturn',
    icon: rul('yben_rul_icon_U_turn.png'),
    name: rul('yben_rul_txt_u_turn_lang_hans.png'),
    desc: T.p2_4,
  },
  {
    key: 'lightning',
    icon: rul('yben_rul_icon_lightning_bolt.png'),
    name: rul('yben_rul_txt_lightning_bolt_lang_hans.png'),
    desc: T.p2_5,
  },
  {
    key: 'drift',
    icon: rul('yben_rul_icon_total_drift.png'),
    name: rul('yben_rul_txt_total_drift_lang_hans.png'),
    desc: T.p2_6,
  },
]
</script>

<style scoped>
.rules-root {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: stretch;
  justify-content: center;
}
.rules-panel {
  position: relative;
  width: 480px;
  height: 715px;
  overflow: hidden;
  color: #fff;
}
.border-outer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  border-style: solid;
  border-width: 48px 59px 73px 52px;
  border-image-source: url('/images/games/bcbm/benz/main/yben_ui_geniric_border.png');
  border-image-slice: 48 59 73 52 fill;
  border-image-repeat: stretch;
  background: #061828;
}
.close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 5;
  border: 0;
  padding: 0;
  background: transparent;
  width: 44px;
  height: 44px;
  cursor: pointer;
}
.close-btn img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.nav {
  position: absolute;
  top: 50%;
  z-index: 5;
  border: 0;
  padding: 0;
  background: transparent;
  width: 36px;
  height: 56px;
  margin-top: -28px;
  cursor: pointer;
}
.nav img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.nav.prev {
  left: 6px;
}
.nav.next {
  right: 6px;
}
.nav.next img {
  transform: scaleX(-1);
}
/*
 * 容器宽=面板宽；每页 flex-basis 100%。
 * translateX(-n*100%) 相对容器自身宽度 = 正好滑一页。
 * 旧写法 width:400% + -100% 会一次滑过全部四页，后三页看起来是空的。
 */
.pages {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.28s ease;
  z-index: 1;
}
.page {
  flex: 0 0 100%;
  width: 100%;
  height: 715px;
  box-sizing: border-box;
  padding: 36px 48px 58px;
  display: flex;
  flex-direction: column;
}
.top {
  text-align: center;
  flex: 0 0 auto;
  padding-top: 4px;
}
.title {
  display: block;
  margin: 0 auto 8px;
  max-width: 260px;
  height: auto;
  filter: drop-shadow(0 0 10px rgba(80, 200, 255, 0.75));
}
.body {
  flex: 1 1 auto;
  min-height: 0;
}
.scroll {
  overflow-y: auto;
  padding-right: 2px;
}
.line {
  margin: 7px 0;
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
  color: #fff;
}
.line.intro {
  text-align: center;
  margin: 4px 0 16px;
}
.section-title {
  margin: 2px 0 10px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
  color: #5ec8ff;
  text-shadow: 0 0 8px rgba(80, 200, 255, 0.55);
}
.brands {
  display: flex;
  justify-content: center;
  gap: 18px;
  margin: 10px 0 12px;
}
.brand-img {
  width: 52px;
  height: 52px;
  object-fit: contain;
}
.odds-sample {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 6px 0 8px;
}
.odds-sample img {
  height: 34px;
  width: auto;
  object-fit: contain;
}
.howto {
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 10px 0;
}
.howto-icon {
  width: 72px;
  height: 48px;
  object-fit: contain;
  flex: 0 0 auto;
}
.howto-desc {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
  color: #fff;
}
.odds-page {
  display: flex;
  align-items: center;
}
.odds-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 4px 12px;
}
.odds-row {
  display: flex;
  justify-content: space-around;
}
.odds-cell {
  width: 100px;
  text-align: center;
}
.odds-cell img {
  width: 68px;
  height: 68px;
  object-fit: contain;
  display: block;
  margin: 0 auto 6px;
}
.odds-cell span {
  font-size: 18px;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.bonus-page {
  padding-top: 12px;
}
.bonus {
  display: grid;
  grid-template-columns: 96px 1fr;
  column-gap: 12px;
  align-items: center;
  margin: 0 0 22px;
}
.bonus-icon {
  width: 88px;
  height: 72px;
  object-fit: contain;
  justify-self: center;
}
.bonus-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 0;
}
.bonus-name {
  max-width: 220px;
  height: auto;
  object-fit: contain;
  margin-bottom: 6px;
  filter: drop-shadow(0 0 6px rgba(80, 200, 255, 0.65));
}
.bonus-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: #fff;
}
.dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 22px;
  display: flex;
  justify-content: center;
  gap: 10px;
  z-index: 5;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  box-sizing: border-box;
  border: 1.5px solid rgba(255, 255, 255, 0.85);
  background: transparent;
}
.dot.on {
  width: 11px;
  height: 11px;
  border-color: #3aa0ff;
  background: #3aa0ff;
  box-shadow: 0 0 8px rgba(58, 160, 255, 0.8);
}
:deep(.c-red) {
  color: #ff3030;
}
:deep(.c-green) {
  color: #85ff00;
}
:deep(.c-yellow) {
  color: #feef00;
}
</style>
