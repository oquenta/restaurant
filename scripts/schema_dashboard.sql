-- Schema para dashboard persistente - PostgreSQL en Coolify
-- Ejecutar: psql $DATABASE_URL < scripts/schema_dashboard.sql

-- Tabla: Actividades del sistema (para dashboard)
CREATE TABLE IF NOT EXISTS system_activities (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,           -- 'github_push', 'coolify_deploy', 'image_upload', 'category_create', etc.
  entity_type TEXT NOT NULL,      -- 'repository', 'repository', 'category', 'product', 'user', 'order'
  entity_id TEXT,                 -- ID del entidad afectada
  entity_name TEXT,               -- Nombre legible
  user_id TEXT,                   -- Usuario que realizó la acción
  user_name TEXT,                 -- Nombre del usuario
  metadata JSONB DEFAULT '{}',    -- Datos adicionales de la acción
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_activities_action ON system_activities(action);
CREATE INDEX IF NOT EXISTS idx_system_activities_entity_type ON system_activities(entity_type);
CREATE INDEX IF NOT EXISTS idx_system_activities_created_at ON system_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_system_activities_user_id ON system_activities(user_id);

-- Tabla: Métricas agregadas del dashboard (para consultas rápidas)
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id SERIAL PRIMARY KEY,
  metric_name TEXT NOT NULL UNIQUE,
  metric_value INTEGER NOT NULL DEFAULT 0,
  metric_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Proyectos de Coolify monitoreados
CREATE TABLE IF NOT EXISTS coolify_projects (
  id SERIAL PRIMARY KEY,
  coolify_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'unknown',
  url TEXT,
  environment TEXT DEFAULT 'production',
  last_deploy TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Repositorios de GitHub conectados
CREATE TABLE IF NOT EXISTS github_repos (
  id SERIAL PRIMARY KEY,
  github_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  private BOOLEAN DEFAULT false,
  language TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  last_push TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Imágenes del landing OBSIDIAN (para gestión de imágenes)
CREATE TABLE IF NOT EXISTS obsidian_images (
  id SERIAL PRIMARY KEY,
  image_type TEXT NOT NULL,       -- 'hero_video', 'overlay_png', 'section_bg', etc.
  image_url TEXT NOT NULL,
  original_filename TEXT,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Sesiones de usuario (para tracking de dashboard)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  pages_visited INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,   -- segundos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla: Logs de despliegues Coolify
CREATE TABLE IF NOT EXISTS coolify_deployments (
  id SERIAL PRIMARY KEY,
  coolify_project_id TEXT,
  deployment_id TEXT,
  status TEXT NOT NULL,           -- 'building', 'deployed', 'failed'
  commit_sha TEXT,
  branch TEXT DEFAULT 'main',
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coolify_deployments_status ON coolify_deployments(status);
CREATE INDEX IF NOT EXISTS idx_coolify_deployments_created_at ON coolify_deployments(created_at);

-- Función: Auto-actualizar updated_at en coolify_projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coolify_projects_updated_at
  BEFORE UPDATE ON coolify_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Datos iniciales para dashboard_metrics
INSERT INTO dashboard_metrics (metric_name, metric_value, metric_data) VALUES
  ('total_categories', 0, '{}'),
  ('total_products', 0, '{}'),
  ('total_users', 0, '{}'),
  ('total_orders', 0, '{}'),
  ('total_deployments', 0, '{}'),
  ('total_images', 0, '{}')
ON CONFLICT (metric_name) DO NOTHING;