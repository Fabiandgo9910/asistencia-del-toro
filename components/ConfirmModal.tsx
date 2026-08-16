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
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col rounded-t-card bg-toro-surface shadow-card sm:rounded-card">
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-3 flex items-center gap-2">
            {peligroso && <AlertTriangle size={18} className="shrink-0 text-toro-red" />}
            <h2 className="text-base font-semibold text-toro-ink">{titulo}</h2>
          </div>

          {mensaje && <p className="mb-3 text-sm text-toro-slate">{mensaje}</p>}

          {children}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-toro-line p-5 pt-3.5">
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
