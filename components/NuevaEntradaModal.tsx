"use client";

import { useState } from "react";
import { X, Plus, Car, Bike, Bus } from "lucide-react";
import SelectorBase from "./SelectorBase";
import type { TipoVehiculo } from "@/types/coche";

const hoy = () => new Date().toISOString().slice(0, 10);

export default function NuevaEntradaModal({
  abierto,
  onCerrar,
  onCreado,
  mostrarFechaSalida = true,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreado: () => void;
  mostrarFechaSalida?: boolean;
}) {
  const [matricula, setMatricula] = useState("");
  const [modelo, setModelo] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>("coche");
  const [plaza, setPlaza] = useState("");
  const [expediente, setExpediente] = useState("");
  const [fecha, setFecha] = useState(hoy());
  const [fechaDestino, setFechaDestino] = useState("");
  const [baseId, setBaseId] = useState<number | null>(null);
  const [tieneLlave, setTieneLlave] = useState(true);
  const [calcinado, setCalcinado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  const limpiar = () => {
    setMatricula("");
    setModelo("");
    setTipoVehiculo("coche");
    setPlaza("");
    setExpediente("");
    setFecha(hoy());
    setFechaDestino("");
    setBaseId(null);
    setTieneLlave(true);
    setCalcinado(false);
    setBloqueado(false);
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
          tipo_vehiculo: tipoVehiculo,
          plaza: plaza.trim() || null,
          numero_expediente: expediente,
          fecha_entrada: fecha,
          fecha_destino: fechaDestino || null,
          base_id: baseId,
          tiene_llave: tieneLlave,
          esta_calcinado: calcinado,
          bloqueado,
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
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-toro-ink">Nueva entrada</h2>
          <button onClick={onCerrar} className="text-toro-slate hover:text-toro-ink">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Coche, moto o furgón */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipoVehiculo("coche")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-card border py-2.5 text-sm font-medium transition ${
                tipoVehiculo === "coche"
                  ? "border-toro-red/50 bg-toro-warnBg/40 text-toro-ink"
                  : "border-toro-line text-toro-slate"
              }`}
            >
              <Car size={16} /> Coche
            </button>
            <button
              type="button"
              onClick={() => setTipoVehiculo("moto")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-card border py-2.5 text-sm font-medium transition ${
                tipoVehiculo === "moto"
                  ? "border-toro-red/50 bg-toro-warnBg/40 text-toro-ink"
                  : "border-toro-line text-toro-slate"
              }`}
            >
              <Bike size={16} /> Moto
            </button>
            <button
              type="button"
              onClick={() => setTipoVehiculo("furgon")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-card border py-2.5 text-sm font-medium transition ${
                tipoVehiculo === "furgon"
                  ? "border-toro-red/50 bg-toro-warnBg/40 text-toro-ink"
                  : "border-toro-line text-toro-slate"
              }`}
            >
              <Bus size={16} /> Furgón
            </button>
          </div>

          <input
            autoFocus
            value={matricula}
            onChange={(e) => setMatricula(e.target.value.toUpperCase())}
            placeholder="Matrícula *"
            maxLength={20}
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-toro-red/40"
          />
          <input
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Modelo"
            maxLength={100}
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
          <div className="flex gap-3">
            <input
              value={plaza}
              onChange={(e) => setPlaza(e.target.value)}
              placeholder="Plaza (ej. 12 o P-12)"
              maxLength={20}
              className="w-1/2 rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
            />
            <input
              value={expediente}
              onChange={(e) => setExpediente(e.target.value)}
              placeholder="Nº expediente"
              maxLength={50}
              className="w-1/2 rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
            />
          </div>

          <SelectorBase baseId={baseId} onChange={setBaseId} />

          <label className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-toro-slate">
            Fecha de entrada
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
            />
          </label>
          {mostrarFechaSalida && (
            <label className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-toro-slate">
              Fecha de salida prevista (opcional)
              <input
                type="date"
                value={fechaDestino}
                onChange={(e) => setFechaDestino(e.target.value)}
                className="rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
              <input
                type="checkbox"
                checked={tieneLlave}
                onChange={(e) => setTieneLlave(e.target.checked)}
              />
              Tiene llave
            </label>
            <label className="flex items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
              <input
                type="checkbox"
                checked={calcinado}
                onChange={(e) => setCalcinado(e.target.checked)}
              />
              Calcinado
            </label>
            <label className="col-span-2 flex items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
              <input
                type="checkbox"
                checked={bloqueado}
                onChange={(e) => setBloqueado(e.target.checked)}
              />
              Bloqueado
            </label>
          </div>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Observaciones"
            rows={3}
            maxLength={2000}
            className="w-full resize-y rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
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
