# PC_Benz（YBEN）权威对照 — 从官网包逐项还原

> 来源（非截图猜测）：
> - `pc_benz.thm` → EXML：`GamePageSkin` / `BetBoardPanelSkin` / `SpinPanelV2Skin` / BetItem*
> - `gamejs/benz2221.min.js`：`PC_SpinPanelV2` / `PC_GameAppPage` / `GameAppPage.performPayoutStep`
> - DragonBones `*_ske.json` 动画名
>
> 玩家端看到的紫色霓虹 UI = **PC_Benz**，不是 `PC_YJBZ`。

---

## 0. 画布

| 项 | 值 |
|----|-----|
| 舞台 | **1280 × 800** |
| 游戏类型 | `YBEN` |
| PC 入口 | `themeUrl=resource/PC_Benz/pc_benz.thm.json` → `PC_GameAppPage` + `PC_SpinPanelV2` |

---

## 1. 主层级（GamePageSkin）— 用哪张图、坐标

| 节点 | 素材 / 组件 | 坐标 / 尺寸 |
|------|-------------|-------------|
| 背景 | `yben_main_json.yben_bg` | 全屏 0,0 |
| 加速特效层 | `speedEffectGroup` | 1280×800 @ **(0,0)**，挂 DragonBones speed |
| 灯环 | `PC_SpinPanelV2` | `horizontalCenter=0`, **y=225**，宽高 0（子图标绝对定位） |
| 派彩层 | `payoutGroup` | 1280×800 @ (0,0)，大奖 DB + 飞克隆图标 |
| 押注板 | `PC_BetBoardPanelV2` | **x=0, y=361**，宽 1280 高 **439** |
| 用户条 | `SPUserProfile` | x=153.66, y=30 |
| 推广用户 | `promotionUserGrp` | x=957, y=91, 292×69 |

层级顺序（后画的在上）：bg → speedEffect → spinPanel → payout → betBoard → userProfile …

---

## 2. 押注板（BetBoardPanelSkin）— 相对面板 (0,0)=舞台 y=361

底板：`yben_betboard_json.yben_ui_panel`（`bottom=0`）

### 2.1 功能按钮

| 控件 | 坐标（相对面板） | 舞台绝对 y | 素材 |
|------|------------------|------------|------|
| 开始 `startBtn` | y=166.5, **horizontalCenter=521** → 中心 x≈640+521=1161 | 361+166.5 | `yben_vfx_start_on` + `yben_txt_start_hans`；按下才显示光晕 |
| 停止自动 `stopAutoBtn` | x=1050, y=165.99 | | `yben_vfx_stop_on` + `yben_txt_stop_hans` |
| 清零 `clearBtn` | **x=1076.98, y=340** | | `yben_vfx_auto_clear_auto_on`(scaleX=-1) + `yben_txt_clear_off_hans` |
| 自动 `autoBetBtn` | **x=1177.5, y=340** | | 同上 + `yben_txt_auto_off_hans` |
| 筹码设置 | x=8.48, y=192.32 | | `yben_btn_chips_change` |
| 撤销 | x=1225, y=185.32 | | `yben_btn_undo` |
| 全选箭头 | x=119, y=178.5 | | `yben_btn_select_arrow_*` |
| 全选 `betAllBtn` | x=115, y=207.5, 86×56 | | `yben_btn_allbet_off/on` |
| 总下注文字 | y=412, horizontalCenter=521.5 | | |
| 历史条 | x=311, y=72, 621×50 | | |
| more | x=944, y=78 | | `yben_btn_more_hans` |

### 2.2 筹码 6 格（相对面板）

| id | x | y |
|----|---|---|
| chip0 | 12.48 | 274 |
| chip1 | 83 | 254.5 |
| chip2 | 153 | 274 |
| chip3 | 12.6 | 352 |
| chip4 | 83 | 330.5 |
| chip5 | 153 | 352 |

素材：`yben_btn_chips_off` / `yben_btn_chips_on`

### 2.3 12 仓 betItem（相对面板）+ playType

| betItem | playType | 名称 | 赔率 | 皮肤 | x | y |
|---------|----------|------|------|------|---|---|
| betItem11 | 11 | 奔驰红 | ×45 | L 190×270 | 214.68 | 149.01 |
| betItem10 | 10 | 奔驰绿 | ×38 | M 110×160 | 397.97 | 141.48 |
| betItem9 | 9 | 奔驰黄 | ×27 | M | 522.32 | 132.82 |
| betItem6 | 6 | 宝马黄 | ×13 | M | 646.03 | 132.7 |
| betItem7 | 7 | 宝马绿 | ×16 | M | 770.6 | 141.66 |
| betItem8 | 8 | 宝马红 | ×22 | L | 875.95 | 148.02 |
| betItem5 | 5 | 奥迪红 | ×12 | S | 402.65 | 315 |
| betItem4 | 4 | 奥迪绿 | ×10 | S | 477.66 | 315 |
| betItem3 | 3 | 奥迪黄 | ×6 | S | 552.97 | 315 |
| betItem0 | 0 | 大众黄 | ×4 | S | 659.83 | 315 |
| betItem1 | 1 | 大众绿 | ×5 | S | 734.83 | 315 |
| betItem2 | 2 | 大众红 | ×7 | S | 809.26 | 315 |

图标素材：`yben_icon_bet_{brand}_{color}`  
赔率字：`yben_txt_x{odds}`  
发光：L/M 用 `yben_vfx_glow_largebet_*`，S 用 `yben_vfx_glow_minibet_*`

---

## 3. 灯环 24 格 — 用图、顺序、3D 旋转

### 3.1 车位逻辑 `WHEEL[carPos]`（服务端停在 carPos）

```
carPos 0..11:  BENZ_RED, BENZ_GREEN, BENZ_YELLOW, BMW_RED, BMW_GREEN, BMW_YELLOW,
               AUDI_RED, AUDI_GREEN, AUDI_YELLOW, VW_RED, VW_GREEN, VW_YELLOW
carPos 12..23: 同上再一轮
```

显示图标：`yben_spin_item_json.yben_icon_large_{brand}_{color}`

### 3.2 iconMap（carPos → skin 上的 carN）

```
iconMap = [11,10,9,8,7,6,5,4,3,2,1,0, 23,22,21,20,19,18,17,16,15,14,13,12]
```

EXML 里 `car0` 贴的是大众黄，但 **carPos=0（奔驰红）映射到 car11**。实现时必须用 iconMap，不能按 car0=结果位。

### 3.3 PC 透视常量（`PC_SpinPanelV2`，不是手机基类）

| 参数 | PC 值 | 手机基类（勿用） |
|------|-------|------------------|
| POSITION_NUM | 24 | 24 |
| **RADIUS** | **300** | 180 |
| focal_length | 100 | 100 |
| CENTER_X/Y | 0（相对 spinPanel，舞台锚点在水平居中、y=225） | 同 |
| MAX_SPEED | 20 | 20 |
| STOPPING_ACCELERATE | -0.5 | -0.5 |
| 起步 angleSpeed | -5，accel 0.2，再 accel+=0.1 直到 MAX | 同 |

初始角：`angle[i] = 90 - i * (360/24)`，正前 **90°** 为中奖停靠角。

### 3.4 待机 / 开跑姿态（PC）

| 状态 | z_distance | tilt_angle | circle_y_scale | icon_max_scale |
|------|------------|------------|----------------|----------------|
| Idle | 100 | **-1** | **0.4** | **0.4** |
| StartSpin | 100 | **-8** | **0.2** | **0.5** |

过渡：`calcCirclePropPlus(12)` 分 12 帧插值。

### 3.5 每帧投影（`enterFrameFunc`）

1. `angle += angleSpeed`（注意角速度可为负）
2. 圆坐标：`x = R*cosθ`, `y = R*sinθ`
3. `get_coordinate_in_2d`：
   - 输入向量 `[x, y*cos(φ), z+y*sin(φ), 1]`，`φ=tilt*π/180`
   - 乘 `transformer = [[f,0,0,0],[0,f,0,0],[0,0,1,0]]`
   - 输出 `[X/Z, Y/Z]`
4. `displayY *= circle_y_scale`
5. `scale = 透视宽度比 * icon_max_scale`
6. 角在前方带 `[90±7.5°]` → zIndex 最高；后方 `[270±7.5°]` → 最低 → **近大远小 3D 环**

### 3.6 开跑状态机

```
IDEL → TRANSFORMING_SPIN → STARTING_SPIN → SPINNING → STOPPING_SPIN → STOPED_SPIN
                                                              ↓
                                                      TRANSFORMING_IDEL → IDEL
```

点击开始后游戏页：`spinPanel.transformToAndStartSpin()`  
停轮：`targetPos = payoutResp.carPos`；减速对齐到 **90° 正前**。  
高等级奖：`delaySpining(2500)` 延迟才允许停。

---

## 4. 开跑特效（不是平面跑马灯）

### 4.1 DragonBones / 粒子

| 用途 | 资源 | 动画名 | PC 挂载 |
|------|------|--------|---------|
| 弱加速 | `yben_speeed_effect_2_final_*` | `speedup_effect` | 先播这个 |
| 强加速 | `yben_speeed_effect_final_*` | `speedup_effect` | 大奖预告时切到强版 |
| 贴图帧 | `vfx_speed_line_1/2`、`vfx_circle_zoom_1/2`、`vfx_bg_blur` | | |

PC 显示参数（`PC_GameAppPage`）：

| 参数 | PC | 手机基类 |
|------|-----|----------|
| speedArmatureDisplayY | **300** | 160 |
| speedArmatureScale | **1** | 0.7 |

音效：`yben_sfx_spin_start` → `yben_sfx_spin_loop`；高等级另播 `yben_sfx_anticipation`。

---

## 5. 中奖 / 派彩流程（多帧动画）

### 5.1 PayoutStep 状态机

```
STOPED_SPIN → startPayout()
  ├─ 有 ResultBonus 或 payoutLevel>1 → Start
  └─ 否则 → SmallPrize

Start → (有 bonus) Bonus → ShowAmount → (Lv3/Lv4) → JumpAmount → Idel
                              └→ End → Idel
SmallPrize → FastJumpAmount → Idel
```

步骤枚举：`Idel, SmallPrize, Start, Bonus, PrizeLv3, PrizeLv4, ShowAmount, JumpAmount, FastJumpAmount, End`

### 5.2 Start（大奖开场）

1. 灯环淡出；`cloneIcons()` 从灯环克隆中奖 carPositions
2. `flyClonedIcons()`：主图标飞到 **(640, payoutY)**，其余排到小图标行
3. `payoutArmature.playByFrame("reward_1_start")`  
   骨架：`yben_effect_final_common`  
   贴图帧：`vfx_scifi_circle01~05`、`vfx_bg_txt_glow`、`vfx_thunder_01`、`mask_effect_outline`

### 5.3 Bonus（特殊奖横幅字）

`bonusArmature` = `yben_effect_final_text`  
动画：`reward_2_text_appear`（可 loop）  
槽位换字 locale：

| ResultBonus | id | 文案 key 前缀 | 图标 |
|-------------|----|---------------|------|
| ALL_COLOR | 0 | `yben_txt_three_great_scholars_` | `yben_icon_three_great_scholars` |
| ALL_CAR | 1 | `yben_txt_four_great_blessings_` | `yben_icon_four_great_blessings` |
| FURIOIUS | 2 | `yben_txt_fast_and_furious_` | `yben_icon_fast_and_furious` |
| UTURN | 3 | `yben_txt_U_turn_` | `yben_icon_U_turn` |
| LIGHTNING | 4 | `yben_txt_lightning_bolt_` | `yben_icon_lightning_bolt` |
| DRIFT | 5 | `yben_txt_total_drift_` | `yben_icon_total_drift` |

同时 `payoutArmature` 也播 `reward_2_text_appear`。

### 5.4 ShowAmount / 高等级

- 金额滚动 + `yben_number_effect`：`text_appear` / `text_disapper`
- 背景循环：`reward_3_bg_loop_duplication1`
- Lv3/Lv4：粒子纸屑 `yben_vfx_reward_paper_1/2`；闪电 `yben_lv2_thunder` 动画 `vfx_electric_loop`（另有 in/out）；火花粒子 `yben_lv2_thunder_spark`

### 5.5 End

- `reward_4_end` + `yben_sfx_bonus_end`
- 清克隆图标，灯环 `transformToIdel`，押注板恢复

### 5.6 PC 飞图标 / 派彩挂载坐标

| 参数 | PC |
|------|-----|
| payoutArmatureDisplayY | **180** |
| payoutArmatureDisplayScale | **0.8** |
| bonusArmatureDisplayScale | 1 |
| largeClonedIconScale | **0.8** |
| smallClonedIconScale | **0.4** |
| smallClonedIconToY | **290** |
| payoutAmountTextCenterY | **400** |
| payoutAmountTextTop（PC） | left=376, y=74, scale≈0.3 |
| thunderRaduis | **160** |
| thunderScale | **1** |

飞行动画时长约 **500ms**；主图标目标 `(width/2, payoutArmatureDisplayY)`。

---

## 6. 点击「开始」完整时序（官网）

1. 下注确认 → 进 `WaitForResult`
2. `spinPanel.transformToAndStartSpin()`：姿态 Idle→Spin（tilt -1→-8，y_scale 0.4→0.2）
3. `STARTING_SPIN`：加速到 MAX_SPEED=20
4. `speedEffectGroup` 挂 `speedup_effect`（弱/强）
5. 收到 `payoutResp.carPos`（及 carResult / resultBonus）→ `SPINNING` 里允许 `stopSpin`
6. `STOPPING_SPIN`：对齐减速，赢家停在 **正前 90°**
7. `STOPED_SPIN` → 停加速 DB → `startPayout()` → 第 5 节状态机
8. 回到 `STATE_GAME_BET`，可自动下一把

---

## 7. 与当前工程差距（对照用）

1. 必须舞台 **1280×800 + 官方 EXML 坐标**，不能竖屏自排。
2. PC 灯环 **RADIUS=300**（当前 `bcbmSpinMath` 若写 180 则是错的）。
3. 旋转必须是透视投影 + Idle/Spin 姿态切换，不是平面椭圆等大图标。
4. 开跑特效是 DB `speedup_effect`，不是手动画线。
5. 大奖是 `reward_1→2→3→4` + clone/fly 图标 + 可选闪电/纸屑，不是简单横幅。
6. 后端语义应对齐 `carPos` + `ResultBonus` 0–5 + `getResultPositionSet`，不是 YJBZ 26 格 free。

---

## 8. 本地文件索引

| 用途 | 路径 |
|------|------|
| EXML 展开 | `scripts/yoplay-benz/_layout_report/*.exml` |
| 逻辑 JS | `scripts/yoplay-benz/gamejs/benz2221.min.js` |
| DB | `scripts/yoplay-benz/dragonbones/` |
| 图集 | `scripts/yoplay-benz/assets/yben_{main,betboard,spin_item}.*` |
| 已裁切到前端 | `client-app/public/images/games/bcbm/` |
