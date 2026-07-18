"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Save } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import type { Coche } from "@/types/coche";

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
  const [matricula, setMatricula] = useState("");
  const [modelo, setModelo] = useState("");
  const [plaza, setPlaza] = useState("");
  const [expediente, setExpediente] = useState("");
  const [fecha, setFecha] = useState("");
  const [tieneLlave, setTieneLlave] = useState(true);
  const [calcinado, setCalcinado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precarga el formulario con los valores actuales del coche cada vez que
  // se abre un expediente distinto (mismo formulario que "Nueva entrada").
  useEffect(() => {
    if (coche) {
      setMatricula(coche.matricula);
      setModelo(coche.modelo ?? "");
      setPlaza(coche.plaza != null ? String(coche.plaza) : "");
      setExpediente(coche.numero_expediente ?? "");
      setFecha(coche.fecha_entrada?.slice(0, 10) ?? "");
      setTieneLlave(coche.tiene_llave);
      setCalcinado(coche.esta_calcinado);
      setError(null);
    }
  }, [coche]);

  if (!coche) return null;

  const guardar = async () => {
    if (!matricula.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/coches/${coche.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricula,
          modelo: modelo || null,
          plaza: plaza ? Number(plaza) : null,
          numero_expediente: expediente || null,
          fecha_entrada: fecha,
          tiene_llave: tieneLlave,
          esta_calcinado: calcinado,
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
        <div className="w-full max-w-md rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-toro-ink">Editar expediente</h2>
            <button onClick={onCerrar} className="text-toro-slate hover:text-toro-ink">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <input
              autoFocus
              value={matricula}
              onChange={(e) => setMatricula(e.target.value.toUpperCase())}
              placeholder="Matrícula *"
              className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-toro-red/40"
            />
            <input
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Modelo"
              className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
            />
            <div className="flex gap-3">
              <input
                value={plaza}
                onChange={(e) => setPlaza(e.target.value.replace(/\D/g, ""))}
                placeholder="Plaza"
                inputMode="numeric"
                className="w-1/2 rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
              />
              <input
                value={expediente}
                onChange={(e) => setExpediente(e.target.value)}
                placeholder="Nº expediente"
                className="w-1/2 rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
              />
            </div>
            <label className="flex items-center justify-between text-sm text-toro-slate">
              Fecha de entrada
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
              />
            </label>
            <div className="flex gap-2 pt-1">
              <label className="flex flex-1 items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
                <input
                  type="checkbox"
                  checked={tieneLlave}
                  onChange={(e) => setTieneLlave(e.target.checked)}
                />
                Tiene llave
              </label>
              <label className="flex flex-1 items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
                <input
                  type="checkbox"
                  checked={calcinado}
                  onChange={(e) => setCalcinado(e.target.checked)}
                />
                Calcinado
              </label>
            </div>
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
              disabled={!matricula.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-card bg-toro-red py-2.5 text-sm font-semibold text-white transition hover:bg-toro-redDark disabled:opacity-40"
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
