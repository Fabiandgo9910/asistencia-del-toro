"use client";

import { X, FileWarning, Truck, ParkingCircle } from "lucide-react";

export type FiltroExportacion = "vencidos" | "con_salida" | "presentes";

const OPCIONES: {
  valor: FiltroExportacion;
  etiqueta: string;
  descripcion: string;
  icono: typeof FileWarning;
}[] = [
  {
    valor: "vencidos",
    etiqueta: "Vencidos",
    descripcion: "Coches con la custodia ya vencida (pendientes de consigna).",
    icono: FileWarning,
  },
  {
    valor: "con_salida",
    etiqueta: "Con fecha de salida",
    descripcion: "Coches que ya tienen registrada una salida real.",
    icono: Truck,
  },
  {
    valor: "presentes",
    etiqueta: "Todos los presentes",
    descripcion: "Todos los coches que siguen en la base.",
    icono: ParkingCircle,
  },
];

export default function ExportarModal({
  abierto,
  onCerrar,
  onElegir,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onElegir: (filtro: FiltroExportacion) => void;
}) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-toro-ink/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-card bg-toro-surface p-5 shadow-card sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-toro-ink">¿Qué quieres exportar?</h2>
          <button onClick={onCerrar} className="text-toro-slate hover:text-toro-ink">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {OPCIONES.map((o) => {
            const Icono = o.icono;
            return (
              <button
                key={o.valor}
                onClick={() => onElegir(o.valor)}
                className="flex w-full items-start gap-3 rounded-card border border-toro-line p-3 text-left transition hover:border-toro-red/40 hover:bg-toro-bg"
              >
                <Icono size={18} className="mt-0.5 shrink-0 text-toro-slate" />
                <span>
                  <span className="block text-sm font-medium text-toro-ink">{o.etiqueta}</span>
                  <span className="block text-xs text-toro-slate">{o.descripcion}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11px] text-toro-slate">
          Se abrirá como PDF, listo para descargar o imprimir.
        </p>
      </div>
    </div>
  );
}
