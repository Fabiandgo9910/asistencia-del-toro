"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Trash2, ShieldCheck } from "lucide-react";

type UsuarioFila = {
  id: number;
  usuario: string;
  correo: string;
  rol: "super_admin" | "admin" | "oficinista" | "chofer";
  aprobado: boolean;
  creado_en: string;
};

const ROLES = [
  { valor: "admin", etiqueta: "Admin" },
  { valor: "oficinista", etiqueta: "Oficinista" },
  { valor: "chofer", etiqueta: "Chofer" },
  { valor: "super_admin", etiqueta: "Super admin" },
];

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rolElegido, setRolElegido] = useState<Record<number, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/admin/usuarios");
    const data = await res.json().catch(() => null);
    setUsuarios(data?.usuarios ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aprobar = async (id: number) => {
    const rol = rolElegido[id] ?? "chofer";
    await fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar", rol }),
    });
    cargar();
  };

  const cambiarRol = async (id: number, rol: string) => {
    await fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rol", rol }),
    });
    cargar();
  };

  const eliminar = async (id: number) => {
    await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" });
    cargar();
  };

  const pendientes = usuarios.filter((u) => !u.aprobado);
  const aprobados = usuarios.filter((u) => u.aprobado);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/" className="text-toro-slate hover:text-toro-ink">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="flex items-center gap-2 text-base font-semibold text-toro-ink">
          <ShieldCheck size={18} /> Gestión de usuarios
        </h1>
      </div>

      {cargando ? (
        <p className="text-sm text-toro-slate">Cargando…</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-toro-ink">
              Pendientes de aprobación ({pendientes.length})
            </h2>
            {pendientes.length === 0 ? (
              <p className="rounded-card border border-dashed border-toro-line py-6 text-center text-sm text-toro-slate">
                No hay solicitudes pendientes.
              </p>
            ) : (
              <div className="space-y-2">
                {pendientes.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center gap-2 rounded-card border border-toro-line bg-toro-surface p-3 shadow-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-toro-ink">{u.usuario}</p>
                      <p className="truncate text-xs text-toro-slate">{u.correo}</p>
                    </div>
                    <select
                      defaultValue={u.rol}
                      onChange={(e) => setRolElegido((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      className="rounded-card border border-toro-line px-2 py-1.5 text-xs outline-none"
                    >
                      {ROLES.filter((r) => r.valor !== "super_admin").map((r) => (
                        <option key={r.valor} value={r.valor}>
                          {r.etiqueta}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => aprobar(u.id)}
                      className="flex items-center gap-1 rounded-card bg-toro-ok/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-toro-ok"
                    >
                      <Check size={14} /> Aprobar
                    </button>
                    <button
                      onClick={() => eliminar(u.id)}
                      title="Rechazar solicitud"
                      className="rounded-card border border-toro-red/30 p-1.5 text-toro-red transition hover:bg-toro-warnBg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-toro-ink">
              Usuarios activos ({aprobados.length})
            </h2>
            <div className="space-y-2">
              {aprobados.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center gap-2 rounded-card border border-toro-line bg-toro-surface p-3 shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-toro-ink">{u.usuario}</p>
                    <p className="truncate text-xs text-toro-slate">{u.correo}</p>
                  </div>
                  <select
                    value={u.rol}
                    onChange={(e) => cambiarRol(u.id, e.target.value)}
                    className="rounded-card border border-toro-line px-2 py-1.5 text-xs outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.valor} value={r.valor}>
                        {r.etiqueta}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => eliminar(u.id)}
                    title="Eliminar usuario"
                    className="rounded-card border border-toro-red/30 p-1.5 text-toro-red transition hover:bg-toro-warnBg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
