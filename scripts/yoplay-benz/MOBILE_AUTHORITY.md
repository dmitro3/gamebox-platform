# Benz 手机竖屏权威对照（V66 H5）

> 对照来源：
> - 内置浏览器官网截图 `official-v66-bcbm.png`（755×1045）
> - `benz2221.min.js` 非 PC 分支：`SpinPanelV2`（非 `PC_SpinPanelV2`）、`isPcVersion?6:4` 筹码数
> - 素材仍用已裁切的 `yben_*`（与 PC 同图集；布局不同）
>
> 权威主题：`benz.thm.d68a78f6.json?v=v2.22.1`（已落盘 `scripts/yoplay-benz-mobile/`）  
> 同批 Network 另有：`common.thm.34b82cbd` / `ypcore.thm.c4248d94` / `yoplayplaza.thm.2d994faa`（公共壳，非押注坐标）

## 画布

| 项 | 值 |
|----|-----|
| 设计稿 | **480 × 715**（`GamePageSkin`） |
| 入口 | `themeUrl=resource/Benz/benz.thm.json` → `GameAppPage` + `SpinPanelV2` |
| 筹码数 | **4**（1 / 2 / 10 / 100） |
| 押注板 | `BetBoardPanelSkin` **480×439**，舞台 `y=276` |
| 灯环锚点 | `spinPanel` `y=168`，`horizontalCenter=0` |

## 纵向结构（上→下）

1. 顶栏：返回 / 余额 / 音量  
2. 3D 灯环（锚点约 y=280，水平居中）  
3. 总下注 + 历史条  
4. 控制区：**开始**居中；左 1·2、右 10·100；上清零/自动；左全选；右撤销  
5. **上排 6 仓**（奔驰红/绿/黄 + 宝马黄/绿/红）  
6. **下排 6 仓**（奥迪红/绿/黄 + 大众黄/绿/红）

## 灯环（手机 SpinPanelV2）

| 参数 | 值 |
|------|-----|
| RADIUS | **180** |
| focal_length | 100 |
| Idle | z=100, tilt=-1, y_scale=0.4, icon_max=0.4 |
| StartSpin | z=100, tilt=**-15**, y_scale=**0.3**, icon_max=**0.6** |
| MAX_SPEED | 20 |
| WHEEL / iconMap | 与 PC 相同 |

## 设计稿关键坐标（640×1136）

| 元素 | 约坐标 |
|------|--------|
| 灯环锚点 | (320, 300) |
| 总下注 | y≈467 |
| 历史条 | y≈495, 宽≈480 |
| 上排 6 仓中心 y | ≈609 |
| 开始中心 | (320, 783)，直径≈140 |
| 筹码 y | ≈794；x≈120/190 / 450/520 |
| 下排 6 仓中心 y | ≈957 |
| 6 列中心 x | 70, 155, 240, 325, 410, 495 |
