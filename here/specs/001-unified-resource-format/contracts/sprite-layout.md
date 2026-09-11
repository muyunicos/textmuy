# sprite-layout.md — Sprite fusionado por ambito

Un `.webp` por ambito junto a su catalogo (`fonts.webp`, `img.webp`, `presets.webp` bajo `wp-content/uploads/tm/{scope}/`, espejo `../uploads/tm/{scope}/`). Cero manifiestos por tile (Q3): se eliminan `presets/thumbs/presets.json` y los `.webp` sueltos.

## Grilla

De `thumbs{w,h,c}` del catalogo; filas derivadas `rows = ceil(maxId / c)` (los tombstones ocupan su tile vacio; no se reindexa hasta regenerar).

| ambito | w | h | ejemplo c |
|---|---|---|---|
| fonts | 180 | 30 | 4 |
| presets | 200 | 100 | 4 |
| imagenes | 100 | 100 | 8 (a definir en migracion; el contrato es `c` del JSON, no este numero) |

## Formula (tile = id-1)

```text
col = (id - 1) % c
row = floor((id - 1) / c)
x = col * w
y = row * h
tile = { x, y, w, h }
```

En CSS: `background-position: -xpx -ypx; width: wpx; height: hpx;`. En canvas: `drawImage(sprite, x, y, w, h, dx, dy, w, h)`.

## Regeneracion

Alta/baja/Save via handler `guardarSprite` del puente (ver `bridge-contract.md`). Sin sprite existiendo catalogo: render lazy del tile hasta regenerar (transitorio, permitido por spec). `invalid` nunca ocupa tile visible.
