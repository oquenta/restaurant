"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { exigirRol } from "@/lib/sesion";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
  logo: yup.string().optional(),
  nombre: yup.string().required("Nombre obligatorio").max(100),
  ubicacion: yup.string().optional().max(200),
  telefono: yup.string().optional().max(20),
});

type ConfigForm = yup.InferType<typeof schema>;

export default function ConfiguracionGerencia() {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmiting },
  } = useForm<ConfigForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      nombre: "La Paila",
      ubicacion: "",
      telefono: "",
    },
  });

  useEffect(() => {
    fetch("/api/gerencia/configuracion", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setLogoPreview(d.logo || "");
      })
      .catch((e) => {
        console.error(e);
        setError("No se pudo cargar la configuración.");
      });
  }, []);

  const onSubmit = async (data: ConfigForm) => {
    setCargando(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("logo", data.logo as File);
      formData.append("nombre", data.nombre);
      formData.append("ubicacion", data.ubicacion ?? "");
      formData.append("telefono", data.telefono ?? "");

      const r = await fetch("/api/gerencia/configuracion", {
        method: "POST",
        body: formData,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Error desconocido");
      setConfig(d);
      setLogoPreview(d.logo || "");
      setError("");
    } catch (e: any) {
      setError(e.message ?? "Error al guardar.");
    } finally {
      setCargando(false);
    }
  };

  if (!config) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-[var(--muted)]">Cargando configuración…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Configuración del Restaurante</h2>

      {error && (
        <div className="mb-4 p-3 rounded text-[var(--peligro)] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Logo del restaurante</label>
          <div className="relative">
            <img
              src={config.logo || "/placeholder-logo.svg"}
              alt="Logo del restaurante"
              className="w-full h-32 object-cover rounded mb-2"
              style={{ background: "#eee" }}
            />
            <p className="text-xs text-[var(--muted)] cursor-pointer block">
              Hacer clic para cambiar o arrastrar imagen
            </p>
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%" }}
              onChange={(e) => {
                const file = e.target?.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (f) => setLogoPreview((f.target as FileReaderResult).result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
          {errors.logo && <p className="text-red-500 text-xs mt-1">Formato de imagen inválido</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Nombre del restaurante</label>
          <input
            {...register("nombre", { required: "Nombre obligatorio })}
            value={config?.nombre || "La Paila"}
            maxLength={100}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--amanecer)]"
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Ubicación / Dirección</label>
          <input
            {...register("ubicacion")}
            value={config?.ubicacion || ""}
            maxLength={200}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--amanecer)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Teléfono</label>
          <input
            {...register("telefono")}
            value={config?.telefono || ""}
            maxLength={20}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[var(--amanecer)]"
            type="tel"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="submit"
            className={`btn ${isSubmiting ? "disabled" : ""} btn-suave`}
            disabled={isSubmiting}
          >
            Guardar configuración
          </button>
          <Link
            href="/gerencia"
            className="btn btn-suave"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}