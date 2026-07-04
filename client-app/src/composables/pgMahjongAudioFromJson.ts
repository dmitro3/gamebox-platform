/**
 * 从 PG 正版爬取 JSON 自动提取（scripts/extract-pg-audio-from-json.py）
 * 来源目录: scripts/麻将胡了/
 */

export type PgAudioClip = {
  name: string
  duration: number
  importFile: string
  /** deploy-mahjong-audio.py 复制到 public 的文件名 */
  deployFile: string | null
  configPath: string | null
}

export type PgAnimationAudioEvent = {
  animation: string
  frameSec: number
  handler: string
  importFile: string
}

/** config + import JSON 中的 cc.AudioClip */
export const PG_MAHJONG_AUDIO_CLIPS: PgAudioClip[] = [
  {name: "vox", duration: 53.04, importFile: "import__35_35f37ba4-b805-4315-b9cd-37491e61ee25.24379.json", deployFile: "vox.mp3", configPath: "audio/mp3/vox" },
  {name: "list_item_click", duration: 0.144, importFile: "import__36_367376dd-0441-48a5-b6a2-9a40ea1961de.bef6f.json", deployFile: null, configPath: null },
  {name: "general_audio", duration: 96.024, importFile: "import__67_671c5bc3-bbee-4aa1-b8dc-d32047af93f1.88c19.json", deployFile: "general-audio.mp3", configPath: "audio/mp3/general_audio" },
  {name: "bgm_mg", duration: 31.512, importFile: "import__70_707e06bc-e0fd-413c-8403-7ea54c9d9252.3310c.json", deployFile: "main-bgm.mp3", configPath: "audio/mp3/bgm_mg" },
  {name: "menu_icon_press", duration: 0.313469, importFile: "import__8d_8d433ee0-90f3-4d69-a858-67c252ea0ba9.88b58.json", deployFile: null, configPath: null },
  {name: "wallet_counting_above", duration: 0.574694, importFile: "import__a0_a03e8a93-ea9d-4b03-8b7f-253dc6f68ce9.b0df8.json", deployFile: null, configPath: null },
  {name: "bgm_bonus_loop", duration: 26.52, importFile: "import__b8_b83a99d7-a5a6-4774-8747-9679a8750e7a.21d70.json", deployFile: "free-spin-bgm.mp3", configPath: "audio/mp3/bgm_bonus_loop" },
  {name: "slider_effect", duration: 0.156438, importFile: "import__d0_d04d9257-b946-4cbb-b3bf-5039354cb377.8d0aa.json", deployFile: null, configPath: null },
]

/**
 * 动画事件 JSON 里只记录「何时调用哪个方法」，不含 general_audio/vox 切片时间。
 * 例: multiplier_board_vfx @ 0.5s -> playMultiplierSound
 */
export const PG_MAHJONG_ANIMATION_AUDIO_EVENTS: PgAnimationAudioEvent[] = [
  {animation: "scatter_glow_a_1", frameSec: 0.1875, handler: "playLoop", importFile: "import__0a_0acff6675.3f9dd.json" },
  {animation: "multiplier_board_vfx", frameSec: 0.5, handler: "playMultiplierSound", importFile: "import__0b_0b0136117.63230.json" },
  {animation: "ingot_shine_anim", frameSec: 2.4375, handler: "replayIngotShine", importFile: "import__0c_0c0766fb9.b6a20.json" },
  {animation: "normal_symbol_rotate", frameSec: 0.4583333333333333, handler: "onWinHighlightEnd", importFile: "import__0c_0c0766fb9.b6a20.json" },
]

export const PG_MAHJONG_AUDIO_PUBLIC = {
  general: "/audio/mahjong/general-audio.mp3",
  vox: "/audio/mahjong/vox.mp3",
  mainBgm: "/audio/mahjong/main-bgm.mp3",
  freeSpinBgm: "/audio/mahjong/free-spin-bgm.mp3",
} as const
