"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Save } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import type { Coche } from "@/types/coche";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES") : "—";

export default function EditarCocheModal({
  coche,
  onCerrar,
  onGuardado,
  onEliminado,
}: {
  coche: Coche | null;
  onCerrar: () => void;
  onGuardado: () => void;
  onEliminado: () => void;
}) {
  const [form, setForm] = useState<Partial<Coche>>({});
  const [guardando, setGuardando] = useState(false);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (coche) setForm(coche);
  }, [coche]);

  if (!coche) return null;

  const set = (campo: keyof Coche, valor: unknown) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/coches/${coche.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plaza: form.plaza ?? null,
          fecha_entrada: form.fecha_entrada,
          matricula: form.matricula,
          modelo: form.modelo,
          numero_expediente: form.numero_expediente,
          tiene_llave: form.tiene_llave,
          esta_calcinado: form.esta_calcinado,
          consigna: form.consigna || null,
          observaciones: form.observaciones,
        }),
      });
      if (res.ok) {
        setConfirmarGuardar(false);
        onGuardado();
        onCerrar();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detalle || data?.error || "No se pudo guardar.");
        setConfirmarGuardar(false);
      }
    } catch {
      setError("No hay conexión con el servidor.");
      setConfirmarGuardar(false);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/coches/${coche.id}`, { method: "DELETE" });
      if (res.ok) {
        onEliminado();
        onCerrar();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detalle || data?.error || "No se pudo eliminar.");
        setConfirmarEliminar(false);
      }
    } catch {
      setError("No hay conexión con el servidor.");
      setConfirmarEliminar(false);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex items-end justify-center bg-toro-ink/40 sm:items-center">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-toro-ink">Expediente</h2>
            <button onClick={onCerrar} className="text-toro-slate hover:text-toro-ink">
              <X size={20} />
            </button>
          </div>

          {/* Desglose detallado de custodia */}
          <div className="mb-4 space-y-1.5 rounded-card bg-toro-bg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-toro-slate">Días totales</span>
              <span className="font-medium text-toro-ink tabular">{coche.dias_totales}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-toro-slate">Vencen nuestros 3 días</span>
              <span className="tabular text-toro-ink">{fmt(coche.fecha_fin_propios)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-toro-slate">Vence cobertura Mapfre (día 12)</span>
              <span className="tabular text-toro-ink">{fmt(coche.fecha_fin_mapfre)}</span>
            </div>
            <div className="flex justify-between border-t border-toro-line pt-1.5">
              <span className="text-toro-slate">Días extra</span>
              <span className="tabular text-toro-ink">{coche.dias_extra}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-toro-slate">Penalización</span>
              <span className={`font-semibold tabular ${coche.penalizacion > 0 ? "text-toro-red" : "text-toro-ink"}`}>
                {coche.penalizacion}€
              </span>
            </div>
          </div>

          {/* Estado de salida / traslado, si aplica */}
          {coche.fecha_salida && (
            <div className="mb-4 rounded-card bg-toro-okBg p-3 text-sm text-toro-ok">
              Salió el {new Date(coche.fecha_salida).toLocaleString("es-ES")}
              {coche.traslado && (
                <> · Traslado{coche.empresa_traslado ? ` (${coche.empresa_traslado})` : ""}</>
              )}
            </div>
          )}

          {/* Presencia / última revisión */}
          <div className="mb-4 flex items-center justify-between rounded-card border border-toro-line px-3 py-2 text-xs text-toro-slate">
            <span>{coche.check_presencia ? "Presente" : "No está"} en la última revisión</span>
            <span className="tabular">{fmt(coche.ultima_revision)}</span>
          </div>

          {/* Formulario editable */}
          <div className="space-y-3">
            <input
              value={form.matricula ?? ""}
              onChange={(e) => set("matricula", e.target.value.toUpperCase())}
              placeholder="Matrícula"
              className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm uppercase outline-none focus:border-toro-red/40"
            />
            <input
              value={form.modelo ?? ""}
              onChange={(e) => set("modelo", e.target.value)}
              placeholder="Modelo"
              className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
            />
            <div className="flex gap-3">
              <input
                value={form.plaza ?? ""}
                onChange={(e) => set("plaza", e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null)}
                placeholder="Plaza"
                inputMode="numeric"
                className="w-1/2 rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
              />
              <input
                value={form.numero_expediente ?? ""}
                onChange={(e) => set("numero_expediente", e.target.value)}
                placeholder="Nº expediente"
                className="w-1/2 rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
              />
            </div>
            <label className="flex items-center justify-between text-sm text-toro-slate">
              Fecha de entrada
              <input
                type="date"
                value={form.fecha_entrada?.slice(0, 10) ?? ""}
                onChange={(e) => set("fecha_entrada", e.target.value)}
                className="rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
              />
            </label>
            <label className="flex items-center justify-between text-sm text-toro-slate">
              Última consigna
              <input
                type="date"
                value={form.consigna?.slice(0, 10) ?? ""}
                onChange={(e) => set("consigna", e.target.value)}
                className="rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
              />
            </label>
            <div className="flex gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
                <input
                  type="checkbox"
                  checked={!!form.tiene_llave}
                  onChange={(e) => set("tiene_llave", e.target.checked)}
                />
                Tiene llave
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
                <input
                  type="checkbox"
                  checked={!!form.esta_calcinado}
                  onChange={(e) => set("esta_calcinado", e.target.checked)}
                />
                Calcinado
              </label>
            </div>
            <textarea
              value={form.observaciones ?? ""}
              onChange={(e) => set("observaciones", e.target.value)}
              placeholder="Observaciones"
              rows={3}
              className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
            />
          </div>

          {error && (
            <p className="mt-3 rounded-card bg-toro-warnBg px-3 py-2 text-xs text-toro-red">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setConfirmarEliminar(true)}
              className="flex items-center justify-center gap-1.5 rounded-card border border-toro-red/30 px-3 py-2.5 text-sm font-medium text-toro-red transition hover:bg-toro-warnBg"
            >
              <Trash2 size={16} />
              Eliminar
            </button>
            <button
              onClick={() => setConfirmarGuardar(true)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-card bg-toro-ink py-2.5 text-sm font-semibold text-white transition hover:bg-toro-red"
            >
              <Save size={16} />
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        abierto={confirmarGuardar}
        titulo="Guardar cambios"
        mensaje={`Se actualizará el expediente de ${coche.matricula}.`}
        textoConfirmar="Guardar"
        cargando={guardando}
        onConfirmar={guardar}
        onCancelar={() => setConfirmarGuardar(false)}
      />

      <ConfirmModal
        abierto={confirmarEliminar}
        titulo="Eliminar registro"
        mensaje={`Esta acción no se puede deshacer. Se eliminará por completo el expediente de ${coche.matricula}.`}
        textoConfirmar="Eliminar"
        peligroso
        cargando={guardando}
        onConfirmar={eliminar}
        onCancelar={() => setConfirmarEliminar(false)}
      />
    </>
  );
}
