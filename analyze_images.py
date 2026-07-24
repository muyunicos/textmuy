from PIL import Image
import numpy as np

for name in ['app-actual.png', 'app-objetivo.png']:
    img = Image.open(name).convert('RGB')
    arr = np.array(img)
    h, w = arr.shape[:2]
    print(f'=== {name} ({w}x{h}) ===')
    
    # Detect horizontal color bands (rows where color changes significantly)
    row_avgs = arr.mean(axis=1)  # shape (h, 3)
    
    # Find band boundaries
    bands = []
    band_start = 0
    for y in range(1, h):
        diff = np.abs(row_avgs[y] - row_avgs[band_start]).sum()
        if diff > 30:
            bands.append((band_start, y, row_avgs[band_start].astype(int)))
            band_start = y
    bands.append((band_start, h, row_avgs[band_start].astype(int)))
    
    print(f'  Horizontal bands ({len(bands)}):')
    for y1, y2, color in bands:
        pct1 = int(y1/h*100)
        pct2 = int(y2/h*100)
        print(f'    y={y1:4d}-{y2:4d} ({pct1:2d}%-{pct2:2d}%): RGB={color}')
    
    # Detect vertical regions in middle band
    mid_y = h // 2
    mid_strip = arr[mid_y - 20:mid_y + 20] if h > 40 else arr
    col_avgs = mid_strip.mean(axis=0)  # shape (w, 3)
    
    vbands = []
    vband_start = 0
    for x in range(1, w):
        diff = np.abs(col_avgs[x] - col_avgs[vband_start]).sum()
        if diff > 30:
            vbands.append((vband_start, x, col_avgs[vband_start].astype(int)))
            vband_start = x
    vbands.append((vband_start, w, col_avgs[vband_start].astype(int)))
    
    print(f'  Vertical bands at mid-height ({len(vbands)}):')
    for x1, x2, color in vbands:
        pct1 = int(x1/w*100)
        pct2 = int(x2/w*100)
        print(f'    x={x1:4d}-{x2:4d} ({pct1:2d}%-{pct2:2d}%): RGB={color}')
    
    print()