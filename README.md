# Mesa Fonda · POS de Restaurante

Aplicación web (móvil → escritorio) en **Next.js 14 + TypeScript + PostgreSQL** para:

- **Cliente con QR** — escanea, arma el carrito (platos, bebidas, postres), envía su pedido a la caja con **alias + celular** y ve su número de pedido con **temporizador de 30 min** para acercarse a pagar.
- **Cajero** — lista con búsqueda (alias/celular/código), modify/eliminar **siempre con justificación**, cobro en **efectivo (monto + cambio)** o **QR**, tipo de venta **local / para llevar**, e **impresión de 2 tickets** (Cocina y Barra). Reportes del día con hora de cada pedido.
- **Administrador** — categorías, productos con **foto**, stock con umbral e **ingresos(+5/+10/+50) con historial**, cajeros, anulación de pedidos pagados con motivo, dashboard, QR de mesas y reportes.

## Cómo ejecutar

```bash
npm install
npm run dev          # http://localhost:3000
```

Sin configuración adicional corre en **modo demo** (PostgreSQL en memoria con datos de prueba).

### Con PostgreSQL real

```bash
cp .env.example .env        # edita DATABASE_URL
npm run setup-db            # crea tablas + usuarios demo + semilla
npm run build && npm start  # producción
```

Accesos:
- Admin `admin / admin123`
- Cajero `cajero1 / cajero123`

## Pantallas

| URL | ¿Quién? | Qué hace |
|---|---|---|
| `/` | público | portada |
| `/menu` | cliente | carta + carrito + envío a caja + confirmación con temporizador |
| `/cajero/login`, `/cajero` | cajero | gestiona pedidos, cobra e imprime tickets, reportes |
| `/admin/login`, `/admin` | admin | dashboard, carta, inventario, cajeros, pedidos, QR de mesas |

## Impresión de tickets

Al confirmar el pago se abren los dos tickets (80 mm, uno de cocina y otro de barra) y el botón
"Imprimir 2 tickets" abre el diálogo del navegador. La hoja de estilos `globals.css` formatea
`@media print`.

## API

Ver `docs/SPEC.md` — resumen: `/api/orders` (crear/listar/patch/eliminar/pay/anular/report/status),
`/api/menu`, `/api/categories`, `/api/products (+stock)`, `/api/users`, `/api/dashboard`,
`/api/reports/stock`, `/api/qr`.
