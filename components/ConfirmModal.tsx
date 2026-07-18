"use client";

import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  peligroso = false,
  cargando = false,
  onConfirmar,
  onCancelar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  mensaje?: string;
  textoConfirmar?: string;
  peligroso?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  children?: React.ReactNode;
}) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-toro-ink/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
        <div className="mb-3 flex items-center gap-2">
          {peligroso && <AlertTriangle size={18} className="text-toro-red" />}
          <h2 className="text-base font-semibold text-toro-ink">{titulo}</h2>
        </div>

        {mensaje && <p className="mb-3 text-sm text-toro-slate">{mensaje}</p>}

        {children}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="flex-1 rounded-card border border-toro-line py-2.5 text-sm font-medium text-toro-slate transition hover:text-toro-ink disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={cargando}
            className={`flex-1 rounded-card py-2.5 text-sm font-semibold text-white transition disabled:opacity-40 ${
              peligroso ? "bg-toro-red hover:bg-toro-redDark" : "bg-toro-ink hover:bg-toro-red"
            }`}
          >
            {cargando ? "Procesando…" : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
