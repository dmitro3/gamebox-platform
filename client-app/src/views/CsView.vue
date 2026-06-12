<template>
  <div class="page cs-page">
    <div class="cs-header">
      <span class="title">客服中心</span>
    </div>

    <!-- 联系方式 -->
    <div class="contact-card">
      <div class="cc-title">在线客服</div>
      <div class="cc-sub">7×24 小时为您服务</div>
      <div class="contact-btns">
        <button class="contact-btn tg" @click="copyContact('@gamebox_cs', 'Telegram')">
          <span class="cb-icon">✈</span>
          <span>Telegram 客服</span>
        </button>
        <button class="contact-btn qq" @click="copyContact('800800800', 'QQ')">
          <span class="cb-icon">🐧</span>
          <span>QQ 客服</span>
        </button>
      </div>
    </div>

    <!-- 常见问题 -->
    <div class="faq-section">
      <div class="section-title">常见问题</div>
      <div v-for="(f, i) in FAQS" :key="i" class="faq-item" @click="toggleFaq(i)">
        <div class="faq-q">
          <span>{{ f.q }}</span>
          <span class="faq-arrow" :class="{ open: openIdx === i }">›</span>
        </div>
        <transition name="faq">
          <div v-if="openIdx === i" class="faq-a">{{ f.a }}</div>
        </transition>
      </div>
    </div>

    <div class="page-bottom-spacer" />
    <TabBar />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/composables/useToast'
import TabBar from '@/components/TabBar.vue'

const { success: toastOk, error: toastErr } = useToast()
const openIdx = ref<number | null>(null)

const FAQS = [
  { q: '如何充值（上分）？', a: '进入「充值」页面提交上分申请，联系您的上级代理或在线客服完成转账后，等待审核通过，积分即时到账。' },
  { q: '如何提现（下分）？', a: '在「充值」页切换到下分，输入金额提交申请。提交后金额将被冻结，审核通过后由平台打款；若被拒绝，冻结金额自动退回。' },
  { q: '提现多久到账？', a: '审核通常在 30 分钟内完成，高峰期最长不超过 24 小时。如超时请联系在线客服并提供您的 UID。' },
  { q: '游戏结果公平吗？', a: '所有游戏采用「可证明公平」机制：每局开始前先公布种子哈希（承诺），结算后公开种子原文，您可自行校验结果未被篡改。' },
  { q: '如何成为代理赚佣金？', a: '在「我的 → 代理中心」获取专属邀请码，下级注册时填写即建立绑定。下级产生的有效流水将按比例转为您的佣金，等级越高比例越高。' },
  { q: '忘记密码怎么办？', a: '请联系在线客服并提供注册账号与 UID，人工核验身份后协助重置密码。' },
]

function toggleFaq(i: number) {
  openIdx.value = openIdx.value === i ? null : i
}

async function copyContact(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toastOk(`${label} 账号已复制：${value}`)
  } catch {
    toastErr(`请手动添加 ${label}：${value}`)
  }
}
</script>

<style scoped>
.cs-page { min-height: 100vh; background: #060c0a; color: #fff; padding-bottom: 60px; }

.cs-header {
  display: flex; align-items: center; justify-content: center;
  padding: 14px 16px; background: rgba(8,18,14,0.96);
  border-bottom: 1px solid rgba(0,200,140,0.2);
}
.title { font-size: 18px; font-weight: 700; color: #4be0a8; }

.contact-card {
  margin: 16px; padding: 20px 16px; border-radius: 16px; text-align: center;
  background: linear-gradient(135deg, rgba(0,80,55,0.5), rgba(5,25,18,0.85));
  border: 1px solid rgba(0,200,140,0.3);
}
.cc-title { font-size: 18px; font-weight: 700; color: #4be0a8; }
.cc-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin: 4px 0 16px; }
.contact-btns { display: flex; gap: 12px; }
.contact-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 8px; border-radius: 12px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06);
  color: #fff; font-size: 14px; font-weight: 600; transition: all 0.15s;
}
.contact-btn.tg { border-color: rgba(60,160,255,0.4); color: #6cb8ff; }
.contact-btn.qq { border-color: rgba(255,200,60,0.4); color: #ffd25a; }
.contact-btn:active { transform: scale(0.97); }
.cb-icon { font-size: 17px; }

.faq-section { padding: 0 16px; }
.section-title { font-size: 14px; font-weight: 600; color: #4be0a8; margin: 8px 0 10px; border-left: 3px solid #4be0a8; padding-left: 8px; }

.faq-item {
  border-radius: 10px; margin-bottom: 8px; overflow: hidden;
  background: rgba(15,30,24,0.6); border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
}
.faq-q {
  display: flex; justify-content: space-between; align-items: center;
  padding: 13px 14px; font-size: 14px; font-weight: 500;
}
.faq-arrow { font-size: 18px; color: rgba(255,255,255,0.3); transition: transform 0.2s; }
.faq-arrow.open { transform: rotate(90deg); }
.faq-a {
  padding: 0 14px 13px; font-size: 13px; line-height: 1.7;
  color: rgba(255,255,255,0.55);
}
.faq-enter-active, .faq-leave-active { transition: all 0.2s; }
.faq-enter-from, .faq-leave-to { opacity: 0; transform: translateY(-4px); }

.page-bottom-spacer { height: 80px; }
</style>
