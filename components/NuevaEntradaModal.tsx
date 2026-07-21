"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

const hoy = () => new Date().toISOString().slice(0, 10);

export default function NuevaEntradaModal({
  abierto,
  onCerrar,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => void;
}) {
  const [matricula, setMatricula] = useState("");
  const [modelo, setModelo] = useState("");
  const [plaza, setPlaza] = useState("");
  const [expediente, setExpediente] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [tieneLlave, setTieneLlave] = useState(true);
  const [calcinado, setCalcinado] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  const limpiar = () => {
    setMatricula("");
    setModelo("");
    setPlaza("");
    setExpediente("");
    setFecha(hoy());
    setTieneLlave(true);
    setCalcinado(false);
    setObservaciones("");
  };

  const guardar = async () => {
    if (!matricula.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/coches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricula,
          modelo,
          plaza: plaza ? Number(plaza) : null,
          numero_expediente: expediente,
          fecha_entrada: fecha,
          tiene_llave: tieneLlave,
          esta_calcinado: calcinado,
          observaciones,
        }),
      });
      if (res.ok) {
        limpiar();
        onCreado();
        onCerrar();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detalle || data?.error || "No se pudo guardar. Inténtalo de nuevo.");
      }
    } catch {
      setError("No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-toro-ink/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-toro-ink">Nueva entrada</h2>
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
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones"
            rows={2}
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-card bg-toro-warnBg px-3 py-2 text-xs text-toro-red">
            {error}
          </p>
        )}

        <button
          onClick={guardar}
          disabled={!matricula.trim() || guardando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-toro-red py-3 text-sm font-semibold text-white transition hover:bg-toro-redDark disabled:opacity-40"
        >
          <Plus size={16} />
          {guardando ? "Guardando…" : "Registrar entrada"}
        </button>
      </div>
    </div>
  );
}
