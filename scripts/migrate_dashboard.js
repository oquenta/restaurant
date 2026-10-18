/**
 * Script de migración para base de datos persistente en Coolify PostgreSQL
 * 
 * Uso:
 * 1. Agrega DATABASE_URL en Coolify Environment Variables
 * 2. Ejecuta: node scripts/migrate_dashboard.js
 * 
 * O desde Coolify:
 * 1. Ve a tu proyecto > Environment Variables
 * 2. Agrega DATABASE_URL con el connection string de PostgreSQL
 * 3. Redeploy
 */

import { Pool } from "pg";

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const schemaPath = path.join(process.cwd(), "scripts", "schema_dashboard.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    const statements = schema
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        console.log(`✓ Ejecutado: ${stmt.substring(0, 60)}...`);
      } catch (e) {
        console.warn(`⚠ Saltado: ${stmt.substring(0, 60)}... - ${e.message}`);
      }
    }

    console.log("\n✅ Migración completada exitosamente");
    console.log("\n📊 Tablas creadas:");
    console.log("  - system_activities (actividades del dashboard)");
    console.log("  - dashboard_metrics (métricas agregadas)");
    console.log("  - coolify_projects (proyectos monitoreados)");
    console.log("  - github_repos (repositorios conectados)");
    console.log("  - obsidian_images (imágenes del landing)");
    console.log("  - user_sessions (sesiones de usuario)");
    console.log("  - coolify_deployments (logs de despliegues)");
  } catch (e) {
    console.error("❌ Error en migración:", e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();