from PIL import Image
import os

img = Image.open(r'c:\Users\pc\Desktop\gamebox-platform\scripts\mahjong_img_backup\pg\ui\bg-main.png').convert('RGBA')
w, h = img.size

cut_x = 363
left = img.crop((0, 0, cut_x, h))
right = img.crop((cut_x, 0, w, h))

out_dir = r'c:\Users\pc\Desktop\gamebox-platform\scripts'
left.save(os.path.join(out_dir, 'bg_main_left.png'))
right.save(os.path.join(out_dir, 'bg_main_right.png'))
print(f'左侧主背景: {left.size}')
print(f'右侧木柱: {right.size}')

# 生成缩略图对比
scale = 0.3
for name, part in [('left', left), ('right', right)]:
    thumb = part.resize((int(part.width*scale), int(part.height*scale)), Image.LANCZOS)
    thumb.save(os.path.join(out_dir, f'bg_main_{name}_thumb.png'))
    print(f'缩略图保存: bg_main_{name}_thumb.png -> {thumb.size}')
