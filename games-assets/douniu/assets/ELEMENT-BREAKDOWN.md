# 斗牛 · 庄闲比牌 · 全页面元素统计 & AI 素材清单

> 版本 1.0 · 两副牌 · 庄闲 + 牌型三区 · AI 重绘 + PS 后处理  
> 共 **89 项**独立图片素材（不含全站共用 SVG / 头像库）

---

## 一、最终玩法规则（定稿）

### 1.1 发牌

- 系统每局洗 **两副标准扑克（104 张）**，庄、闲各发 **5 张**
- J/Q/K = 10 点，A = 1，2–10 = 面值
- 比牌：特殊牌型 > 牛牛 > 牛九 … > 牛一 > 无牛；同级比最大单牌，再比花色 ♠>♥>♣>♦

### 1.2 投注玩法（共 6 项）

| 玩法 | 命中条件 | 赔率（含本金） | 说明 |
|------|----------|----------------|------|
| **庄** | 庄 > 闲 | **1 : 1.95** | 庄赢抽 **5%** 水 |
| **闲** | 闲 > 庄 | **1 : 2.00** | 不抽水 |
| **和** | 庄闲完全相同 | **1 : 9.00** | |
| **牛一到牛六** | **胜出方**牌型 ∈ {牛一…牛六} | **1 : 2.20** | 无牛、和局不中 |
| **牛七到牛九** | **胜出方**牌型 ∈ {牛七…牛九} | **1 : 3.50** | 无牛、和局不中 |
| **牛牛** | **胜出方**为牛牛 | **1 : 12.00** | 和局不中 |

### 1.3 和局 / 退本（方案 A · 已采用）

| 下注 | 和局处理 |
|------|----------|
| 庄 / 闲 | **退本**（不输不赢，不计流水） |
| 和 | 按 1:9 赔付 |
| 牛一到牛六 / 牛七到牛九 / 牛牛 | **退本**（无胜出方，无法判定牌型区） |

> 抽水仅作用于 **庄赢且买庄命中** 的净赢部分：盈利 = 本金 × 0.95。

### 1.4 期次节奏

与现网一致：**40s 下注 → 15s 封盘核对 → 5s 开奖**，60 秒一期。

---

## 二、界面分区（自上而下 · 1080×1920 竖屏）

| 分区 | DOM 类名 | 高度占比 | 像素约 | 说明 |
|------|----------|----------|--------|------|
| 顶栏 | `.dn-head` | 0–9% | 0–170 | 返回 + 标题 + 2×2 统计 |
| 期号卡 | `.dn-issue-card` | 9–15% | 170–290 | 期数 / 倒计时环 / 注单·长龙·预测 |
| 开奖栏 | `.dn-draw-bar` | 15–21% | 290–400 | 庄闲缩略 + 下拉历史 |
| 聊天区 | `.dn-chat` | 21–78% | 400–1500 | 下注消息 + 开奖卡 |
| 右侧栏 | `.dn-rail` | 浮动 | — | 客服 / 玩法 / 红包 |
| 输入栏 | `.dn-composer` | 78–83% | 1500–1590 | 聊天下注 |
| 键盘 | `.dn-keypad` | 83–100% | 1590–1920 | 工具条 + 数字键 |

---

## 三、素材文件对照表（89 项）

### A. 背景 / 框架（8）

| # | ID | 成品路径 | 尺寸 | AI 原稿 | 说明 |
|---|-----|----------|------|---------|------|
| 1 | room-bg | `assets/room-bg.jpg` | 1080×1920 | `ai-sources/dn-ai-room-bg.png` | 赌场斗牛桌竖屏：深红绒桌 + 金边 + 暗角 |
| 2 | room-bg-overlay | `assets/room-bg-overlay.png` | 1080×1920 | `ai-sources/dn-ai-room-overlay.png` | 透明 vignette + 顶部金光 |
| 3 | splash | `assets/splash.png` | 1080×1920 | `ai-sources/dn-ai-splash.png` | 加载页：金牛 + 扑克筹码 +「斗牛」标题 |
| 4 | head-deco | `assets/head-deco.png` | 1080×120 | `ai-sources/dn-ai-head-deco.png` | 顶栏底纹金线（透明底） |
| 5 | stats-panel | `assets/stats-panel.png` | 520×88 | `ai-sources/dn-ai-stats-panel.png` | 2×2 统计槽底框（九宫拉伸） |
| 6 | issue-card-bg | `assets/issue-card-bg.png` | 1040×100 | `ai-sources/dn-ai-issue-card.png` | 期号卡片底 |
| 7 | draw-bar-bg | `assets/draw-bar-bg.png` | 1040×72 | `ai-sources/dn-ai-draw-bar.png` | 开奖栏底 |
| 8 | chat-panel-texture | `assets/chat-texture.png` | 512×512 | `ai-sources/dn-ai-chat-texture.png` | 聊天区 subtle 噪点（平铺） |

### B. 倒计时 / 期号控件（4）

| # | ID | 成品路径 | 尺寸 | AI 原稿 | 说明 |
|---|-----|----------|------|---------|------|
| 9 | timer-track | `assets/timer-track.png` | 200×80 | `ai-sources/dn-ai-timer-track.png` | 秒表外框 |
| 10 | timer-fill-bet | `assets/timer-fill-bet.png` | 200×80 | `ai-sources/dn-ai-timer-fill-bet.png` | 下注阶段填充（绿金） |
| 11 | timer-fill-freeze | `assets/timer-fill-freeze.png` | 200×80 | `ai-sources/dn-ai-timer-fill-freeze.png` | 封盘阶段（红） |
| 12 | timer-fill-draw | `assets/timer-fill-draw.png` | 200×80 | `ai-sources/dn-ai-timer-fill-draw.png` | 开奖阶段（跑马金） |

### C. 庄闲对战区（6）

| # | ID | 成品路径 | 尺寸 | AI 原稿 | 说明 |
|---|-----|----------|------|---------|------|
| 13 | zone-banker | `assets/zone-banker.png` | 480×200 | `ai-sources/dn-ai-zone-banker.png` | 庄区金红框 +「庄」字 |
| 14 | zone-player | `assets/zone-player.png` | 480×200 | `ai-sources/dn-ai-zone-player.png` | 闲区蓝银框 +「闲」字 |
| 15 | vs-badge | `assets/vs-badge.png` | 120×120 | `ai-sources/dn-ai-vs-badge.png` | 中央 VS 徽章 |
| 16 | win-badge-banker | `assets/win-badge-banker.png` | 160×48 | `ai-sources/dn-ai-win-banker.png` | 庄赢角标 |
| 17 | win-badge-player | `assets/win-badge-player.png` | 160×48 | `ai-sources/dn-ai-win-player.png` | 闲赢角标 |
| 18 | win-badge-tie | `assets/win-badge-tie.png` | 160×48 | `ai-sources/dn-ai-win-tie.png` | 和局角标 |

### D. 扑克牌面（54 + 2 背 = 56）

> 正面 52 张共用设计；角标小点区分两副牌（deck-1 无点 / deck-2 蓝点）  
> 后处理统一裁 **140×196 @1x**（@2x 280×392）

| # | ID | 成品路径 | 数量 | AI 原稿 |
|---|-----|----------|------|---------|
| 19–70 | card-{suit}{rank} | `assets/cards/{suit}_{rank}.png` | 52 | `ai-sources/dn-ai-card-*.png` |
| 71 | card-back-deck1 | `assets/cards/back-deck1.png` | 1 | 红金菱格背 |
| 72 | card-back-deck2 | `assets/cards/back-deck2.png` | 1 | 深蓝金线背 |
| 73 | card-shadow | `assets/cards/shadow.png` | 1 | 牌投影（透明） |
| 74 | card-glow-win | `assets/cards/glow-win.png` | 1 | 胜出牌金色光晕 |

**花色前缀**：`spade` `heart` `club` `diamond`  
**点数**：`2`–`10` `J` `Q` `K` `A`

### E. 牌型徽章（14）

| # | ID | 成品路径 | 尺寸 | 说明 |
|---|-----|----------|------|------|
| 75 | niu-none | `assets/niu-badges/none.png` | 128×48 | 无牛 |
| 76 | niu-1 | `assets/niu-badges/niu1.png` | 128×48 | 牛一 |
| 77 | niu-2 | `assets/niu-badges/niu2.png` | 128×48 | 牛二 |
| 78 | niu-3 | `assets/niu-badges/niu3.png` | 128×48 | 牛三 |
| 79 | niu-4 | `assets/niu-badges/niu4.png` | 128×48 | 牛四 |
| 80 | niu-5 | `assets/niu-badges/niu5.png` | 128×48 | 牛五 |
| 81 | niu-6 | `assets/niu-badges/niu6.png` | 128×48 | 牛六 |
| 82 | niu-7 | `assets/niu-badges/niu7.png` | 128×48 | 牛七 |
| 83 | niu-8 | `assets/niu-badges/niu8.png` | 128×48 | 牛八 |
| 84 | niu-9 | `assets/niu-badges/niu9.png` | 128×48 | 牛九 |
| 85 | niu-bull | `assets/niu-badges/bull.png` | 128×48 | 牛牛 |
| 86 | niu-flower | `assets/niu-badges/flower.png` | 128×48 | 五花牛 |
| 87 | niu-bomb | `assets/niu-badges/bomb.png` | 128×48 | 炸弹牛 |
| 88 | niu-small | `assets/niu-badges/small.png` | 128×48 | 五小牛 |

### F. 开奖结果卡（5）

| # | ID | 成品路径 | 尺寸 | AI 原稿 | 说明 |
|---|-----|----------|------|---------|------|
| 89 | draw-result-stage | `assets/draw-result-stage.png` | 640×360 | `ai-sources/dn-ai-result-stage.png` | 聊天开奖卡舞台（CSS 已引用） |
| 90 | result-card-frame | `assets/result-card-frame.png` | 640×480 | `ai-sources/dn-ai-result-frame.png` | 结果卡外框 |
| 91 | result-card-head | `assets/result-card-head.png` | 640×80 | `ai-sources/dn-ai-result-head.png` | 头部「斗牛·庄闲比牌」 |
| 92 | seal-line | `assets/seal-line.png` | 600×40 | `ai-sources/dn-ai-seal-line.png` | 封盘线装饰 |
| 93 | refund-stamp | `assets/refund-stamp.png` | 120×120 | `ai-sources/dn-ai-refund-stamp.png` | 和局退本戳 |

### G. 玩法筹码 / 键盘（12）

| # | ID | 成品路径 | 尺寸 | 说明 |
|---|-----|----------|------|------|
| 94 | chip-banker | `assets/chips/chip-banker.png` | 96×96 | 庄 |
| 95 | chip-player | `assets/chips/chip-player.png` | 96×96 | 闲 |
| 96 | chip-tie | `assets/chips/chip-tie.png` | 96×96 | 和 |
| 97 | chip-niu-low | `assets/chips/chip-niu-low.png` | 96×96 | 牛一到牛六 |
| 98 | chip-niu-mid | `assets/chips/chip-niu-mid.png` | 96×96 | 牛七到牛九 |
| 99 | chip-niu-bull | `assets/chips/chip-niu-bull.png` | 96×96 | 牛牛 |
| 100 | keypad-bg | `assets/keypad-bg.png` | 1080×320 | 键盘底 |
| 101 | key-normal | `assets/key-normal.png` | 9-slice | 普通键 |
| 102 | key-side | `assets/key-side.png` | 9-slice | 侧栏键（大/小/庄/闲） |
| 103 | key-del | `assets/key-del.png` | 9-slice | 删除键 |
| 104 | btn-issue | `assets/btn-issue.png` | 120×44 | 注单/长龙/预测 |
| 105 | play-sheet-bg | `assets/play-sheet-bg.png` | 1080×480 | 玩法弹层底 |

### H. 右侧栏 / 统计图标（7）

| # | ID | 成品路径 | 尺寸 | 说明 |
|---|-----|----------|------|------|
| 106 | rail-cs | `assets/rail-cs.png` | 84×84 | 客服 |
| 107 | rail-play | `assets/rail-play.png` | 84×84 | 玩法 |
| 108 | rail-redpack | `assets/rail-redpack.png` | 84×84 | 红包 |
| 109 | icon-balance | `assets/icon-balance.png` | 64×64 | 积分 |
| 110 | icon-winloss | `assets/icon-winloss.png` | 64×64 | 输赢 |
| 111 | icon-turnover | `assets/icon-turnover.png` | 64×64 | 流水 |
| 112 | icon-rebate | `assets/icon-rebate.png` | 64×64 | 回水 |

### I. 路单 / 长龙（可选第二期 · 6）

| # | ID | 成品路径 | 尺寸 | 说明 |
|---|-----|----------|------|------|
| 113 | roadmap-bg | `assets/roadmap-bg.png` | 1040×200 | 路单底 |
| 114 | bead-banker | `assets/bead-banker.png` | 24×24 | 庄珠 |
| 115 | bead-player | `assets/bead-player.png` | 24×24 | 闲珠 |
| 116 | bead-tie | `assets/bead-tie.png` | 24×24 | 和珠 |
| 117 | bead-niu-low | `assets/bead-niu-low.png` | 24×24 | 牛小 |
| 118 | bead-niu-high | `assets/bead-niu-high.png` | 24×24 | 牛大 |

### J. 大厅入口（1）

| # | ID | 成品路径 | 尺寸 | 说明 |
|---|-----|----------|------|------|
| 119 | lobby-icon | `../../client-app/assets/images/games/douniu.png` | 256×256 | 大厅游戏图标 |

---

## 四、不计入 89 项的共用资源

| 元素 | 来源 | 说明 |
|------|------|------|
| 返回按钮 | `client-app/assets/images/back-button.svg` | 全站共用 |
| 用户头像 | `client-app/assets/images/avatars/*.jpg` | 聊天头像库 |
| 巴洛克底纹 | `client-app/assets/images/textures/bg-dark-baroque-portrait.png` | 当前 CSS 已用，可被 room-bg 替换 |
| 倒计时环 | CSS SVG + `--cd-pct` | 可保留矢量或换 timer-fill 贴图 |
| 聊天气泡 | CSS 渐变 | 可选换 `msg-bubble-self.png` |

---

## 五、AI 提示词风格指引（统一）

**主题**：高端线下赌场 · 斗牛庄闲 · 黑金 + 深红绒 · 写实扑克  
**禁止**：廉价 3D、过度霓虹、与 mahjong/queen 海盗风混用  

**room-bg 示例 prompt**：
```
Luxury casino bull-fight table, top-down slight angle, deep crimson felt,
gold trim rail, scattered poker chips, dark vignette, vertical mobile 9:16,
photorealistic, no text, no watermark, 8k detail
```

**扑克牌 prompt 模板**：
```
Single playing card {rank} of {suit}, classic casino deck design,
cream white face, crisp serif indices, subtle gold foil edge,
isolated on transparent background, front view, 140x196 ratio
```

**牌型徽章 prompt 模板**：
```
Casino UI badge Chinese text 「{牌型名}」, gold embossed letters,
dark red enamel background, rounded pill shape, game HUD element,
transparent PNG, mobile game quality
```

---

## 六、生产流水线

```
风格样张（room-bg + 1 张牌 + 1 枚筹码）人工确认
        ↓
AI 批量重绘 → assets/ai-sources/dn-ai-*.png
        ↓
process_dn_ai_assets.py
  · 扑克：统一尺寸 + 锐化 + 两副牌角标
  · 徽章/筹码：rembg 抠图 + 烘焙中文
  · 背景：9:16 裁切 + 色彩统一 LUT
  · 九宫按钮：切 9-slice 元数据写入 manifest
        ↓
成品 assets/（dn.css / dn.js 引用）
```

一键执行（脚本待建）：

```bash
python games-assets/douniu/scripts/gen_dn_assets.py
```

---

## 七、玩法与 UI 映射

| 玩法 | 键盘快捷 | 筹码图 | 玩法弹层 |
|------|----------|--------|----------|
| 庄 | 侧栏「庄」 | chip-banker | ✓ |
| 闲 | 侧栏「闲」 | chip-player | ✓ |
| 和 | — | chip-tie | ✓ |
| 牛一到牛六 | — | chip-niu-low | ✓ |
| 牛七到牛九 | — | chip-niu-mid | ✓ |
| 牛牛 | — | chip-niu-bull | ✓ |

侧栏四键建议改为：**庄 / 闲 / 和 / 牛**（点「牛」展开三区）。

---

## 八、统计汇总

| 类别 | 数量 |
|------|------|
| A 背景框架 | 8 |
| B 倒计时 | 4 |
| C 庄闲区 | 6 |
| D 扑克牌 | 56 |
| E 牌型徽章 | 14 |
| F 开奖卡 | 5 |
| G 筹码键盘 | 12 |
| H 栏图标 | 7 |
| I 路单（二期） | 6 |
| J 大厅 | 1 |
| **一期必做合计** | **113 项**（含 52 张牌面为批量） |
| **二期路单** | +6 |
| **独立 PNG 文件数（含 52 牌）** | **~119 文件** |
