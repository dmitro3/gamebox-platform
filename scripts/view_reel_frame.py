from PIL import Image

img = Image.open('pg_assets/unknown_242.jpg')
print(f'Reel frame (unknown_242): {img.size}')
thumb = img.copy()
thumb.thumbnail((300, 350))
thumb.save('pg_assets/sprites/preview_reel_frame.jpg')
print('Saved preview')
