-- Schema idempotente (PostgreSQL)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,                       -- 'admin' | 'cajero'
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                       -- 'plato' | 'bebida' | 'postre'
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(12,2) NOT NULL,
  image_data TEXT,                          -- dataURL imágenes optimizadas
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,                -- código público, ej. MX7F2
  alias TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|pagado|expirado|eliminado|anulado
  total NUMERIC(12,2) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  order_type TEXT,                          -- 'local' | 'llevar' (al cobrar)
  payment_method TEXT,                      -- 'efectivo' | 'qr' (al cobrar)
  amount_received NUMERIC(12,2),
  change_due NUMERIC(12,2),
  paid_at TIMESTAMPTZ,
  paid_by TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                       -- plato|bebida|postre (para tickets)
  unit_price NUMERIC(12,2) NOT NULL,
  qty INT NOT NULL
);

CREATE TABLE IF NOT EXISTS modifications (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                       -- modificado|eliminado|anulado|creado
  reason TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  by_user TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta INT NOT NULL,                       -- positivo=ingreso, negativo=venta
  reason TEXT NOT NULL,                     -- ingreso|venta|anulacion|ajuste
  created_by TEXT NOT NULL DEFAULT 'sistema',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
