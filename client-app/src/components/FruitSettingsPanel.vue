<template>
  <div class="fruit-set-root" @click.self="emit('close')">
    <div class="fruit-set-panel" role="dialog" aria-labelledby="fruit-set-title">
      <div class="fruit-set-head">
        <h3 id="fruit-set-title">设置</h3>
        <button type="button" class="fruit-set-close" @click="emit('close')">关闭</button>
      </div>

      <div class="fruit-set-body">
        <div class="fruit-set-row">
          <span class="fruit-set-label">音乐</span>
          <button
            type="button"
            class="fruit-set-switch"
            :class="{ on: bgmOn }"
            role="switch"
            :aria-checked="bgmOn"
            aria-label="音乐"
            @click="toggleBgm"
          >
            <span class="knob" />
          </button>
        </div>
        <div class="fruit-set-row">
          <span class="fruit-set-label">音效</span>
          <button
            type="button"
            class="fruit-set-switch"
            :class="{ on: sfxOn }"
            role="switch"
            :aria-checked="sfxOn"
            aria-label="音效"
            @click="toggleSfx"
          >
            <span class="knob" />
          </button>
        </div>
      </div>

      <div class="fruit-set-foot">
        <button type="button" class="fruit-set-ok" @click="emit('close')">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  isFruitBgmMuted,
  isFruitSfxMuted,
  setFruitBgmMuted,
  setFruitSfxMuted,
  startFruitBgm,
  unlockFruitAudio,
  playFruitSfx,
} from '@/games/slots/fruitAudio'

const emit = defineEmits<{
  close: []
}>()

const bgmOn = ref(true)
const sfxOn = ref(true)

onMounted(() => {
  bgmOn.value = !isFruitBgmMuted()
  sfxOn.value = !isFruitSfxMuted()
})

function toggleBgm() {
  unlockFruitAudio()
  bgmOn.value = !bgmOn.value
  setFruitBgmMuted(!bgmOn.value)
  if (bgmOn.value) startFruitBgm()
  if (sfxOn.value) playFruitSfx('click', 0.45)
}

function toggleSfx() {
  unlockFruitAudio()
  sfxOn.value = !sfxOn.value
  setFruitSfxMuted(!sfxOn.value)
  if (sfxOn.value) playFruitSfx('click', 0.45)
}
</script>

<style scoped>
.fruit-set-root {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.62);
}

.fruit-set-panel {
  width: min(92vw, 340px);
  border-radius: 14px;
  border: 1px solid rgba(244, 211, 107, 0.4);
  background: linear-gradient(180deg, #2a1c10 0%, #140e08 100%);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  color: #f5e6c8;
}

.fruit-set-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(244, 211, 107, 0.22);
}

.fruit-set-head h3 {
  margin: 0;
  font-size: 16px;
  letter-spacing: 0.12em;
  color: #ffe7a0;
}

.fruit-set-close {
  border: 1px solid rgba(244, 211, 107, 0.35);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  color: #f5e0c0;
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.fruit-set-body {
  padding: 28px 28px 12px;
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.fruit-set-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
}

.fruit-set-label {
  font-size: 16px;
  letter-spacing: 0.16em;
  color: #f5e0c0;
}

.fruit-set-switch {
  position: relative;
  width: 66px;
  height: 34px;
  border: 1px solid rgba(244, 211, 107, 0.35);
  border-radius: 17px;
  padding: 0;
  background: #3a2a18;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.fruit-set-switch.on {
  background: linear-gradient(180deg, #c9a24a 0%, #8a6420 100%);
  border-color: rgba(255, 230, 150, 0.65);
}

.fruit-set-switch .knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff8e8 0%, #f0d9a0 100%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  transition: transform 0.18s ease;
}

.fruit-set-switch.on .knob {
  transform: translateX(32px);
}

.fruit-set-foot {
  padding: 8px 16px 18px;
  display: flex;
  justify-content: center;
}

.fruit-set-ok {
  min-width: 120px;
  border: 1px solid rgba(244, 211, 107, 0.5);
  border-radius: 999px;
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #2a1a08;
  background: linear-gradient(180deg, #ffe9a8 0%, #d4a040 55%, #a07828 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.fruit-set-ok:active {
  transform: scale(0.96);
  filter: brightness(1.08);
}
</style>
