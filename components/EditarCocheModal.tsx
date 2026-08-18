"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Save, Car, Bike, Bus } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import SelectorBase from "./SelectorBase";
import type { Coche, TipoVehiculo } from "@/types/coche";

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
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>("coche");
  const [plaza, setPlaza] = useState("");
  const [expediente, setExpediente] = useState("");
  const [fecha, setFecha] = useState("");
  const [baseId, setBaseId] = useState<number | null>(null);
  const [tieneLlave, setTieneLlave] = useState(true);
  const [calcinado, setCalcinado] = useState(false);
  const [bloqueado, setBloqueado] = useState(false);
  const [trasladoPrevisto, setTrasladoPrevisto] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [fechaDestino, setFechaDestino] = useState("");
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
      setTipoVehiculo(coche.tipo_vehiculo);
      setPlaza(coche.plaza ?? "");
      setExpediente(coche.numero_expediente ?? "");
      setFecha(coche.fecha_entrada?.slice(0, 10) ?? "");
      setBaseId(coche.base_id);
      setTieneLlave(coche.tiene_llave);
      setCalcinado(coche.esta_calcinado);
      setBloqueado(coche.bloqueado);
      setTrasladoPrevisto(coche.traslado_previsto);
      setObservaciones(coche.observaciones ?? "");
      setFechaDestino(coche.fecha_destino?.slice(0, 10) ?? "");
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
          tipo_vehiculo: tipoVehiculo,
          plaza: plaza.trim() || null,
          numero_expediente: expediente || null,
          fecha_entrada: fecha,
          base_id: baseId,
          tiene_llave: tieneLlave,
          esta_calcinado: calcinado,
          bloqueado,
          traslado_previsto: trasladoPrevisto,
          observaciones,
          fecha_destino: fechaDestino || null,
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
        <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-toro-ink">Editar expediente</h2>
            <button onClick={onCerrar} className="text-toro-slate hover:text-toro-ink">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
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
            {!coche.fecha_salida && (
              <>
                <label className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-toro-slate">
                  Fecha prevista de salida (destino)
                  <span className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={fechaDestino}
                      onChange={(e) => setFechaDestino(e.target.value)}
                      className="rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
                    />
                    {fechaDestino && (
                      <button
                        type="button"
                        onClick={() => setFechaDestino("")}
                        title="Quitar fecha de salida prevista"
                        className="rounded-card border border-toro-line p-2 text-toro-slate transition hover:text-toro-red"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </span>
                </label>
                {fechaDestino && (
                  <p className="text-[11px] text-toro-slate">
                    Con destino asignado, la custodia se calculará hasta esa fecha, no hasta hoy.
                  </p>
                )}
                <label className="flex items-center gap-2 rounded-card border border-toro-line px-3 py-2 text-sm text-toro-slate">
                  <input
                    type="checkbox"
                    checked={trasladoPrevisto}
                    onChange={(e) => setTrasladoPrevisto(e.target.checked)}
                  />
                  Se prevé que salga por traslado
                </label>
              </>
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
