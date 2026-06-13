# -*- coding: utf-8
"""赏金女王 · 一键流程：分析参考图 → 处理 AI 原稿 → 导出成品"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
AI = SCRIPTS.parent / 'assets' / 'ai-sources'


def run(name: str):
    path = SCRIPTS / name
    print('>>', name)
    subprocess.run([sys.executable, str(path)], check=True, cwd=str(SCRIPTS))


def main():
    run('analyze_qn_ref.py')
    if not AI.exists() or not any(AI.glob('qn-ai-*.png')):
        raise FileNotFoundError(
            f'缺少 AI 原稿，请先将 qn-ai-*.png 放入 {AI}\n'
            '（由图像生成工具按 element-manifest.json 逐项重绘）'
        )
    run('process_qn_ai_assets.py')
    print('\nOK 全部 PS 级素材已导出')


if __name__ == '__main__':
    main()
