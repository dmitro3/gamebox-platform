from PIL import Image
import numpy as np

files = [
    'client-app/public/images/games/mahjong/pg/ui/info2_strip.png',
    'client-app/public/images/games/mahjong/pg/ui/info2-fs-strip.png',
]

for fname in files:
    im = Image.open(fname).convert('RGBA')
    arr = np.array(im)
    alpha = arr[:,:,3]
    basename = fname.split('/')[-1]
    print(f'{basename}: size={im.size} alpha min={alpha.min()} max={alpha.max()}')
    print(f'  corner pixel RGBA: {tuple(arr[2,2,:])}')
    print(f'  middle pixel RGBA: {tuple(arr[im.size[1]//2, 2, :])}')
