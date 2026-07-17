# YoPlay 奔驰宝马（PC_YJBZ / YP802）素材包

来源：`gc.andkids.xyz/yp/v20180829/resource/PC_YJBZ/`  
清单：`pc_yjbz.res.ee4c2a6b.json`（102 项，已全部下载）  
局内脚本：`gamejs/yjbz2214.min.js`

## 同一游戏、两套壳

| 入口 | 布局 | 说明 |
|------|------|------|
| V66 iframe / H5 | 竖屏 | 上跑灯环 + 下 4×3 押注格 |
| `YoPlayPlaza291/?stamp=...` | 横屏 PC | 左车图侧栏 + 中椭圆灯环 + 底部分车押注 |

**素材包相同**：都是 `PC_YJBZ`（+ 公共 `PC_YPCore`），不是另一套游戏。

## 玩法对照（与截图一致）

- 4 车标：奔驰 / 宝马 / 奥迪 / 大众
- 3 色档：红 / 绿 / 黄（灯环上约 24～28 格，含 2 个「免费游戏」）
- 赔率（截图）：奔驰 45/38/27 · 宝马 22/16/13 · 奥迪 12/10/6~8 · 大众 7/5/4
- 特殊：免费游戏、大三元、大四喜、闪电、掉头、Jackpot

## 分类

| 类型 | 数量 | 目录 |
|------|------|------|
| 音效/BGM | 28 | `assets/common/sound/` |
| UI 图集帧 | 61+133+66 | `yjbz_common` / `yjbz_misc` / `yjbz_txt_hans` |
| 序列帧 MC | 14 套 | `assets/common/movieclip/` |
| DragonBones | 5 套 | `assets/common/dragonbone/` |
| 位图字体 | 12 | `assets/common/font/` |
| 背景图 | 2 | `yjbz_bg` / `yjbz_bg_freegame1` |

## 关键 UI（yjbz_common）

- 押注格：红绿黄 on/off/win
- 车标选择：benz / bmw / audi / volkswagen
- 全选、自动、清零、撤销、开始相关按钮
- 筹码、设置、帮助、记录

## 关键动画

- MC：`car_1~4`（车标跑灯）、`roadpath`（跑道路径）、`racelight`、`firerun`、`thunder`、`confetti`、`freegame_*`、`target`、`levelpop`
- DB：`core` / `core_sp`、`freespin`、`jackpot`、`speedline`

## 关键音频

- `yjbz_BGM_64` 大厅 BGM
- `yjbz_db_free_spin_Bgm` 免费游戏 BGM
- 下注 / 倒计时 / 开奖 / 跑灯路径
- 中奖 lv0~lv4、大三元、大四喜、Jackpot in/loop/out
- 积分滚动 credit in/loop/out

## 落地建议

正式进工程时按项目规范放到：

- 图：`client-app/public/images/games/bcbm/`
- 音：`client-app/public/audio/bcbm/`

当前仍在 `scripts/yoplay-yjbz/` 作参考素材库，未接入业务代码。
