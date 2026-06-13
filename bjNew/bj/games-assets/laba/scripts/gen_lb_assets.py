# -*- coding: utf-8
"""777 经典拉霸 · 一键流程：处理 AI 原稿 → 导出成品"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
AI = SCRIPTS.parent / 'assets' / 'ai-sources'


def main():
    if not AI.exists() or not any(AI.glob('lb-ai-*.png')):
        raise FileNotFoundError(
            f'缺少 AI 原稿，请先将 lb-ai-*.png 放入 {AI}\n'
            '（由图像生成工具按 ELEMENT-BREAKDOWN.md 逐项重绘）'
        )
    path = SCRIPTS / 'process_lb_ai_assets.py'
    print('>>', path.name)
    subprocess.run([sys.executable, str(path)], check=True, cwd=str(SCRIPTS))
    print('\nOK 全部 PS 级素材已导出')


if __name__ == '__main__':
    main()
