# Contrato: Curva del texto (snapshot antes de perder el contexto GL)

**Feature**: `002-text-tab` | **Plan**: [plan.md](../plan.md)

Contrato de la operacion de curvado en bitmap. Cubre US1 y FR-001. Es
interno al modulo.

---

## 1. Operacion curvar

### 1.1 Requisitos

- **R-C1.1**: Curvar recibe la capa compuesta y el angulo, y devuelve un
  canvas con el texto curvado visible (tinta > 0 para cualquier angulo != 0
  sobre texto no vacio).
- **R-C1.2**: El canvas devuelto es 2D y autocontenido: el llamador lo usa
  con `drawImage` sin depender de ningun contexto vivo.
- **R-C1.3**: La liberacion del contexto WebGL (`loseContext`) ocurre
  **despues** del snapshot, nunca antes de devolver. El orden es:
  dibujar -> copiar a 2D -> perder el contexto -> devolver la copia.
- **R-C1.4**: Angulo 0 devuelve la capa sin tocar (via rapida, sin GL).
- **R-C1.5**: El signo del angulo espeja la curva (positivo un lado,
  negativo el otro).

---

## 2. Ruta headless vs editor

### 2.1 Requisitos

- **R-C2.1**: En la ruta headless (API), sin WebGL disponible el render
  rechaza con causa (constitucion II, sin degradacion silenciosa).
- **R-C2.2**: En el editor visible se conserva el fallback 2D existente
  cuando WebGL no esta disponible.
- **R-C2.3**: Ambos caminos producen la misma curva ante el mismo angulo
  (paridad FR-020); la diferencia solo esta en que falla, nunca en que se
  ve distinto.