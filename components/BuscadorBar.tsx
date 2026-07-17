"use client";

import { Search, Download } from "lucide-react";

export default function BuscadorBar({
  valor,
  onChange,
  onExportar,
}: {
  valor: string;
  onChange: (v: string) => void;
  onExportar: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 bg-toro-bg/95 backdrop-blur border-b border-toro-line px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-toro-slate"
            size={18}
          />
          <input
            autoFocus
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Buscar por matrícula o nº de expediente…"
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
    </div>
  );
}
