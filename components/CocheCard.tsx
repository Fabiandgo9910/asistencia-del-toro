"use client";

import { useState } from "react";
import { Key, Flame, LogOut, MapPin, Pencil, Truck, ClipboardList, Navigation, Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import MatriculaBadge from "./MatriculaBadge";
import type { Coche } from "@/types/coche";

const fmtCorta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) : "—";

const fmtCompleta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtLarga = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function CocheCard({
  coche,
  onTogglePresencia,
  onPedirSalida,
  onEditar,
  onConsignas,
}: {
  coche: Coche;
  onTogglePresencia: (id: number, valor: boolean) => void;
  onPedirSalida: (coche: Coche) => void;
  onEditar: (coche: Coche) => void;
  onConsignas: (coche: Coche) => void;
}) {
  const [mostrarObs, setMostrarObs] = useState(false);
  const activo = !coche.fecha_salida;
  const tieneDeuda = coche.penalizacion > 0;

  // La revisión de presencia se hace una vez por semana (los domingos).
  // Si han pasado más de 7 días desde la última, se resalta como pendiente.
  const revisionPendiente =
    activo &&
    (!coche.ultima_revision ||
      Date.now() - new Date(coche.ultima_revision).getTime() > 7 * 24 * 60 * 60 * 1000);

  // A punto de vencerse la custodia: aún no vencida (sin días extra) pero a
  // 2 días o menos del día 12 -> aviso para adelantarse con la consigna.
  const diasParaVencer = coche.dias_extra === 0 ? 12 - coche.dias_totales : null;
  const proximoAVencer = activo && diasParaVencer !== null && diasParaVencer <= 2 && diasParaVencer >= 0;

  return (
    <div className={`rounded-card border bg-toro-surface p-3 shadow-card sm:p-4 ${coche.bloqueado ? "border-toro-red/40" : "border-toro-line"}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Identificación - clic arriba muestra/oculta observaciones */}
        <button
          onClick={() => setMostrarObs((v) => !v)}
          className="min-w-0 flex-1 text-left"
          title="Ver observaciones"
        >
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
          </div>
        </button>

        {/* Penalización */}
        {tieneDeuda && (
          <div className="rounded-card bg-toro-warnBg px-2.5 py-1 text-center">
            <p className="text-sm font-semibold text-toro-red tabular">
              {coche.penalizacion}€
            </p>
            <p className="text-[10px] text-toro-red/80">+{coche.dias_extra} días</p>
          </div>
        )}

        {/* Check de presencia diaria - 1 clic. Un coche que ya salió no puede estar "presente". */}
        {activo ? (
          <button
            onClick={() => onTogglePresencia(coche.id, !coche.check_presencia)}
            aria-pressed={coche.check_presencia}
            title="Marcar presencia en la revisión semanal (domingos)"
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              coche.check_presencia
                ? "bg-toro-okBg text-toro-ok"
                : "bg-toro-warnBg text-toro-red"
            }`}
          >
            {coche.check_presencia ? "Presente" : "No está"}
          </button>
        ) : (
          <span className="shrink-0 rounded-full bg-toro-line px-3 py-1.5 text-xs font-medium text-toro-slate">
            Fuera
          </span>
        )}

        {/* Consignas */}
        <button
          onClick={() => onConsignas(coche)}
          title="Historial de consignas"
          className="shrink-0 rounded-card border border-toro-line p-2 text-toro-slate transition hover:text-toro-ink"
        >
          <ClipboardList size={14} />
        </button>

        {/* Editar */}
        <button
          onClick={() => onEditar(coche)}
          title="Editar expediente"
          className="shrink-0 rounded-card border border-toro-line p-2 text-toro-slate transition hover:text-toro-ink"
        >
          <Pencil size={14} />
        </button>

        {/* Dar salida - pide confirmación */}
        {activo && (
          <button
            onClick={() => onPedirSalida(coche)}
            title="Dar salida"
            className="flex shrink-0 items-center gap-1 rounded-card bg-toro-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-toro-red"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Salida</span>
          </button>
        )}
      </div>

      {/* Estado físico del coche: llave / calcinado / bloqueado, con etiqueta visible */}
      {(coche.tiene_llave || coche.esta_calcinado || coche.bloqueado) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coche.tiene_llave && (
            <span className="flex items-center gap-1 rounded-full bg-toro-bg px-2 py-0.5 text-[11px] text-toro-slate">
              <Key size={11} /> Tiene llave
            </span>
          )}
          {coche.esta_calcinado && (
            <span className="flex items-center gap-1 rounded-full bg-toro-warnBg px-2 py-0.5 text-[11px] text-toro-red">
              <Flame size={11} /> Está calcinado
            </span>
          )}
          {coche.bloqueado && (
            <span className="flex items-center gap-1 rounded-full bg-toro-warnBg px-2 py-0.5 text-[11px] font-medium text-toro-red">
              <Lock size={11} /> Bloqueado
            </span>
          )}
        </div>
      )}

      {/* Toda la info detallada, siempre visible a primera vista */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-toro-line pt-2 text-[11px] text-toro-slate">
        <span>Entrada <span className="tabular text-toro-ink">{fmtCompleta(coche.fecha_entrada)}</span></span>
        <span>Propios hasta <span className="tabular text-toro-ink">{fmtCorta(coche.fecha_fin_propios)}</span></span>
        <span>Mapfre hasta <span className="tabular text-toro-ink">{fmtCorta(coche.fecha_fin_mapfre)}</span></span>
        <span>
          Revisado{" "}
          <span className={`tabular ${revisionPendiente ? "font-medium text-toro-red" : "text-toro-ink"}`}>
            {fmtCorta(coche.ultima_revision)}
          </span>
          {revisionPendiente && " · pendiente esta semana"}
        </span>
        {coche.tiene_destino && (
          <span className="flex items-center gap-1 font-medium text-toro-ink">
            <Navigation size={12} /> Destino <span className="tabular">{fmtCorta(coche.fecha_destino)}</span>
          </span>
        )}
        {!activo && (
          <span className="flex items-center gap-1 text-toro-ok">
            Salió <span className="tabular">{fmtLarga(coche.fecha_salida)}</span>
          </span>
        )}
        {!activo && coche.traslado && (
          <span className="flex items-center gap-1 text-toro-ok">
            <Truck size={12} /> Traslado{coche.empresa_traslado ? ` · ${coche.empresa_traslado}` : ""}
          </span>
        )}
      </div>

      {/* Consigna hecha / próxima a vencer, bien visibles */}
      {(coche.ultima_consigna || proximoAVencer) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coche.ultima_consigna && (
            <span className="flex items-center gap-1 rounded-full bg-toro-okBg px-2 py-0.5 text-[11px] font-medium text-toro-ok">
              <CheckCircle2 size={11} /> Consigna hecha · {fmtCorta(coche.ultima_consigna)}
            </span>
          )}
          {proximoAVencer && (
            <span className="flex items-center gap-1 rounded-full bg-toro-warnBg px-2 py-0.5 text-[11px] font-medium text-toro-red">
              <AlertTriangle size={11} />
              {diasParaVencer === 0 ? "Vence hoy (día 12)" : `Vence en ${diasParaVencer} día${diasParaVencer === 1 ? "" : "s"}`}
            </span>
          )}
        </div>
      )}

      {/* Observaciones, al clicar arriba en la tarjeta */}
      {mostrarObs && (
        <p className="mt-2 rounded-card bg-toro-bg p-2 text-xs text-toro-slate">
          {coche.observaciones?.trim() ? coche.observaciones : "Sin observaciones."}
        </p>
      )}
    </div>
  );
}
