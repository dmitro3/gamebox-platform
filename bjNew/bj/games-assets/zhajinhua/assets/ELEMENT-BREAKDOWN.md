# 炸金花 · 平台派牌 · 全页面元素统计 & AI 素材清单

> 版本 1.0 · 一副牌 · 三张比牌 · AI 重绘 + PS 后处理  
> 共 **72 项**独立图片素材（不含全站共用 SVG / 头像库）

---

## 一、最终玩法规则（定稿）

### 1.1 发牌

- 系统每局洗 **一副标准扑克（52 张）**，平台派发 **3 张**
- 牌型大小：豹子 > 顺子 > 金花 > 对子 > 散牌；同级比最大单牌，再比花色 ♠>♥>♣>♦
- A 在顺子中可作 1（A-2-3）或 14（Q-K-A）

### 1.2 投注玩法（共 11 项）

| 玩法 | 命中条件 | 赔率（含本金） | 说明 |
|------|----------|----------------|------|
| **大** | 最大牌点数 ≥ 8 | **1 : 1.98** | 8/9/10/J/Q/K/A |
| **小** | 最大牌点数 ≤ 7 | **1 : 1.98** | 2–7 |
| **单** | 三张点数之和为奇数 | **1 : 1.98** | |
| **双** | 三张点数之和为偶数 | **1 : 1.98** | |
| **红** | 红色牌 ≥ 2 张 | **1 : 1.98** | ♥♦ |
| **黑** | 黑色牌 ≥ 2 张 | **1 : 1.98** | ♠♣ |
| **散牌** | 牌型为散牌 | **1 : 2.20** | |
| **对子** | 牌型为对子 | **1 : 3.00** | |
| **金花** | 牌型为金花（同花） | **1 : 4.50** | |
| **顺子** | 牌型为顺子 | **1 : 8.00** | |
| **豹子** | 牌型为豹子 | **1 : 50.00** | |

### 1.3 期次节奏

与斗牛一致：**40s 下注 → 15s 封盘核对 → 6s 开奖发牌**，61 秒一期。

---

## 二、界面分区（自上而下 · 1080×1920 竖屏）

| 分区 | DOM 类名 | 高度占比 | 像素约 | 说明 |
|------|----------|----------|--------|------|
| 顶栏 | `.zjh-head` | 0–9% | 0–170 | 返回 + 标题 + 2×2 统计 |
| 期号卡 | `.zjh-issue-card` | 9–15% | 170–290 | 期数 / 倒计时环 / 注单·长龙·预测 |
| **发牌台** | `.zjh-dealer` | 15–28% | 290–540 | 牌靴 + 三张扇形牌位 + 牌型徽章 |
| 开奖栏 | `.zjh-draw-bar` | 28–34% | 540–650 | 三张缩略 + 牌型 + 下拉历史 |
| 聊天区 | `.zjh-chat` | 34–78% | 650–1500 | 下注消息 + 开奖卡 |
| 右侧栏 | `.zjh-rail` | 浮动 | — | 客服 / 玩法 / 红包 |
| 输入栏 | `.zjh-composer` | 78–83% | 1500–1590 | 聊天下注 |
| 键盘 | `.zjh-keypad` | 83–100% | 1590–1920 | 工具条 + 数字键 |

---

## 三、素材文件对照表（72 项）

### A. 背景 / 框架（6）

| # | ID | 成品路径 | 尺寸 | AI 原稿 | 说明 |
|---|-----|----------|------|---------|------|
| 1 | room-bg | `assets/room-bg.jpg` | 1080×1920 | `ai-sources/zjh-ai-room-bg.png` | 深绿绒桌 + 金边 + 暗角 |
| 2 | splash | `assets/splash.png` | 1080×1920 | `ai-sources/zjh-ai-splash.png` | 加载页：金花 + 三张牌 + 标题 |
| 3 | draw-result-stage | `assets/draw-result-stage.png` | 640×360 | `ai-sources/zjh-ai-result-stage.png` | 开奖卡中央牌桌底 |
| 4 | deal-zone-bg | `assets/deal-zone-bg.png` | 960×280 | `ai-sources/zjh-ai-deal-zone.png` | 三张牌扇形区底框 |
| 5 | type-badge-frame | `assets/type-badge-frame.png` | 200×56 | — | 牌型徽章底 |
| 6 | shoe-pile | `assets/shoe-pile.png` | 120×160 | — | 牌靴叠放示意 |

### B. 扑克牌面（54）

> 正面 52 张 + 1 背 + 1 投影  
> 裁 **140×196 @1x**

| # | ID | 成品路径 | 数量 |
|---|-----|----------|------|
| 7–58 | card-{suit}{rank} | `assets/cards/{suit}_{rank}.png` | 52 |
| 59 | card-back | `assets/cards/back.png` | 1 |
| 60 | card-shadow | `assets/cards/shadow.png` | 1 |

### C. 牌型徽章（5）

| # | ID | 成品路径 | 尺寸 | 说明 |
|---|-----|----------|------|------|
| 61 | type-leopard | `assets/type-badges/leopard.png` | 160×48 | 豹子 |
| 62 | type-straight | `assets/type-badges/straight.png` | 160×48 | 顺子 |
| 63 | type-flush | `assets/type-badges/flush.png` | 160×48 | 金花 |
| 64 | type-pair | `assets/type-badges/pair.png` | 160×48 | 对子 |
| 65 | type-high | `assets/type-badges/high.png` | 160×48 | 散牌 |

### D. 筹码（6）

| # | ID | 成品路径 | 玩法 |
|---|-----|----------|------|
| 66 | chip-big | `assets/chips/chip-big.png` | 大 |
| 67 | chip-small | `assets/chips/chip-small.png` | 小 |
| 68 | chip-odd | `assets/chips/chip-odd.png` | 单 |
| 69 | chip-even | `assets/chips/chip-even.png` | 双 |
| 70 | chip-special | `assets/chips/chip-special.png` | 豹顺金花 |
| 71 | chip-color | `assets/chips/chip-color.png` | 红/黑 |

### E. 右侧浮钮（3）

| # | ID | 成品路径 | 说明 |
|---|-----|----------|------|
| 72 | rail-cs | `assets/rail-cs.png` | 客服 |
| 73 | rail-play | `assets/rail-play.png` | 玩法 |
| 74 | rail-redpack | `assets/rail-redpack.png` | 红包 |

---

## 四、生产流水线

```bash
python games-assets/zhajinhua/scripts/gen_zjh_assets.py
```

```
参考风格定稿 → ELEMENT-BREAKDOWN.md
        ↓
程序化生成备用素材 → assets/
        ↓
（可选）AI 原稿 → assets/ai-sources/zjh-ai-*.png → 后处理覆盖
        ↓
游戏页面直接加载
```

---

## 五、视觉主题

**主题**：高端线下赌场 · 炸金花 · 黑金 + 深绿绒 · 写实扑克  
**与斗牛差异**：单区三张扇形牌（非庄闲对战），绿色赌桌氛围

```
Luxury casino three-card brag table, top-down slight angle,
deep emerald green felt, gold rim lighting, three card fan slots,
single card shoe, dark vignette, 9:16 portrait, photorealistic
```
