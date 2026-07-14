from PIL import Image
import os

files = ['top-bar-orange.png', 'info-message-text.png', 'multiplier-bar-bg.png']
for f in files:
    path = f'c:/Users/pc/Desktop/gamebox-platform/client-app/public/images/games/mahjong/pg/ui/{f}'
    img = Image.open(path).convert('RGBA')
    scale = min(0.5, 400/max(img.size))
    t = img.resize((int(img.width*scale), int(img.height*scale)), Image.LANCZOS)
    out = f'c:/Users/pc/Desktop/gamebox-platform/scripts/{f.replace(".png","_check.png")}'
    t.save(out)
    print(f'{f}: {img.size}')
print('完成')
