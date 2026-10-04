# Entorno de desarrollo — TextMuy

> Jerarquía documental: `.specify/memory/constitution.md` > `AGENTS.md` > resto.
> Este documento operativiza `AGENTS.md` §8–§10 para el entorno real de trabajo.
> Verificado el 2026-10-03.

## 1. Plataforma y shell

- **Windows** con **PowerShell 7 (`pwsh`)** como shell activo, **VS Code** y la extensión
  **Cline** como agente.
- No se asume Bash, WSL, `cmd` ni Windows PowerShell 5.1 en ningún paso.
- Todos los comandos se ejecutan desde la **raíz de este repositorio** (la carpeta del
  módulo TextMuy), salvo indicación explícita. En el checkout de desarrollo el módulo vive
  en `personalizador-pdf/modules/textmuy/`; en WordPress vive en
  `wp-content/plugins/personalizador-pdf/modules/textmuy/` (repo propio, integrado al
  plugin vía iframe + puente; ver `AGENTS.md` §4).

### Comprobación del shell

```powershell
$PSVersionTable.PSVersion
(Get-Process -Id $PID).Path
```

Esperado: `7.x` y una ruta terminada en `pwsh.exe`.

## 2. Herramientas requeridas

| Herramienta | Verificación | Uso |
|---|---|---|
| PowerShell 7 | `$PSVersionTable.PSVersion` | Shell de VS Code/Cline y de los scripts Spec Kit (`ps`). |
| VS Code | `code --version` | IDE; su terminal integrada la usa Cline. |
| Cline | Extensión instalada | Agente (modos Plan/Act). |
| `uv` | `uv --version` / `uv tool list` | Gestor con el que está instalado `specify-cli`. |
| `specify` | `specify version` | Flujo SDD (specify → plan → tasks → implement). |
| Node.js | `node --version` | Solo tests del módulo; nunca en el servidor WordPress. |
| Git | `git --version` | Versionado del módulo (repo propio). |

Comprobación conjunta:

```powershell
Get-Command pwsh, specify, uv, node, git | Select-Object Name, Source
specify check
```

### 2.1 Prohibición absoluta de bash (diagnóstico 2026-10-03)

🔴 **En esta máquina `bash` es un agujero negro.** Verificado:

| Qué | Resultado |
|---|---|
| `Get-Command bash` | `C:\Program Files\Wiimm\WIT\bash.exe` — cygwin de **Wiimm** (Wii Modding Tool), NO Git Bash |
| `bash --version` | `GNU bash 4.4.12 (x86_64-unknown-cygwin)` + `warning: could not find /tmp` |
| `Test-Path C:\Windows\System32\bash.exe` | `False` (el `terminal.external.windowsExec` de VS Code apunta a un archivo **inexistente**) |
| Scripts `.sh` en el módulo | **0**. Spec Kit usa `ps` (PowerShell). |

**Nunca** invocar `bash`, `sh`, `wsl` ni `curl`. Para fetching usar
`Invoke-WebRequest` / `Get-Content`. `tests/entorno.test.js` falla si aparece un `.sh`.

### 2.2 Defectos de entorno conocidos (y su estado)

| Defecto | Síntoma | Estado / arreglo |
|---|---|---|
| `core.autocrlf=true` (global) sin `.gitattributes` | Worktree MIXTO (`w/mixed`, `w/crlf`) y **diffs fantasma** | **Corregido**: `.gitattributes` con `* text=auto eol=lf` |
| BOM UTF-8 en `js/controls.js`, `js/galeria.js` | Primer carácter invisible; parseo inconsistente | **Corregido**: eliminados |
| `[Console]::OutputEncoding` = `ibm850` (CP850) | Mojibake en salida de CLIs (ej. ASCII art de `specify check`) | **Corregido**: perfil de pwsh (§4.1) |
| PowerShell instalado como **MSIX/Store** | `Get-Command pwsh` devuelve `...\WindowsApps\...\pwsh.exe` | **Sin impacto** (ver §2.3): la ruta existe y funciona |

### 2.3 Sobre el PowerShell MSIX/Store (falso positivo descartado)

`pwsh` está instalado como paquete MSIX, así que `Get-Command pwsh` devuelve
`C:\Program Files\WindowsApps\Microsoft.PowerShell_7.6.6.0_x64__8weifyb3d8bbwe\pwsh.exe`.
Esa carpeta `WindowsApps` es **protegida** y hace que herramientas de bajo nivel la
reporten como inexistente. Se verificó que **NO es un problema real**:

```powershell
Test-Path 'C:\Program Files\WindowsApps\...\pwsh.exe'   # True (desde otra sesion pwsh)
Get-Acl 'C:\Program Files\WindowsApps\...\pwsh.exe'     # NT AUTHORITY\SYSTEM (accesible)
```

Node la ejecuta sin problema (`child_process.execFileSync` → OK). El ruido
`:\Program Files\WindowsApps\...\pwsh.exe\` en la salida del runner **no** es un fallo del
comando ejecutado. **No reinstalar PowerShell como MSI**: no aporta nada y `winget` además
lo rechaza por conflicto con el paquete MSIX ya instalado.

## 3. Spec Kit (SDD) en este repositorio

- Integración **predeterminada y única**: `cline`.
- Scripts generados para PowerShell (`--script ps`): `.specify/scripts/powershell/*.ps1`.
  Los workflows (`.clinerules/workflows/speckit-*.md`) los ejecutan **desde la raíz del
  módulo**.
- Estado actual (2026-10-03):
  - `.specify/init-options.json` → `ai=cline`, `integration=cline`, `script=ps`,
    `speckit_version=1.1.0`.
  - `.specify/integration.json` → `integration=cline`, `default_integration=cline`,
    `settings.cline.script=ps`.
  - `specify integration status` → `Integration status: OK`, `Default integration: cline`,
    `Installed integrations: cline`, `0` modificados / `0` faltantes.
- A diferencia del repo del plugin (donde `.specify/` y `.clinerules/` están en
  `.gitignore`), **aquí sí están versionados**: el resultado de una actualización aparece
  en `git status` / `git diff` y se revisa antes de commitear. La verificación de
  integridad es `specify integration status` (campos *Modified managed files* /
  *Missing managed files*).
- No editar a mano `.clinerules/workflows/*`, `.specify/scripts/*` ni
  `.specify/templates/*`: son archivos gestionados por el CLI (un cambio local hace que
  `upgrade` los bloquee).
- Actualizar/regenerar la integración (diff-aware), revisando el diff antes de commitear:

```powershell
specify integration status                      # antes: debe dar OK
specify integration upgrade cline --script ps   # --force solo si el cambio local es deliberado
git status ; git diff                           # revisar el resultado del upgrade
```

- Actualizaciones del CLI: `specify self check`.

## 4. Terminal de VS Code y Cline

- `.vscode/settings.json` (versionado) fija
  `terminal.integrated.defaultProfile.windows: "PowerShell"`: VS Code resuelve al perfil
  PowerShell, que usa **`pwsh` cuando PowerShell 6+ está instalado** (y Windows PowerShell
  como respaldo), por lo que la terminal integrada queda en PowerShell 7 en este equipo.
- **Cline hereda ese shell**: su ajuste *Default Terminal Profile* (Cline → Settings →
  Terminal) en valor `Default` usa la configuración global de VS Code; además, si no hay
  perfil configurado, replica el default de VS Code (PowerShell con `pwsh`, nunca `cmd.exe`).
- Si Cline reporta *Shell Integration Unavailable*: reabrir la terminal, actualizar VS Code
  y seguir la guía oficial (ver §7).
- Verificación efectiva (en la terminal integrada y en cualquier sesión de Cline):

```powershell
$PSVersionTable.PSVersion      # 7.x
(Get-Process -Id $PID).Path    # ...\pwsh.exe
Get-Location                   # raíz del módulo
```

### 4.1 Codificación de la consola (aplicado)

El defecto 4 de §2.2 (`[Console]::OutputEncoding` = `ibm850`) se corrigió con un **perfil de
PowerShell** en `C:\Users\Jonatan\Documents\PowerShell\Microsoft.PowerShell_profile.ps1`
(fuera del repo: es configuración personal de la máquina):

```powershell
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

Verificación (esperado: `utf-8`):

```powershell
pwsh -NoProfile -Command '[Console]::OutputEncoding.WebName'
```

> Nota: el archivo existe pero `Test-Path $PROFILE` puede dar `False` si el directorio de
> documentos está redirigido (OneDrive). Verificar con `pwsh -NoProfile -Command ...`.

> Además, y ya versionado en el repo: `.gitattributes` + `.editorconfig` +
> `.vscode/settings.json` garantizan que **los archivos** sean UTF-8 sin BOM y LF. El perfil
> arregla la **salida de consola**, que es un asunto de la máquina.

## 5. Diagnóstico ante fallos (orden obligatorio)

Antes de diagnosticar o cambiar el entorno:

1. **Shell activo**: `$PSVersionTable.PSVersion` (7.x) y `(Get-Process -Id $PID).Path` (`pwsh.exe`).
2. **Directorio actual**: `Get-Location` (debe ser la raíz del módulo).
3. **PATH y herramientas**: `Get-Command pwsh, specify, uv, node, git` y `specify check`.
4. Recién entonces, diagnosticar el comando puntual (leyendo el error real).

No cambiar perfiles, PATH ni versiones sin evidencia de los pasos 1–3.

## 6. Límites (sin aprobación explícita del usuario)

- No modificar **bases de datos**, **credenciales** ni **servicios externos**.
- No **desplegar a producción** ni publicar el módulo sin aprobación explícita. El módulo
  viaja dentro del plugin (ver `AGENTS.md` §8); su prueba real es la pestaña "Estilos de
  Texto" del plugin.
- No ejecutar comandos destructivos (borrados masivos, migraciones, instalaciones) sin
  pedirlo antes.

## 7. Referencias

- `AGENTS.md` §8–§10 (canónico técnico) y `.specify/memory/constitution.md` (jerarquía).
- VS Code — *Terminal Profiles*: https://code.visualstudio.com/docs/terminal/profiles
- Cline — *Terminal Quick Fixes*: https://docs.cline.bot/troubleshooting/terminal-quick-fixes
- Cline — *Terminal Integration Guide*: https://docs.cline.bot/troubleshooting/terminal-integration-guide
