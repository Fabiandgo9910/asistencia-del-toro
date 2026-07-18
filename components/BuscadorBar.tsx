"use client";

import { Search, Download, UserCheck } from "lucide-react";

export default function BuscadorBar({
  valor,
  onChange,
  onExportar,
  soloPresentes,
  onToggleSoloPresentes,
}: {
  valor: string;
  onChange: (v: string) => void;
  onExportar: () => void;
  soloPresentes: boolean;
  onToggleSoloPresentes: () => void;
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
            placeholder="Buscar por matrícula, expediente o modelo…"
            className="w-full rounded-card border border-toro-line bg-toro-surface py-2.5 pl-10 pr-3 text-sm text-toro-ink shadow-card outline-none placeholder:text-toro-slate/70 focus:border-toro-red/40"
          />
        </div>
        <button
          onClick={onToggleSoloPresentes}
          aria-pressed={soloPresentes}
          title="Mostrar solo los coches presentes"
          className={`flex items-center gap-1.5 rounded-card border px-3 py-2.5 text-sm shadow-card transition ${
            soloPresentes
              ? "border-toro-ok/30 bg-toro-okBg text-toro-ok"
              : "border-toro-line bg-toro-surface text-toro-slate hover:text-toro-ink"
          }`}
        >
          <UserCheck size={16} />
          <span className="hidden sm:inline">Presentes</span>
        </button>
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
