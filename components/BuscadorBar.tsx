"use client";

import { Search, Download } from "lucide-react";

export type FiltroPresencia = "presentes" | "no_presentes" | "vencidos" | "todos";

const OPCIONES: { valor: FiltroPresencia; etiqueta: string }[] = [
  { valor: "presentes", etiqueta: "Presentes" },
  { valor: "no_presentes", etiqueta: "No presentes" },
  { valor: "vencidos", etiqueta: "Vencidos" },
  { valor: "todos", etiqueta: "Todos" },
];

export default function BuscadorBar({
  valor,
  onChange,
  onExportar,
  filtro,
  onCambiarFiltro,
}: {
  valor: string;
  onChange: (v: string) => void;
  onExportar: () => void;
  filtro: FiltroPresencia;
  onCambiarFiltro: (f: FiltroPresencia) => void;
}) {
  return (
    <div className="sticky top-0 z-10 bg-toro-bg/95 backdrop-blur border-b border-toro-line px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-toro-slate"
              size={18}
            />
            <input
              autoFocus
              value={valor}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Buscar por matrícula, expediente o modelo…"
              className="w-full rounded-card border border-toro-line bg-toro-surface py-2.5 pl-10 pr-3 text-sm text-toro-ink shadow-card outline-none placeholder:text-toro-slate/70 focus:border-toro-red/40"
            />
          </div>
          <button
            onClick={onExportar}
            className="flex items-center gap-1.5 rounded-card border border-toro-line bg-toro-surface px-3 py-2.5 text-sm text-toro-slate shadow-card transition hover:text-toro-ink"
            title="Exportar a Excel"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>

        {/* Filtro: presentes / no presentes / con custodia vencida / todos */}
        <div className="flex w-full gap-1 overflow-x-auto rounded-card border border-toro-line bg-toro-surface p-1 shadow-card">
          {OPCIONES.map((o) => (
            <button
              key={o.valor}
              onClick={() => onCambiarFiltro(o.valor)}
              aria-pressed={filtro === o.valor}
              className={`flex-1 whitespace-nowrap rounded-card py-1.5 text-xs font-medium transition ${
                filtro === o.valor
                  ? o.valor === "vencidos"
                    ? "bg-toro-red text-white"
                    : "bg-toro-ink text-white"
                  : "text-toro-slate hover:text-toro-ink"
              }`}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
