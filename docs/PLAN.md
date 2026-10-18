# Plan técnico

## Arquitectura
- Monorepo simple: app Next.js con App Router. Server Components solo para landing; el resto son
  pantallas controladas por cliente (POS interactivo) que consumen rutas `/api/*`.
- Capa de datos: `src/db.ts` usa `pg` (Pool) cuando `DATABASE_URL` está definida; si no, arranca
  **pg-mem** en memoria con semilla de demo — así el proyecto corre `npm run dev` sin configurar nada.
- Autenticación: JWT (`jose`) en cookie `pos_session`; `src/auth.ts` resuelve sesión y rol.
- Vencimiento: función `expireOldOrders()` llamada en lecturas/escrituras de pedidos.

## Esquema PostgreSQL
users, categories, products, orders, order_items, modifications, stock_movements (DDL completo en
`scripts/schema.sql`, idempotente).

## Árbol de archivos
```
src/app
  page.tsx                landing pública
  menu/page.tsx           carta + carrito + checkout + confirmación (cliente)
  cajero/login/page.tsx   login cajero
  cajero/page.tsx         consola cajero (pedidos, cobro, tickets, reportes)
  admin/login/page.tsx    login admin
  admin/page.tsx          consola admin (dashboard, productos, categorías, cajeros, pedidos, reportes, QR)
src/app/api/**            21 endpoints REST
src/components            MenuApp · CajeroApp · AdminApp · LoginForm
src/db.ts · auth.ts · domain.ts
scripts/schema.sql · setup-db.mjs (crea tablas + usuarios demo en Postgres real)
```

## Diseño (tokens)
- Marca: "Mesa Fonda" — cocina de fondo, tinta guinda. Paleta: guinda `#7C2430`, papel crema
  `#F7F1E6`, verde oscuro `#1E4D3F`, mostaza `#E7A93C`, tinta `#221A14`, blanco `#FFFCF6`.
- Tipografía: **Fraunces** (display serif con carácter gastronómico) + **Atkinson Hyperlegible**
  (UI legible). Autoalojadas en `public/fonts` (sin red en build).
- Cliente: felicidad visual (tarjetas grandes, imágenes apetito), una acción dominante.
- Caja/Admin: fondo oscuro verde para diferenciar contexto operativo.

## Riesgos y mitigaciones
- Postgres no instalado → pg-mem de demo (misma lógica SQL).
- `npm install` sin red para fuentes → fuentes locales.
- Impresión depende del navegador → print CSS dedicado (80 mm) + preview en pantalla.
