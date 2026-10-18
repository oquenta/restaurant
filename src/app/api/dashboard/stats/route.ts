import { NextRequest, NextResponse } from "next/server";
import { current } from "@/auth";
import { json } from "@/util";
import { getRecentActivities, getDashboardMetrics, getActivitiesByEntityType, recordCoolifyDeployment } from "@/lib/dashboard";

export async function GET(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return json({ error: "Solo el administrador." }, 403);

  try {
    const [metrics, recentActivities] = await Promise.all([
      getDashboardMetrics(),
      getRecentActivities(100),
    ]);

    // Actividades por tipo (últimas 24h por categoría)
    const activitiesByType = await Promise.all([
      getActivitiesByEntityType("github", 20),
      getActivitiesByEntityType("coolify", 20),
      getActivitiesByEntityType("category", 20),
      getActivitiesByEntityType("product", 20),
    ]);

    return json({
      metrics,
      recent_activities: recentActivities,
      activities_by_type: {
        github: activitiesByType[0],
        coolify: activitiesByType[1],
        categories: activitiesByType[2],
        products: activitiesByType[3],
      },
      generated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Dashboard stats error:", e);
    return json({ error: e.message || "Error interno" }, 500);
  }
}

export async function POST(req: NextRequest) {
  const s = await current();
  if (!s || s.role !== "admin") return json({ error: "Solo el administrador." }, 403);

  try {
    const body = await req.json();
    const { action, entity_type, entity_id, entity_name, user_id, user_name, metadata } = body;

    if (!action || !entity_type) {
      return json({ error: "action y entity_type son requeridos" }, 400);
    }

    await recordCoolifyDeployment({
      projectId: entity_id,
      deploymentId: entity_id,
      status: action,
      commitSha: metadata?.commit_sha,
      branch: metadata?.branch,
      durationSeconds: metadata?.duration_seconds,
    });

    await recordActivity({
      action,
      entity_type,
      entity_id,
      entity_name,
      user_id: s.uid.toString(),
      user_name: s.name,
      metadata,
    });

    return json({ ok: true });
  } catch (e: any) {
    console.error("Record activity error:", e);
    return json({ error: e.message || "Error interno" }, 500);
  }
}