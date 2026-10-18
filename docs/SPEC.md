# Especificación — Sistema POS de Restaurante (Ágil POS)

Fecha: 2026-10-17 · Estado: Aprobado v1.0

## 1. Visión
Aplicación web progresiva y responsive (móvil → escritorio) para que los clientes pidan desde la
mesa escaneando un QR, y el cajero/administrador gestionen cartas, pedidos, pagos, stock y reportes.
Stack: **Next.js 14 (App Router, TypeScript) + PostgreSQL + Tailwind + JWT (cookie httpOnly) + bcrypt + QR codes**.

## 2. Actores y flujos

### 2.1 Cliente (sin login, acceso por QR)
- Ejecuta el QR de la mesa → entra a `/menu` (aplicación de carta).
- Navega por secciones: **Platos, Bebidas, Postres**.
- Agrega productos al carrito; puede incrementar/reducir cantidad por ítem.
- Ve subtotal en vivo y botón **Enviar pedido a caja**.
- Al enviar pide a ciegas: **alias** (nombre corto del cliente) y **número de celular** (obligatorios).
- Pantalla de confirmación: mensaje "Tu pedido ya está en caja", **número de pedido (código)**,
  alias, total a pagar y **temporizador de 30 minutos**: si no pasa por caja en ese tiempo,
  el pedido **se anula automáticamente**.
- Si un producto está sin stock se muestra bloqueado con marca "Agotado".

### 2.2 Cajero (login con usuario y contraseña)
- Lista de pedidos con **búsqueda por alias o celular**, auto-refresco y cuenta regresiva visual
  (minutos restantes para el vencimiento de 30 min).
- Puede **modificar el pedido** (agregar/quitar/cambiar cantidades) → obliga a registrar **motivo/justificación**.
- Puede **eliminar el pedido** → obliga a registrar **motivo/justificación**.
- Cuando el cliente está conforme → **Cobrar**:
  - define tipo de venta: **local (service)** o **para llevar**;
  - método de pago: **efectivo** (ingresa monto recibido y calcula el **cambio** de forma automática, valida faltante) o **QR**;
  - confirma pago → queda registrado con hora exacta.
- Al pagarse se generan e imprimen **2 tickets**: uno para **COCINA** (platos + postres) y otro para
  **BARRA** (bebidas) — vista de impresión de 80 mm.
- Reportes: ventas del día por hora (cuándo se tomó el pedido), lista de pagados con método,
  estado de los recientes, y cuánto tiempo resta para que cada pedido pendiente se anule solo.

### 2.3 Administrador (login con usuario y contraseña)
- **Categorías**: crear/activar/desactivar (con tipo: plato, bebida, postre).
- **Productos**: crear/editar **platos, bebidas y postres** con **foto** (subida local convertida a imagen
  optimizada), precio, stock, umbral de stock bajo y estado activo.
- **Stock**: vista de "quedan pocas unidades", ingreso rápido (+5/+10/+50) y registro de cada
  movimiento con fecha/hora (reporte de cuándo fueron ingresados).
- **Cajeros**: crear cuenta con nombres y apellidos + contraseña; activar/desactivar.
- **Pedidos**: puede **anular** cualquier pedido (incluidos pagados por reincidencia) con justificación;
  el stock se devuelve al anular.
- **Dashboard**: ventas de hoy (Bs. y cantidad), pedidos pendientes, stock crítico, top ventas,
  y gráfica simple por método de pago.
- **Reportes**: platos más vendidos, bebidas más vendidas, productos por agotarse, ingresos de stock
  y modificaciones/anulaciones con responsable y motivo.

## 3. Reglas de negocio
- R1: Un pedido pendiente vive **máx. 30 min**; vencido pasa a `expirado` (anulado automáticamente).
- R2: El precio de cada ítem se lee **siempre** de la base de datos al crear el pedido (no confía en el cliente).
- R3: Modificación/eliminación/anulación **exigen justificación** y quedan auditadas (quién, cuándo, por qué).
- R4: El **stock se descuenta al cobrar** (venta) y **se repone al anular** un pedido pagado.
- R5: El pago en efectivo exige `monto_recibido >= total`; el cambio se calcula en chirimbolo.
- R6: Solo pedidos `pendiente` pueden modificarse/cobrarse/eliminarse.
- R7: Solo el administrador anula pagados; el cajero solo elimina pendientes.

## 4. Estados del pedido
`pendiente` → (30 min sin cobro) → `expirado`
`pendiente` → (cajero cobrar) → `pagado` → (admin anular) → `anulado`
`pendiente` → (cajero eliminar con motivo) → `eliminado`

## 5. API (resumen)
| Método | Ruta | Rol |
|---|---|---|
| GET | /api/menu | público |
| POST/GET | /api/orders | público / cajero |
| GET/PATCH/DELETE | /api/orders/[id] | cajero |
| POST | /api/orders/[id]/pay | cajero |
| POST | /api/orders/[id]/anular | admin |
| GET/POST | /api/categories, /api/products | admin |
| PATCH/DELETE | /api/products/[id] | admin |
| POST | /api/products/[id]/stock | admin |
| GET/POST | /api/users | admin |
| GET | /api/dashboard, /api/reports/* | admin/cajero |
| POST | /api/auth/login · logout · GET /me | staff |

## 6. Seguridad
Contraseñas hasheadas con bcrypt, sesión por JWT firmado (HS256) en cookie httpOnly, check de rol
en cada endpoint privado. Sin tokens en localStorage.

## 7. UX
- Cliente: una sola mano, botones grandes ≥44px, carrito tipo "hoja", verificación en 2 pasos.
- Cajero/Admin: teclado-por-teclado-densidad visual tailwind (listas densas), atajos de tab,
  tickets listos para imprimir.
