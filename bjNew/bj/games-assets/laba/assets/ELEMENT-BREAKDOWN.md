# 777 经典拉霸 · 参考图元素拆分与 AI 重绘清单

> 参考图来源：`C:\Users\pc\Desktop\jyh`（微信截图）  
> 所有成品均为 **AI 独立重绘 + PS 级后处理**，不直接裁剪截图。

参考风格：紫蓝霓虹机台 · 橙红点缀 · 赌场模糊背景 · 3 轴 1 线经典水果机

---

## 一、界面分区（竖屏自上而下）

| 分区 | 高度占比 | 元素 |
|------|----------|------|
| 顶栏 | 0–8% | 返回、777 经典拉霸标题横幅 |
| 赔付表 | 8–22% | 右侧/顶部赔付列表面板框 |
| 机台区 | 22–58% | 霓虹机柜框 + 3 轴转轴窗 + 中奖线箭头 |
| 结果条 | 58–62% | 中奖提示文字区 |
| 统计栏 | 62–72% | 余额 / 投注 / 盈利 三槽 |
| 操控区 | 72–100% | 极速、±、旋转、自动、菜单 |

---

## 二、独立元素清单（共 24 项）

### A. 背景 / 框架（5）

| ID | 成品路径 | 尺寸参考 | 说明 |
|----|----------|----------|------|
| `room-bg` | `assets/room-bg.jpg` | 1080×1920 | 赌场大厅模糊背景，紫蓝氛围光 |
| `splash` | `assets/splash.png` | 1080×1920 | 加载页：777 + 经典拉霸 + 水果机 |
| `top-header` | `assets/top-header.png` | 1080×280 | 顶部「777 经典拉霸」霓虹标题条 |
| `machine-frame` | `assets/machine-frame.png` | 960×520 | 机台外框：紫蓝霓虹 + 橙边 + 3 窗格 |
| `bottom-deco` | `assets/bottom-deco.png` | 1080×360 | 底栏雕花木纹/金属框 + 三统计槽 |

### B. 转轴符号（9，各含透明底）

| ID | 成品路径 | 说明 |
|----|----------|------|
| `sym-bar3` | `assets/tiles/bar3.png` | 三层 stacked BAR，白字黑底块 |
| `sym-bar2` | `assets/tiles/bar2.png` | 双层 BAR |
| `sym-bar1` | `assets/tiles/bar1.png` | 单层 BAR |
| `sym-seven` | `assets/tiles/seven.png` | 红色立体 77，黑描边高光 |
| `sym-watermelon` | `assets/tiles/watermelon.png` | 西瓜切片，写实光泽 |
| `sym-bell` | `assets/tiles/bell.png` | 双金色铃铛叠放 |
| `sym-cherry` | `assets/tiles/cherry.png` | 两颗樱桃带梗 |
| `sym-orange` | `assets/tiles/orange.png` | 整颗橙子 |
| `sym-lemon` | `assets/tiles/lemon.png` | 整颗柠檬 |

### C. UI 控件（10）

| ID | 成品路径 | 说明 |
|----|----------|------|
| `spin-btn` | `assets/spin-btn.png` | 大红圆形旋转钮，白箭头环 |
| `icon-turbo` | `assets/icon-turbo.png` | 极速：闪电 + 圆环，64×64 |
| `icon-auto` | `assets/icon-auto.png` | 自动：字母 A 圆钮，64×64 |
| `icon-wallet` | `assets/icon-wallet.png` | 余额钱包，64×64 |
| `icon-coin` | `assets/icon-coin.png` | 投注金币，64×64 |
| `icon-prize` | `assets/icon-prize.png` | 盈利奖杯，64×64 |
| `icon-menu` | `assets/icon-menu.png` | 三横线菜单，64×64 |
| `arrow-l` | `assets/arrow-l.png` | 中奖线左橙色三角箭头 |
| `arrow-r` | `assets/arrow-r.png` | 中奖线右橙色三角箭头 |
| `paytable-panel` | `assets/paytable-panel.png` | 赔付表半透明面板底 |

---

## 三、生产流水线

```
参考截图分析 → ELEMENT-BREAKDOWN.md
        ↓
AI 逐项重绘 → assets/ai-sources/lb-ai-*.png
        ↓
process_lb_ai_assets.py
  · 符号：裁切 216×216 + 锐化 + 透明底
  · 旋转钮：rembg 抠图
  · 背景：9:16 裁切 + 色彩统一
  · 图标：64×64 透明 PNG
        ↓
成品 assets/（游戏可直接加载）
```

一键执行：

```bash
python games-assets/laba/scripts/gen_lb_assets.py
```
