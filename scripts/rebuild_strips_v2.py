from PIL import Image

atlas = Image.open('scripts/pg_assets/texture__info_message__zh__info_message.png').convert('RGBA')

# ==== Normal mode: 3 messages with 1200px gaps for clear separation ====
strip_src = atlas.crop((442, 0, 2040, 62))  # 1598x62

msg1 = strip_src.crop((0,    0, 575,  62))   # "赢得高达5倍奖金倍数!" (575px)
msg2 = strip_src.crop((577,  0, 1011, 62))   # "赢得高达1024路!" (434px)
msg3 = strip_src.crop((1014, 0, 1598, 62))   # "赢得高达10次奖金倍数!" (584px)

# Gap of 1200px (display gap ≈ 1200 × (33.6/62) ≈ 650px > container width ≈ 411px)
# This ensures each message is fully gone before the next appears
GAP = 1200

total_w = msg1.width + GAP + msg2.width + GAP + msg3.width
new_strip = Image.new('RGBA', (total_w, 62), (0, 0, 0, 0))
x = 0
new_strip.paste(msg1, (x, 0))
x += msg1.width + GAP
new_strip.paste(msg2, (x, 0))
x += msg2.width + GAP
new_strip.paste(msg3, (x, 0))

out_normal = 'client-app/public/images/games/mahjong/pg/ui/info2_strip.png'
new_strip.save(out_normal)
print(f'Normal strip: {new_strip.size} -> {out_normal}')
print(f'  msg1={msg1.width}px + {GAP}gap + msg2={msg2.width}px + {GAP}gap + msg3={msg3.width}px')
print(f'  Total = {total_w}px')

# ==== Free spin: info2 sprite (x=0,y=136,w=936,h=72) ====
fs_strip = atlas.crop((0, 136, 936, 208))   # 936x72
out_fs = 'client-app/public/images/games/mahjong/pg/ui/info2-fs-strip.png'
fs_strip.save(out_fs)
print(f'FS strip: {fs_strip.size} -> {out_fs}')

# Duration calculation (at heightPct=3.5%, 960px game height → display height ≈ 33.6px)
h = 33.6
scale = h / 62
total_display = (msg1.width + msg2.width + msg3.width + 2 * GAP) * scale
speed = 70  # px/s
duration = total_display / speed
print(f'\nAnimation duration at 70px/s: {duration:.1f}s → use {round(duration)}s')

fs_display = 936 / 72 * h
fs_duration = fs_display / speed
print(f'FS duration: {fs_duration:.1f}s → use {round(fs_duration)}s')
