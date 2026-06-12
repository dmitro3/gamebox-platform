# 赏金女王 · 参考图元素拆分与重绘清单

> 参考图仅用于**分析布局与风格**，所有成品素材均为 **AI 独立重绘 + PS 级后处理**，不直接裁剪截图。

参考尺寸：`1280 × 2781`（竖屏）

---

## 一、界面分区（自上而下）

| 分区 | 高度占比 | 像素约 | 元素 |
|------|----------|--------|------|
| 信息条 | 0–6.5% | 0–180 | 可选横幅 |
| 顶栏角色区 | 6.5–33% | 180–917 | 海盗女王、船舵、炮筒倍数 x1/x2/x3/x5 |
| 转轴区 | 33–68% | 917–1891 | 5×3 绳框木栏 + 符号 |
| 统计栏 | 68–75.5% | 1891–2099 | 余额 / 投注 / 赢奖 |
| 操控区 | 75.5–100% | 2099–2781 | 船舵旋转、±、极速、自动、菜单 |

---

## 二、22 个独立元素

### 背景 / 框架
| ID | 成品路径 | 说明 |
|----|----------|------|
| `room-bg` | `assets/room-bg.jpg` | 日落甲板竖屏底图 + 绳框合成 |
| `top-header` | `assets/top-header.png` | 女王立绘 + 四门炮筒（1080×720） |
| `reel-frame` | 合成进 room-bg | 5×3 木纹绳框 |
| `bottom-deco` | `assets/bottom-deco.png` | 雕花木栏 + 消息区 + 三统计槽 |
| `splash` | `assets/splash.png` | 加载页全屏宣传图 |

### 转轴符号（各含 `@3x` 高清版）
| ID | 描述 | AI 原稿 |
|----|------|---------|
| `queen` | 红发女海盗肖像，紫粉光晕 | `ai-sources/qn-ai-tile-queen.png` |
| `map` | 藏宝图卷轴 + 红 X | `qn-ai-tile-map.png` |
| `pistol` | 交叉金色燧发枪 | `qn-ai-tile-pistol.png` |
| `compass` | 金色罗盘 | `qn-ai-tile-compass.png` |
| `a` / `k` / `q` | 金属立体字母 | `qn-ai-tile-a/k/q.png` |
| `wild` | 宝箱 + 烘焙「百搭」 | `qn-ai-tile-wild.png` |
| `scatter` | 火炮 + 烘焙「夺宝」 | `qn-ai-tile-scatter.png` |

### UI 控件
| ID | 成品 | 说明 |
|----|------|------|
| `spin-btn` | `spin-btn.png` | 船舵旋转钮（rembg 透明底） |
| `qn-icon-wallet` | 64×64 | 钱包图标 |
| `qn-icon-coin` | 64×64 | 金币图标 |
| `qn-icon-prize` | 64×64 | 奖杯图标 |
| `mult-active/x1~x5` | 220×88 | 炮筒倍数金色高亮叠层 |

---

## 三、生产流水线

```
参考图 analyze_qn_ref.py → element-manifest.json（布局坐标）
        ↓
AI 逐项重绘 → assets/ai-sources/qn-ai-*.png
        ↓
process_qn_ai_assets.py
  · 牌面：裁切 288×360 + 锐化 + 中文烘焙
  · 船舵钮：rembg 抠图 + 去黑边
  · 背景：9:16 裁切 + 绳框合成
  · 图标：64×64 透明 PNG
        ↓
成品 assets/（可直接被游戏加载）
```

一键执行：

```bash
python games-assets/queen/scripts/gen_qn_assets.py
```

---

## 四、符号网格参考坐标（5×3）

网格归一化边界：`x 0.061–0.939`，`y 0.342–0.568`

详细像素框见 `assets/element-manifest.json` → `tile_samples`.
