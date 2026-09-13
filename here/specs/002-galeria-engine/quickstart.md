# quickstart.md — Motor de Galerias (002)

Guia de validacion integrada (unico modo de prueba, Const. III v3.0.0).
Prerrequisitos: plugin activo con modulo importado en `modules/textmuy/`
(RC28), datos en `wp-content/uploads/tm/{fonts,img,presets}/`.

## 1. Puente y arranque

- Abrir la pestana **Estilos de Texto** → el editor carga con puente
  (`motorUrl` apunta a `action=tm_galeria`).
- Sin puente (abrir `index.html` directo): pantalla de error clara; cero
  fetches a rutas locales (verificar en Network).

## 2. Operaciones por el endpoint unico

En Network, TODAS las peticiones de galeria apuntan a
`admin-post.php?action=tm_galeria` (con `op=listar|alta|baja|editar|sprite`
en el body) — cero `admin_post_personalizador_pdf_textmuy_*`:

1. **Imagenes**: subir (→ `op=alta`, tupla nueva con hueco mas bajo), editar
   nombre/categoria (`op=editar`), borrar (`op=baja`, tombstone `[id,"","",""]`
   en `tm/img/img.json`).
2. **Fuentes**: subir fisica (`op=alta`, firma TTF/OTF/WOFF/WOFF2), borrar
   (tombstone en `tm/fonts/fonts.json`), seleccionar y aplicar al texto.
3. **Presets**: guardar (`op=alta` + `.txm` con refs numericas + tupla en
   `tm/presets/presets.json`), borrar (tombstone + unlink).
4. **Sprite**: tras cada alta/baja, `op=sprite` persiste
   `tm/{ambito}/thumbs.webp` (unico archivo por ambito, sin `sprite.json`).

## 3. Rechazos con causa (Const. VI)

- Subir formato invalido → `motor:archivo:formato`.
- Nombre con caracteres invalidos → `motor:nombre:invalido`.
- (Opcional, staging) nonce expirado → mensaje "recarga la pagina".

## 4. Calidad

```bash
node tests/*.test.js        # 10/10 (catalog-unified ajustado a parseCats purgado)
node --check js/*.js
php -l personalizador-pdf.php inc/class-tm-galeria.php admin/estilos-texto.php
```

Grep de purga (debe estar limpio):
`'presets/'`, `'fonts/'`, `'img/'` (fallbacks), `descargarTxm`,
`usarLocalEmbebida`, `migrateLegacyPresets`, `admin_post_personalizador_pdf_textmuy_*`
en `js/` y el plugin.

## 5. Cache-bust

`index.html` y `render-core.html` con `?v=RC28` en todos los scripts propios;
Ctrl+F5 en el admin tras el despliegue.