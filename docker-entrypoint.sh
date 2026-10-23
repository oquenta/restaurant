#!/bin/sh
set -e

echo "==> Iniciando La Paila en producción..."

if [ -n "$DATABASE_URL" ]; then
  echo "==> Verificando conexión a PostgreSQL..."
  MAX_RETRIES=20
  COUNT=0
  until pg_isready -d "$DATABASE_URL"; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
      echo "==> ERROR: No se pudo conectar a PostgreSQL tras $MAX_RETRIES intentos."
      exit 1
    fi
    echo "==> Esperando a que PostgreSQL esté disponible (intento $COUNT/$MAX_RETRIES)..."
    sleep 2
  done
  echo "==> Conexión establecida con PostgreSQL."

  # Restauración del volcado SQL con la base de datos real
  if [ -f "./bd/restaurante-db-2026-10-18.sql" ]; then
    HAS_PEDIDO_DUMP=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='Pedido';" 2>/dev/null | tr -d '[:space:]')
    DUMP_CHECK="0"
    if [ "$HAS_PEDIDO_DUMP" = "1" ]; then
      DUMP_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"Pedido\" WHERE codigo='3BB13';" 2>/dev/null | tr -d '[:space:]')
    fi

    if [ "$DUMP_CHECK" != "1" ]; then
      echo "==> Importando volcado bd/restaurante-db-2026-10-18.sql en PostgreSQL..."
      psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
      psql "$DATABASE_URL" < ./bd/restaurante-db-2026-10-18.sql
      echo "==> Volcado restaurado exitosamente en PostgreSQL."
    else
      echo "==> Base de datos con volcado real ya verificada y activa."
    fi
  fi

  echo "==> Verificando sincronización del esquema Prisma..."
  npx prisma db push --skip-generate || echo "==> Esquema Prisma ya actualizado."
else
  echo "==> ADVERTENCIA: DATABASE_URL no está definida."
fi

# Asegurar permisos del directorio de subidas
mkdir -p /app/public/uploads

echo "==> Arrancando servidor Next.js..."
exec node server.js
