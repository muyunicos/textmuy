# sprite-layout.md — Sprite fusionado por ambito

`uploads/tm/{fonts,img,presets}/` (espejo `../uploads/tm/`): un `sprite.webp`
+ `sprite.json` FIJOS por ambito, junto a su catalogo y fisicos (sin
subcarpeta `thumbs/`, sin manifiesto por tile, sin `.webp` sueltos).
En standalone los tiles se renderizan en memoria (data-URL del sheet).

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
