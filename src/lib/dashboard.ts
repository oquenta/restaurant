/**
 * Utilidad para registrar actividades en el dashboard persistente
 * Uso: import { recordActivity } from "@/lib/dashboard"
 */

import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL no está configurado");
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export interface ActivityInput {
  action: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  user_id?: string;
  user_name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registra una actividad en el dashboard
 */
export async function recordActivity(input: ActivityInput): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO system_activities (action, entity_type, entity_id, entity_name, user_id, user_name, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      input.action,
      input.entity_type,
      input.entity_id ?? null,
      input.entity_name ?? null,
      input.user_id ?? null,
      input.user_name ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
}

/**
 * Actualiza una métrica del dashboard
 */
export async function updateMetric(
  metricName: string,
  value: number,
  data?: Record<string, unknown>
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO dashboard_metrics (metric_name, metric_value, metric_data, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (metric_name)
     DO UPDATE SET metric_value = $2, metric_data = $3, updated_at = now()`,
    [metricName, value, JSON.stringify(data ?? {})]
  );
}

/**
 * Obtiene actividades recientes para el dashboard
 */
export async function getRecentActivities(limit = 50) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM system_activities
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/**
 * Obtiene métricas del dashboard
 */
export async function getDashboardMetrics() {
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM dashboard_metrics`);
  return result.rows;
}

/**
 * Obtiene actividades por tipo de entidad
 */
export async function getActivitiesByEntityType(entityType: string, limit = 50) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM system_activities
     WHERE entity_type = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [entityType, limit]
  );
  return result.rows;
}

/**
 * Registra un despliegue de Coolify
 */
export async function recordCoolifyDeployment(input: {
  projectId?: string;
  deploymentId?: string;
  status: string;
  commitSha?: string;
  branch?: string;
  durationSeconds?: number;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO coolify_deployments (coolify_project_id, deployment_id, status, commit_sha, branch, duration_seconds, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [
      input.projectId ?? null,
      input.deploymentId ?? null,
      input.status,
      input.commitSha ?? null,
      input.branch ?? null,
      input.durationSeconds ?? null,
    ]
  );
}

/**
 * Cierra el pool (útil para testing o shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}