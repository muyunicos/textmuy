# Contrato: Dependencias del render

**Feature**: `001-fix-bugs-01` | **Plan**: [plan.md](../plan.md) | **Historia**: US5

Contrato de cómo el render obtiene lo que necesita antes de dibujar. Cubre FR-026 a
FR-030. Es interno al módulo.

---

## 1. Dependencias de un render

### 1.1 Qué declara un render

| Dependencia | Origen | Se carga |
|---|---|---|
| Tipografía | La fuente del estilo | A demanda, por su identidad de catálogo |
| Recursos de imagen | Fondos, texturas, iconos y logos referenciados | A demanda, por su identidad en el catálogo de imágenes |

Nada más. Un estilo sin imágenes no espera imágenes; un estilo sin recursos de
tipografía no baja tipografías.

### 1.2 Requisitos

- **R-D1.1**: Las dependencias se **inician de forma concurrente**, no encadenadas.
  Ninguna espera a que termine la anterior para empezar la siguiente.
- **R-D1.2**: El dibujo comienza solo cuando **todas** las dependencias declaradas
  están resueltas. No se dibuja con una dependencia pendiente.
- **R-D1.3**: El tiempo total es el de la dependencia más lenta, no la suma de todas.
- **R-D1.4**: Si una dependencia falla, el render rechaza **nombrando esa
  dependencia** y su causa. No se sustituye ni se dibuja parcialmente.
- **R-D1.5**: Las dependencias que el estilo no declara no se piden. Prohibido
  precargar el catálogo completo o todas las fuentes.
- **R-D1.6**: El editor y el motor de render usan el **mismo** mecanismo de espera, de
  modo que la vista previa y el PDF coincidan.

---

## 2. Orden de fallo

### 2.1 Requisitos

- **R-D2.1**: Si fallan varias dependencias, el motivo informado corresponde a la
  primera que seDeclare como caída, y esa fuente es identificable (por ejemplo
  `fonts:<id>:<motivo>` o `img:<id>:<motivo>`).
- **R-D2.2**: Un fallo de recurso de imagen **nunca** se reporta como un fallo de
  tipografía, ni al revés.

---

## 3. Vista previa del editor

### 3.1 Requisitos

- **R-D3.1**: El editor espera la tipografía antes de pintar, y repinta cuando queda
  disponible (contrato de `font-resolution.md` §2).
- **R-D3.2**: El editor no espera imágenes para pintar: las dibuja cuando llegan, sin
  bloquear el texto. Una imagen ausente se informa, no se sustituye.
- **R-D3.3**: El editor y el motor pueden **no** coincidir en el instante de la
  espera, pero sí en el resultado: ambos dibujan la misma fuente declarada.