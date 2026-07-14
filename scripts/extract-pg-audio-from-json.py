#!/usr/bin/env python3
"""
从正版爬取 JSON 提取麻将胡了音频配置，生成 client-app 可用的 TypeScript。

JSON 能提供的：
  - config__resources_config.f413e.json：资源路径
  - import__* AudioClip：clip 名 + duration
  - import__* AnimationClip events：动画帧 -> 回调方法名

JSON 不能提供的（在编译后游戏脚本里）：
  - general_audio / vox 精灵切片的 start/end 秒数
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRAPE = next(
    d for d in (ROOT / "scripts").iterdir()
    if d.is_dir() and (d / "pg-assets-manifest.json").exists()
)
OUT = ROOT / "client-app/src/composables/pgMahjongAudioFromJson.ts"

DEPLOY_NAMES = {
    "general_audio": "general-audio.mp3",
    "vox": "vox.mp3",
    "bgm_mg": "main-bgm.mp3",
    "bgm_bonus_loop": "free-spin-bgm.mp3",
}


def parse_audio_clips() -> list[dict]:
    clips: list[dict] = []
    for imp in sorted(SCRAPE.glob("import__*.json")):
        text = imp.read_text(encoding="utf-8", errors="ignore")
        if "AudioClip" not in text:
            continue
        m = re.search(r'\[\[0,"([^"]+)","\.mp3",([0-9.]+)\]', text)
        if not m:
            continue
        name, dur = m.group(1), float(m.group(2))
        clips.append(
            {
                "name": name,
                "duration": dur,
                "import": imp.name,
                "deploy": DEPLOY_NAMES.get(name),
            }
        )
    return clips


def parse_config_paths() -> dict[str, str]:
    cfg = json.loads((SCRAPE / "config__resources_config.f413e.json").read_text(encoding="utf-8"))
    out: dict[str, str] = {}
    for _k, v in cfg.get("paths", {}).items():
        if isinstance(v, list) and v and "audio" in str(v[0]).lower():
            out[str(v[0])] = str(_k)
    return out


def parse_animation_events() -> list[dict]:
    events: list[dict] = []
    block_re = re.compile(
        r'\[\d+,"([^"]+)",([0-9.]+),([0-9.]+),\[(.*?)\],\[\{\},"paths"',
        re.DOTALL,
    )
    event_re = re.compile(
        r'"frame":([0-9.]+),"func":"([^"]+)"(?:,"params":(\[[^\]]*\]))?'
    )
    for imp in sorted(SCRAPE.glob("import__*.json")):
        text = imp.read_text(encoding="utf-8", errors="ignore")
        if '"func":' not in text:
            continue
        for block in block_re.finditer(text):
            anim = block.group(1)
            for m in event_re.finditer(block.group(4)):
                func = m.group(2)
                if not any(
                    x in func.lower()
                    for x in ("sound", "audio", "play", "vox", "mult", "spin", "reel", "win", "scatter", "loop")
                ):
                    continue
                events.append(
                    {
                        "func": func,
                        "frameSec": float(m.group(1)),
                        "params": m.group(3) or "[]",
                        "animation": anim,
                        "import": imp.name,
                    }
                )
    return events


def emit_ts(clips: list[dict], paths: dict[str, str], events: list[dict]) -> str:
    lines = [
        "/**",
        " * 从 PG 正版爬取 JSON 自动提取（scripts/extract-pg-audio-from-json.py）",
        " * 来源目录: scripts/麻将胡了/",
        " */",
        "",
        "export type PgAudioClip = {",
        "  name: string",
        "  duration: number",
        "  importFile: string",
        "  /** deploy-mahjong-audio.py 复制到 public 的文件名 */",
        "  deployFile: string | null",
        "  configPath: string | null",
        "}",
        "",
        "export type PgAnimationAudioEvent = {",
        "  animation: string",
        "  frameSec: number",
        "  handler: string",
        "  importFile: string",
        "}",
        "",
        "/** config + import JSON 中的 cc.AudioClip */",
        "export const PG_MAHJONG_AUDIO_CLIPS: PgAudioClip[] = [",
    ]
    path_by_name = {
        "audio/mp3/general_audio": "general_audio",
        "audio/mp3/vox": "vox",
        "audio/mp3/bgm_mg": "bgm_mg",
        "audio/mp3/bgm_bonus_loop": "bgm_bonus_loop",
    }
    for c in clips:
        cfg_path = None
        for p, n in path_by_name.items():
            if n == c["name"]:
                cfg_path = p
                break
        lines.append(
            "  {"
            f'name: "{c["name"]}", duration: {c["duration"]}, '
            f'importFile: "{c["import"]}", '
            f'deployFile: {json.dumps(c["deploy"])}, '
            f'configPath: {json.dumps(cfg_path)}'
            " },"
        )
    lines.append("]")
    lines.extend(
        [
            "",
            "/**",
            " * 动画事件 JSON 里只记录「何时调用哪个方法」，不含 general_audio/vox 切片时间。",
            " * 例: multiplier_board_vfx @ 0.5s -> playMultiplierSound",
            " */",
            "export const PG_MAHJONG_ANIMATION_AUDIO_EVENTS: PgAnimationAudioEvent[] = [",
        ]
    )
    for e in events:
        lines.append(
            "  {"
            f'animation: "{e["animation"]}", frameSec: {e["frameSec"]}, '
            f'handler: "{e["func"]}", importFile: "{e["import"]}"'
            " },"
        )
    lines.append("]")
    lines.extend(
        [
            "",
            "export const PG_MAHJONG_AUDIO_PUBLIC = {",
            '  general: "/audio/mahjong/general-audio.mp3",',
            '  vox: "/audio/mahjong/vox.mp3",',
            '  mainBgm: "/audio/mahjong/main-bgm.mp3",',
            '  freeSpinBgm: "/audio/mahjong/free-spin-bgm.mp3",',
            "} as const",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    clips = parse_audio_clips()
    paths = parse_config_paths()
    events = parse_animation_events()
    OUT.write_text(emit_ts(clips, paths, events), encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"  clips: {len(clips)}")
    print(f"  animation events: {len(events)}")
    for e in events:
        print(f"    {e['animation']} @ {e['frameSec']}s -> {e['func']}")


if __name__ == "__main__":
    main()
