"use client";

import { useState } from "react";
import ConfirmModal from "./ConfirmModal";
import type { Coche } from "@/types/coche";

export default function SalidaModal({
  coche,
  onCerrar,
  onConfirmado,
}: {
  coche: Coche | null;
  onCerrar: () => void;
  onConfirmado: () => void;
}) {
  const [esTraslado, setEsTraslado] = useState(false);
  const [empresa, setEmpresa] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!coche) return null;

  const cerrar = () => {
    setEsTraslado(false);
    setEmpresa("");
    setError(null);
    onCerrar();
  };

  const confirmar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/coches/${coche.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "dar_salida",
          traslado: esTraslado,
          empresa_traslado: esTraslado ? empresa : null,
        }),
      });
      if (res.ok) {
        onConfirmado();
        cerrar();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.detalle || data?.error || "No se pudo registrar la salida.");
      }
    } catch {
      setError("No hay conexión con el servidor. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ConfirmModal
      abierto={!!coche}
      titulo={`Confirmar salida de ${coche.matricula}`}
      mensaje="Se guardará la fecha y hora actuales como fecha de salida."
      textoConfirmar="Confirmar salida"
      cargando={guardando}
      onConfirmar={confirmar}
      onCancelar={cerrar}
    >
      <label className="flex items-center gap-2 rounded-card border border-toro-line px-3 py-2.5 text-sm text-toro-slate">
        <input
          type="checkbox"
          checked={esTraslado}
          onChange={(e) => setEsTraslado(e.target.checked)}
        />
        Sale por traslado
      </label>

      {esTraslado && (
        <input
          autoFocus
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Empresa que se lo lleva"
          className="mt-2 w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
        />
      )}

      {error && (
        <p className="mt-3 rounded-card bg-toro-warnBg px-3 py-2 text-xs text-toro-red">
          {error}
        </p>
      )}
    </ConfirmModal>
  );
}
