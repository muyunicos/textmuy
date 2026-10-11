# TextMuy

Editor de estilos de texto **client-side** (Canvas 2D + WebGL) al estilo TextStudio, que
vive **integrado** en el plugin de WordPress *Personalizador PDF* (iframe same-origin +
puente postMessage) y expone una **API de render** (`TextMuyAPI.renderBatch`) que convierte
texto + preset en un **PNG transparente** del tamaño exacto. No opera standalone: sin el
puente del plugin muestra un estado de error claro y accionable.

## Documentación

| Documento | Qué es |
|---|---|
| `AGENTS.md` | Contexto obligatorio del módulo: arquitectura, contratos, pruebas y reglas de trabajo. |
| `docs/entorno-desarrollo.md` | Entorno de desarrollo: Windows + PowerShell 7, Spec Kit + Cline, verificaciones y diagnóstico. |
| `.specify/memory/constitution.md` | Constitución del módulo (jerarquía documental). |
| `specs/001-fix-bugs-01/` | Spec SDD del lote de correcciones (spec, plan, tasks, quickstart). |

Jerarquía documental: `.specify/memory/constitution.md` > `AGENTS.md` > resto.

## Entorno de desarrollo (resumen)

- Windows + **PowerShell 7 (`pwsh`)** + VS Code + extensión **Cline**.
- **Spec Kit** con integración `cline` (predeterminada y única) y scripts `ps`.
- Los comandos se ejecutan desde la **raíz de este repositorio** (el módulo); no se asume
  Bash, WSL, `cmd` ni Windows PowerShell 5.1 como shell activo. Detalle y verificaciones:
  `docs/entorno-desarrollo.md`.

## Pruebas (desde la raíz del módulo)

```powershell
# Todas las suites Node (42; frena en la primera que falle):
Get-ChildItem tests -Filter *.test.js | ForEach-Object { node $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }

# Sintaxis de todos los scripts (node --check acepta un archivo por vez):
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }
Get-ChildItem js\effects -Filter *.js | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE) { throw "FALLO: $($_.Name)" } }
```

Suite completa, prueba integrada en WordPress y regla de cache-bump: `AGENTS.md` §9.
