"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Pencil, Save, XCircle } from "lucide-react";
import type { Coche, Consigna } from "@/types/coche";

const hoy = () => new Date().toISOString().slice(0, 10);

const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-ES");

export default function ConsignasModal({
  coche,
  onCerrar,
  onCambio,
}: {
  coche: Coche | null;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const [consignas, setConsignas] = useState<Consigna[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fecha, setFecha] = useState(hoy());
  const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Si no es null, el formulario de arriba está editando esta consigna en
  // vez de crear una nueva.
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const cargar = async (cocheId: number) => {
    setCargando(true);
    const res = await fetch(`/api/coches/${cocheId}/consignas`);
    const data = await res.json();
    setConsignas(data.consignas ?? []);
    setCargando(false);
  };

  useEffect(() => {
    if (coche) {
      setFecha(hoy());
      setObservacion("");
      setEditandoId(null);
      setError(null);
      cargar(coche.id);
    }
  }, [coche]);

  if (!coche) return null;

  const empezarEdicion = (c: Consigna) => {
    setEditandoId(c.id);
    setFecha(c.fecha.slice(0, 10));
    setObservacion(c.observacion ?? "");
    setError(null);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFecha(hoy());
    setObservacion("");
    setError(null);
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const res = editandoId
        ? await fetch(`/api/consignas/${editandoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, observacion }),
          })
        : await fetch(`/api/coches/${coche.id}/consignas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, observacion }),
          });

      if (res.ok) {
        cancelarEdicion();
        await cargar(coche.id);
        onCambio();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detalle || data?.error || "No se pudo guardar la consigna.");
      }
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    if (editandoId === id) cancelarEdicion();
    await fetch(`/api/consignas/${id}`, { method: "DELETE" });
    await cargar(coche.id);
    onCambio();
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-toro-ink/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-toro-ink">
            Consignas · {coche.matricula}
          </h2>
          <button onClick={onCerrar} className="text-toro-slate hover:text-toro-ink">
            <X size={20} />
          </button>
        </div>

        {/* Añadir / editar una consigna */}
        <div className="mb-4 space-y-2 rounded-card bg-toro-bg p-3">
          {editandoId && (
            <div className="flex items-center justify-between text-xs font-medium text-toro-slate">
              Editando consigna
              <button onClick={cancelarEdicion} className="flex items-center gap-1 text-toro-slate hover:text-toro-ink">
                <XCircle size={13} /> Cancelar
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-card border border-toro-line bg-toro-surface px-3 py-2 text-sm outline-none focus:border-toro-red/40"
            />
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Observación"
              className="flex-1 rounded-card border border-toro-line bg-toro-surface px-3 py-2 text-sm outline-none focus:border-toro-red/40"
            />
          </div>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex w-full items-center justify-center gap-1.5 rounded-card bg-toro-red py-2 text-sm font-semibold text-white transition hover:bg-toro-redDark disabled:opacity-40"
          >
            {editandoId ? <Save size={16} /> : <Plus size={16} />}
            {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Añadir consigna"}
          </button>
          {error && <p className="text-xs text-toro-red">{error}</p>}
        </div>

        {/* Historial */}
        {cargando ? (
          <p className="text-center text-sm text-toro-slate">Cargando…</p>
        ) : consignas.length === 0 ? (
          <p className="rounded-card border border-dashed border-toro-line py-6 text-center text-sm text-toro-slate">
            Este coche todavía no tiene consignas registradas.
          </p>
        ) : (
          <ul className="space-y-2">
            {consignas.map((c) => (
              <li
                key={c.id}
                className={`flex items-start justify-between gap-2 rounded-card border p-2.5 text-sm ${
                  editandoId === c.id ? "border-toro-red/40 bg-toro-warnBg/30" : "border-toro-line"
                }`}
              >
                <div className="min-w-0">
                  <p className="tabular font-medium text-toro-ink">{fmt(c.fecha)}</p>
                  {c.observacion && (
                    <p className="whitespace-pre-wrap break-words text-xs text-toro-slate">{c.observacion}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => empezarEdicion(c)}
                    title="Editar esta consigna"
                    className="text-toro-slate/60 transition hover:text-toro-ink"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => eliminar(c.id)}
                    title="Eliminar esta consigna"
                    className="text-toro-slate/60 transition hover:text-toro-red"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
