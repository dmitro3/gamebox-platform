from PIL import Image
import os, numpy as np

# ic_win is at rect=[742, 3, 60, 60] in an unknown atlas
# Strategy: look at ALL atlases that are >= 802px wide, extract [742,3,802,63]
# and score based on: white pixel density + having content

results = []
for fname in sorted(os.listdir('scripts/pg_assets')):
    if not fname.endswith('.png'):
        continue
    try:
        img = Image.open(f'scripts/pg_assets/{fname}')
        w, h = img.size
        if w < 802 or h < 63:
            continue
        crop = img.crop((742, 3, 802, 63))
        arr = np.array(crop.convert('RGBA'))
        alpha_mean = arr[:,:,3].mean()
        alpha_nonzero = (arr[:,:,3] > 50).mean()
        white = ((arr[:,:,0]>200) & (arr[:,:,1]>200) & (arr[:,:,2]>200) & (arr[:,:,3]>50)).mean()
        results.append((fname, w, h, alpha_mean, alpha_nonzero, white))
    except:
        pass

# Sort by alpha_nonzero desc
results.sort(key=lambda x: x[4], reverse=True)
print('Candidates for ic_win [742,3,60,60]:')
for fname, w, h, am, anz, white in results[:10]:
    print(f'  {fname}: {w}x{h} alpha_mean={am:.0f} nonzero={anz:.2f} white={white:.2f}')
