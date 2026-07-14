# 开奖公布 · 热带海面 AI 飞艇

## 设计
对齐正版幸运飞艇开奖图：热带海岛背景 + 前三名飞艇纵深排布。

- 背景：AI 生成热带海面小岛（`bg.png`，cover 铺满画布）
- 飞艇：AI 生成 10 艘（`ai/boat-01~10.png`），统一 3/4 漂移视角、白圆黑边编号徽章
- 排名：`1st/2nd/3rd` 由 Canvas 渐变描边文字绘制，自动定位在各艇上方
- 层次：冠军近景居中放大，亚军/季军远景缩小分列左右，艇底有水面接触阴影

## 结构
| 区域 | 实现 |
|------|------|
| 头栏 | 游戏名 + 全序号码牌（assets/balls） |
| 舞台 | Canvas 合成（result-card.js） |
| 底栏 | 期号 / 冠亚军和 / 1-5龙虎 |

## 素材流程
1. AI 生成绿幕飞艇源图（绿色艇身用洋红幕），源图不入库，仅保留成品
2. 需重做时把源图放回 `ai-sources/`（或 Cursor assets 目录），跑 `python scripts/import_ai_assets.py` 抠图输出到 `ai/`
3. 前端 `js/result-card.js` 按开奖号合成，缓存版本号 `BOAT_VER`

预览：`/games-assets/speed-boat/preview-result.html`（支持 `?top3=5,2,8`）
