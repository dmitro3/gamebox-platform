from PIL import Image

atlas = Image.open('scripts/pg_assets/texture__info_message__zh__info_message.png').convert('RGBA')

# ==== Normal mode: 3 messages with 400px gaps ====
strip_src = atlas.crop((442, 0, 2040, 62))  # 1598x62

msg1 = strip_src.crop((0,    0, 575,  62))   # "赢得高达5倍奖金倍数!" (575px)
msg2 = strip_src.crop((577,  0, 1011, 62))   # "赢得高达1024路!" (434px)
msg3 = strip_src.crop((1014, 0, 1598, 62))   # "赢得高达10次奖金倍数!" (584px)

print(f'msg1: {msg1.size}')
print(f'msg2: {msg2.size}')
print(f'msg3: {msg3.size}')

GAP = 400  # transparent gap between messages

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
print(f'\nNormal strip: {new_strip.size} -> {out_normal}')

# ==== Free spin: info2 sprite (x=0,y=136,w=936,h=72) ====
fs_strip = atlas.crop((0, 136, 936, 208))   # 936x72
out_fs = 'client-app/public/images/games/mahjong/pg/ui/info2-fs-strip.png'
fs_strip.save(out_fs)
print(f'FS strip: {fs_strip.size} -> {out_fs}')
