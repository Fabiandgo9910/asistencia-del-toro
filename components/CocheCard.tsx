"use client";

import { Key, Flame, LogOut, MapPin } from "lucide-react";
import MatriculaBadge from "./MatriculaBadge";
import type { Coche } from "@/types/coche";

export default function CocheCard({
  coche,
  onTogglePresencia,
  onDarSalida,
}: {
  coche: Coche;
  onTogglePresencia: (id: number, valor: boolean) => void;
  onDarSalida: (id: number) => void;
}) {
  const activo = !coche.fecha_salida;
  const tieneDeuda = coche.penalizacion > 0;

  return (
    <div className="flex items-center gap-3 rounded-card border border-toro-line bg-toro-surface p-3 shadow-card sm:gap-4 sm:p-4">
      {/* Identificación */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <MatriculaBadge matricula={coche.matricula} />
          {coche.modelo && (
            <span className="truncate text-sm text-toro-slate">{coche.modelo}</span>
          )}
          {coche.plaza != null && (
            <span className="flex items-center gap-1 text-xs text-toro-slate">
              <MapPin size={12} /> Plaza {coche.plaza}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-toro-slate">
          {coche.numero_expediente && <span>Exp. {coche.numero_expediente}</span>}
          <span>· {coche.dias_totales} días{activo ? " (en curso)" : ""}</span>
          {coche.tiene_llave && (
            <span className="flex items-center gap-0.5" title="Tiene llave">
              <Key size={12} />
            </span>
          )}
          {coche.esta_calcinado && (
            <span className="flex items-center gap-0.5 text-toro-red" title="Calcinado">
              <Flame size={12} />
            </span>
          )}
        </div>
      </div>

      {/* Penalización */}
      {tieneDeuda && (
        <div className="rounded-card bg-toro-warnBg px-2.5 py-1 text-center">
          <p className="text-sm font-semibold text-toro-red tabular">
            {coche.penalizacion}€
          </p>
          <p className="text-[10px] text-toro-red/80">+{coche.dias_extra} días</p>
        </div>
      )}

      {/* Check de presencia diaria - 1 clic */}
      <button
        onClick={() => onTogglePresencia(coche.id, !coche.check_presencia)}
        aria-pressed={coche.check_presencia}
        title="Marcar presencia en auditoría diaria"
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
          coche.check_presencia
            ? "bg-toro-okBg text-toro-ok"
            : "bg-toro-warnBg text-toro-red"
        }`}
      >
        {coche.check_presencia ? "Presente" : "No está"}
      </button>

      {/* Dar salida - 1 clic */}
      {activo && (
        <button
          onClick={() => onDarSalida(coche.id)}
          title="Dar salida ahora"
          className="flex shrink-0 items-center gap-1 rounded-card bg-toro-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-toro-red"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Salida</span>
        </button>
      )}
    </div>
  );
}
