"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, Check, AlertTriangle } from "lucide-react";
import { necesitaRevision } from "@/lib/revision";
import type { Base } from "@/types/coche";

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "nunca";

// Aviso de que hay que revisar que la base física coincide con la
// digital. Se comprueba cada domingo; si no se marca como revisada, el
// aviso se queda visible sin desaparecer (ni al día siguiente, ni a la
// semana que viene) hasta que alguien lo haga. Reservado a
// admin/oficinista/super_admin — los choferes no ven esto (Dashboard.tsx
// ya se encarga de no renderizarlo para ellos).
export default function RevisionBaseAviso() {
  const [activada, setActivada] = useState<boolean | null>(null);
  const [bases, setBases] = useState<Base[]>([]);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [resConf, resBases] = await Promise.all([
        fetch("/api/configuracion", { cache: "no-store" }),
        fetch("/api/bases", { cache: "no-store" }),
      ]);
      const conf = await resConf.json().catch(() => null);
      const datosBases = await resBases.json().catch(() => null);
      setActivada(resConf.ok ? Boolean(conf?.revision_semanal_activada) : null);
      setBases(resBases.ok ? datosBases?.bases ?? [] : []);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const marcarRevisada = async (id: number) => {
    setAccionando(id);
    const anterior = bases;
    setBases((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ultima_revision: new Date().toISOString() } : b))
    );
    const res = await fetch(`/api/bases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "marcar_revisada" }),
    });
    setAccionando(null);
    if (!res.ok) {
      setBases(anterior);
      alert("No se pudo marcar la base como revisada.");
    }
  };

  const cambiarActivada = async (valor: boolean) => {
    const anterior = activada;
    setActivada(valor);
    const res = await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision_semanal_activada: valor }),
    });
    if (!res.ok) {
      setActivada(anterior);
      alert("No se pudo cambiar la configuración.");
    }
  };

  if (cargando || activada === null) return null;
  if (bases.length === 0) return null; // nada que revisar todavía

  const pendientes = bases.filter((b) => necesitaRevision(b.ultima_revision));

  if (!activada) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
        <button
          onClick={() => cambiarActivada(true)}
          className="flex items-center gap-1.5 text-[11px] text-toro-slate underline decoration-dotted transition hover:text-toro-ink"
        >
          <Building2 size={12} /> Aviso de revisión semanal de bases: desactivado — Activar
        </button>
      </div>
    );
  }

  if (pendientes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
        <button
          onClick={() => cambiarActivada(false)}
          className="flex items-center gap-1.5 text-[11px] text-toro-slate underline decoration-dotted transition hover:text-toro-ink"
        >
          <Building2 size={12} /> Revisión semanal de bases: al día — Desactivar aviso
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <div className="rounded-card border border-toro-red/30 bg-toro-warnBg px-3.5 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-toro-red" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-toro-red">
              Toca revisar que la base física coincide con la digital (todos los domingos)
            </p>
            <div className="mt-2 space-y-1.5">
              {pendientes.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card bg-toro-surface px-2.5 py-1.5"
                >
                  <span className="text-xs text-toro-ink">
                    <strong>{b.numero}</strong> · {b.nombre}
                    <span className="ml-1.5 text-toro-slate">
                      — última revisión: {fmtFecha(b.ultima_revision)}
                    </span>
                  </span>
                  <button
                    onClick={() => marcarRevisada(b.id)}
                    disabled={accionando === b.id}
                    className="flex items-center gap-1 rounded-card bg-toro-ok/90 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-toro-ok disabled:opacity-50"
                  >
                    <Check size={12} /> Marcar revisada
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => cambiarActivada(false)}
              className="mt-2 text-[11px] text-toro-red/80 underline decoration-dotted transition hover:text-toro-red"
            >
              Desactivar este aviso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
