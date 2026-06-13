# 经典水果机 · 全页面元素统计 & AI 素材清单

> 版本 2.0 · AI 重绘 + PS 后处理  
> 共 **26 项**独立图片素材（不含共用返回按钮 SVG）

---

## 一、页面元素总览

| 分区 | DOM 类名 | 引用素材数 | 说明 |
|------|----------|-----------|------|
| 加载页 | `.slt-splash` | 1 | 全屏 splash 背景 |
| 场景背景 | `.slt-bg` | 1 | 街机厅景深壁纸 |
| 顶栏 | `.slt-top-header` | 1 | 标题霓虹横幅 |
| 机柜外框 | `.slt-machine__frame` | 1 | 红黄塑料机身 |
| 24 灯位格 | `.slt-slot` | 2 + 8 | 暗格/亮格底 + 8 种符号 |
| 跑灯光点 | `.slt-light` | 1 | 顺时针指示光 |
| 中央 LED | `.slt-center__panel` | 1 | 信息屏底框 |
| 结果文字 | `.slt-result` | 0 | 纯 CSS 文字 |
| 底栏装饰 | `.slt-mid-band__art` | 1 | 三统计槽背景 |
| 统计图标 | `.slt-stat-pod__icon` | 3 | 余额/投注/盈利 |
| 押注键 ×8 | `.slt-bet-key` | 2 + 8 | 暗/亮底 + 符号图 |
| 操控栏 | `.slt-act` | 3 | 清除/开始/全押 |
| 单注 ± | `.slt-unit-bet` | 0 | 纯 CSS 按钮 |

**合计：25 张独立 PNG/JPG + 8 符号复用 = 26 项素材文件**

---

## 二、素材文件对照表（26 项）

### A. 背景 / 框架（6）

| # | ID | 成品路径 | 尺寸 | AI 原稿 |
|---|-----|----------|------|---------|
| 1 | room-bg | `assets/room-bg.jpg` | 1080×1920 | `ai-sources/slt-ai-room-bg.png` |
| 2 | splash | `assets/splash.png` | 1080×1920 | `ai-sources/slt-ai-splash.png` |
| 3 | top-header | `assets/top-header.png` | 1080×220 | `ai-sources/slt-ai-top-header.png` |
| 4 | machine-frame | `assets/machine-frame.png` | 960×720 | `ai-sources/slt-ai-machine-frame.png` |
| 5 | bottom-deco | `assets/bottom-deco.png` | 1080×300 | `ai-sources/slt-ai-bottom-deco.png` |
| 6 | center-panel | `assets/center-panel.png` | 360×260 | `ai-sources/slt-ai-center-panel.png` |

### B. 灯位格 / 光效（3）

| # | ID | 成品路径 | 尺寸 | AI 原稿 |
|---|-----|----------|------|---------|
| 7 | slot-cell | `assets/slot-cell.png` | 96×96 | `ai-sources/slt-ai-slot-cell.png` |
| 8 | slot-cell-lit | `assets/slot-cell-lit.png` | 96×96 | `ai-sources/slt-ai-slot-cell-lit.png` |
| 9 | light-dot | `assets/light-dot.png` | 56×56 | `ai-sources/slt-ai-light-dot.png` |

### C. 水果符号（8）

| # | ID | 成品路径 | 尺寸 | AI 原稿 |
|---|-----|----------|------|---------|
| 10 | sym-apple | `assets/symbols/apple.png` | 96×96 | `ai-sources/slt-ai-sym-apple.png` |
| 11 | sym-orange | `assets/symbols/orange.png` | 96×96 | `ai-sources/slt-ai-sym-orange.png` |
| 12 | sym-lemon | `assets/symbols/lemon.png` | 96×96 | `ai-sources/slt-ai-sym-lemon.png` |
| 13 | sym-watermelon | `assets/symbols/watermelon.png` | 96×96 | `ai-sources/slt-ai-sym-watermelon.png` |
| 14 | sym-cherry | `assets/symbols/cherry.png` | 96×96 | `ai-sources/slt-ai-sym-cherry.png` |
| 15 | sym-bell | `assets/symbols/bell.png` | 96×96 | `ai-sources/slt-ai-sym-bell.png` |
| 16 | sym-bar | `assets/symbols/bar.png` | 96×96 | `ai-sources/slt-ai-sym-bar.png` |
| 17 | sym-seven | `assets/symbols/seven.png` | 96×96 | `ai-sources/slt-ai-sym-seven.png` |

### D. 操控按钮（5）

| # | ID | 成品路径 | 尺寸 | AI 原稿 |
|---|-----|----------|------|---------|
| 18 | btn-start | `assets/btn-start.png` | 120×120 | `ai-sources/slt-ai-btn-start.png` |
| 19 | btn-bet | `assets/btn-bet.png` | 80×56 | `ai-sources/slt-ai-btn-bet.png` |
| 20 | btn-bet-on | `assets/btn-bet-on.png` | 80×56 | `ai-sources/slt-ai-btn-bet-on.png` |
| 21 | btn-clear | `assets/btn-clear.png` | 88×52 | `ai-sources/slt-ai-btn-clear.png` |
| 22 | btn-allbet | `assets/btn-allbet.png` | 88×52 | `ai-sources/slt-ai-btn-allbet.png` |

### E. 统计图标（3）

| # | ID | 成品路径 | 尺寸 | AI 原稿 |
|---|-----|----------|------|---------|
| 23 | icon-wallet | `assets/icon-wallet.png` | 64×64 | `ai-sources/slt-ai-icon-wallet.png` |
| 24 | icon-coin | `assets/icon-coin.png` | 64×64 | `ai-sources/slt-ai-icon-coin.png` |
| 25 | icon-prize | `assets/icon-prize.png` | 64×64 | `ai-sources/slt-ai-icon-prize.png` |

### F. 非图片元素（不计入 26 项）

| 元素 | 来源 | 说明 |
|------|------|------|
| 返回按钮 | `client-app/assets/images/back-button.svg` | 全站共用 |
| 结果/单注文字 | CSS 渲染 | 无图片 |
| ± 按钮 | CSS 渐变圆钮 | 无图片 |

---

## 三、AI → PS 生产流水线

```
AI 逐项重绘 → assets/ai-sources/slt-ai-*.png（25 张原稿）
        ↓
process_slt_ai_assets.py
  · 符号/按钮/图标：rembg 抠图 + 锐化 + 标准尺寸
  · 背景：9:16 裁切 + 对比度/色彩增强
  · 标题条：叠加中文标题
        ↓
成品 assets/（游戏直接加载）
```

一键执行：

```bash
python games-assets/slots/scripts/gen_slt_assets.py
```

（自动检测 `ai-sources/`，有原稿则走后处理，无则走程序化备用）

---

## 四、符号在 24 灯位的分布

| 符号 | 出现次数 | 灯位索引 |
|------|----------|----------|
| 苹果 | 3 | 0, 16, 20 |
| 橘子 | 3 | 1, 9, 17 |
| 柠檬 | 3 | 2, 10, 18 |
| 西瓜 | 3 | 3, 11, 19 |
| 樱桃 | 3 | 4, 12, 22 |
| 铃铛 | 3 | 5, 13, 21 |
| BAR | 3 | 6, 14, 23 |
| 77 | 3 | 7, 15, 23 |
