import { db } from "@/lib/db";
import { jsonError, exigirRol } from "@/lib/sesion";

export const config = {
  api: {
    bodyParser: false,
    duration: 60,
  },
};

/** GET /api/gerencia/configuracion - Obtener configuración de la empresa */
export async function GET() {
  try {
    await exigirRol(["ADMIN"]);
    const config = await db.configuracion.findFirst({
      include: { usuario: true },
    });
    if (!config) {
      return Response.json({
        logo: "",
        nombre: "La Paila",
        ubicacion: "",
        telefono: "",
      });
    }
    return Response.json({
      logo: config.logo,
      nombre: config.nombre,
      ubicacion: config.ubicacion,
      telefono: config.telefono,
    });
  } catch (e) {
    return jsonError(e);
  }
}

/** POST /api/gerencia/configuracion - Actualizar configuración de la empresa */
export async function POST(req: Request) {
  try {
    await exigirRol(["ADMIN"]);
    const body = await req.json();
    const { logo, nombre, ubicacion, telefono } = body;

    let logoUrl = "";
    if (logo && typeof logo === "string") {
      logoUrl = logo;
    } else if (logo && logo?.name) {
      // Si viene como File, intentar subir
      try {
        const formData = new FormData();
        formData.append("file", logo);
        formData.append("upload_preset", "restaurant-logo");
        const r = await fetch(
          "https://api.cloudinary.com/v1_1/" +
            (process.env.CLOUDINARY_CLOUD_NAME || "") +
            "/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await r.json();
        if (data.secure_url) logoUrl = data.secure_url;
      } catch (e) {
        console.error("Error uploading logo:", e);
      }
    }

    // Actualizar o crear configuración
    let config = await db.configuracion.findFirst({
      where: { usuario: { rol: "ADMIN" } },
    });

    if (config) {
      config = await db.configuracion.update({
        where: { id: config.id },
        data: {
          logo: logoUrl || config.logo,
          nombre: nombre ?? config.nombre,
          ubicacion: ubicacion ?? config.ubicacion,
          telefono: telefono ?? config.telefono,
        },
      });
    } else {
      const admin = await db.usuario.findFirst({ where: { rol: "ADMIN" } });
      if (!admin) {
        return new Response(
          JSON.stringify({ error: "No hay usuario admin configurado." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      config = await db.configuracion.create({
        data: {
          logo: logoUrl,
          nombre: nombre ?? "La Paila",
          ubicacion: ubicacion ?? "",
          telefono: telefono ?? "",
          usuarioId: admin.id,
        },
      });
    }

    return Response.json({
      logo: config.logo,
      nombre: config.nombre,
      ubicacion: config.ubicacion,
      telefono: config.telefono,
    });
  } catch (e) {
    return jsonError(e);
  }
}