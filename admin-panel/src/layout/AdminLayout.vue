<template>
  <el-container class="admin-root">
    <!-- 侧边栏 -->
    <el-aside :width="collapsed ? '64px' : '220px'" class="aside">
      <div class="logo" @click="router.push('/dashboard')">
        <span class="logo-icon">♛</span>
        <span v-if="!collapsed" class="logo-text">GoldHub Admin</span>
      </div>
      <el-menu
        :default-active="route.name as string"
        :collapse="collapsed"
        :collapse-transition="false"
        background-color="#181c27"
        text-color="#a0a8c0"
        active-text-color="#d4a93c"
        @select="(name: string) => router.push({ name })"
      >
        <el-menu-item index="dashboard"><el-icon><DataAnalysis /></el-icon><template #title>数据看板</template></el-menu-item>
        <el-menu-item index="recharge"><el-icon><Wallet /></el-icon><template #title>上下分审核</template></el-menu-item>
        <el-menu-item index="games"><el-icon><VideoGame /></el-icon><template #title>游戏管理</template></el-menu-item>
        <el-menu-item index="agents"><el-icon><Share /></el-icon><template #title>代理管理</template></el-menu-item>
        <el-menu-item index="risk"><el-icon><Warning /></el-icon><template #title>风控告警</template></el-menu-item>
        <el-menu-item index="logs"><el-icon><Document /></el-icon><template #title>操作日志</template></el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容 -->
    <el-container>
      <el-header class="header">
        <el-button :icon="collapsed ? Expand : Fold" text @click="collapsed = !collapsed" />
        <div class="header-right">
          <span class="nick">{{ store.profile?.nickname }}</span>
          <el-button type="danger" text size="small" @click="doLogout">退出</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import { ElMessageBox } from 'element-plus'
import { DataAnalysis, Wallet, Share, Warning, Document, Expand, Fold, Trophy } from '@element-plus/icons-vue'
const VideoGame = Trophy

const router = useRouter()
const route = useRoute()
const store = useAdminStore()
const collapsed = ref(false)

async function doLogout() {
  await ElMessageBox.confirm('确认退出后台管理系统？', '提示', { type: 'warning' })
  store.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-root { height: 100vh; }
.aside {
  background: #181c27;
  transition: width 0.25s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.logo-icon { font-size: 24px; color: #d4a93c; }
.logo-text { font-size: 15px; font-weight: 700; color: #fff; white-space: nowrap; }
.el-menu { border-right: none; flex: 1; }
.header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.header-right { display: flex; align-items: center; gap: 12px; }
.nick { font-size: 13px; color: #606266; }
.main { background: #f4f6f8; padding: 24px; overflow-y: auto; }
</style>
