麻将胡了1 音效目录（PG 对齐用）
================================

当前项目没有 PG 官方音频，无法与正版完全一致。
请将「自有版权 / 已授权 / 外包定制」的音频文件放到本目录，文件名如下。
代码会自动优先播放 mp3/ogg，缺失时回退到 Web 合成占位音。

建议格式：MP3 或 OGG，44.1kHz，立体声，单文件 < 500KB（BGM 除外）

文件名对照（基础操作 + PG 常见节点）
----------------------------------------------
spin-click.mp3          ★ 点击旋转按钮 — 清脆「咔哒」触发音
tile-clack.mp3            ★ 单枚牌碰撞（滚动时连续播放；可只备一条）
reel-stop.mp3             单列停轮落牌
spin-start.mp3            （可选）轴开始转，与 spin-click 二选一
win-cascade-1.mp3       第 1 级连击中奖
win-cascade-2.mp3       第 2 级连击
win-cascade-3.mp3       第 3 级连击
win-cascade-4.mp3       第 4 级连击（×5 / ×10）
scatter-first.mp3       首次 3 胡触发免费旋转
scatter-retrigger.mp3   免费局中再触发
free-spin-enter.mp3     进入免费局 UI
free-spin-bgm.mp3       免费局背景音乐（循环，可选）
free-spin-end.mp3       免费局结束总结

后续 P2 Big Win 可追加：
big-win.mp3 / mega-win.mp3 / super-mega-win.mp3

注意：请勿从 PG 客户端逆向提取音频用于商业产品，存在版权风险。
