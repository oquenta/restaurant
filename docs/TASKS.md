# Tareas (SSG: Spec → Plan → Tasks → Build)

- [x] T1 Especificación funcional porрол (cliente/cajero/admin) y reglas de negocio → docs/SPEC.md
- [x] T2 Plan técnico: stack, esquema de BD, arquitectura, riesgos → docs/PLAN.md
- [x] T3 Esquema SQL + migración idempotente + semilla demo (pg-mem / Postgres real)
- [x] T4 Núcleo: config Next/TS/Tailwind, db.ts (pg + pg-mem), auth JWT, dominio (estados, expiración 30 min)
- [x] T5 API pública: menú, crear pedido, leer pedido, vencimiento automático
- [x] T6 API cajero: listar/buscar, modificar con motivo, eliminar con motivo, cobrar (efectivo/QR, cambio), tickets
- [x] T7 API admin: categorías, productos + fotos, stock (ingresos con fecha), cajeros, anulación, dashboard, reportes
- [x] T8 UI Cliente: carta con carrito, alto/bajo, checkout con alias+celular, confirmación con temporizador
- [x] T9 UI Cajero: lista con búsqueda y cuenta regresiva, modificación, cobro con cambio, impresión 2 tickets, reportes
- [x] T10 UI Admin: dashboard, productos con foto, stock, cajeros, pedidos con anulación, QR por mesa, reportes
- [x] T11 Diseño: tokens "Mesa Fonda", fuentes autoalojadas, responsive móvil→escritorio, print CSS
- [x] T12 QA: build de producción OK, login real verificado, flujo pedido→cobro→anulación verificado
- [x] T13 Empaquetado ZIP + capturas de pantalla (mockups HTML renderizados)
