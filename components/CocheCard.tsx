"use client";

import { useState } from "react";
import { Key, Flame, LogOut, MapPin, Pencil, Truck, ClipboardList, Navigation, Lock, CheckCircle2, AlertTriangle, FileText, RotateCcw } from "lucide-react";
import MatriculaBadge from "./MatriculaBadge";
import { diasParaVencer as calcDiasParaVencer, estaProximoAVencer } from "@/lib/penalizacion";
import type { Coche } from "@/types/coche";

// Todas las fechas se muestran completas: día, mes y año.
const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const fmtFechaHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// Pequeño par etiqueta/valor para la cuadrícula de detalle. Cada celda es
// independiente (no texto corrido), así nunca se aprietan ni se pisan
// aunque el valor sea largo: cada una ocupa su propia casilla del grid.
function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] uppercase tracking-wide text-toro-slate/70">{etiqueta}</p>
      <p className={`tabular truncate text-[11px] ${destacado ? "font-medium text-toro-red" : "text-toro-ink"}`}>
        {valor}
      </p>
    </div>
  );
}

export default function CocheCard({
  coche,
  onPedirSalida,
  onRevertirSalida,
  onEditar,
  onConsignas,
  puedeGestionar,
}: {
  coche: Coche;
  onPedirSalida: (coche: Coche) => void;
  onRevertirSalida: (coche: Coche) => void;
  onEditar: (coche: Coche) => void;
  onConsignas: (coche: Coche) => void;
  puedeGestionar: boolean;
}) {
  const [mostrarObs, setMostrarObs] = useState(false);
  const activo = !coche.fecha_salida;
  const tieneDeuda = coche.penalizacion > 0;

  // A punto de vencerse la custodia: aún no vencida (sin días extra) pero a
  // 2 días o menos del día 12 -> aviso amarillo para adelantarse con la consigna.
  const diasParaVencer = calcDiasParaVencer(coche.dias_totales, coche.dias_extra);
  const proximoAVencer = estaProximoAVencer(coche.dias_totales, coche.dias_extra, activo);

  // La fila de acciones solo se dibuja si hay algo que mostrar en ella: el
  // aviso de "Fuera" (coches que ya salieron) o los botones de gestión.
  const hayFilaDeAcciones = !activo || puedeGestionar;

  return (
    <div
      className={`flex h-full flex-col gap-2.5 rounded-card border bg-toro-surface p-3.5 shadow-card ${
        coche.bloqueado ? "border-toro-red/40" : "border-toro-line"
      }`}
    >
      {/* 1. Identificación: su propia fila, sin compartir espacio con botones */}
      <button
        onClick={() => setMostrarObs((v) => !v)}
        className="min-w-0 text-left"
        title="Ver observaciones"
      >
        <div className="flex flex-wrap items-center gap-2">
          <MatriculaBadge matricula={coche.matricula} />
          {coche.modelo && (
            <span className="min-w-0 truncate text-sm font-medium text-toro-ink">{coche.modelo}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-toro-slate">
          {coche.plaza != null && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> Plaza {coche.plaza}
            </span>
          )}
          {coche.numero_expediente && (
            <span className="flex items-center gap-1">
              <FileText size={12} /> Exp. {coche.numero_expediente}
            </span>
          )}
          <span>{coche.dias_totales} días{activo ? " en curso" : ""}</span>
        </div>
      </button>

      {/* 2. Penalización: banner propio a todo lo ancho, no compite por espacio */}
      {tieneDeuda && (
        <div className="flex items-center justify-between rounded-card bg-toro-warnBg px-3 py-1.5">
          <span className="text-xs font-medium text-toro-red">
            Custodia vencida · +{coche.dias_extra} día{coche.dias_extra === 1 ? "" : "s"}
          </span>
          <span className="text-sm font-semibold text-toro-red tabular">{coche.penalizacion}€</span>
        </div>
      )}

      {/* 3. Fila de acciones: aviso de "Fuera" (si ya salió) a la izquierda,
          gestión a la derecha. Separada de la identificación para que
          nunca se amontonen. Si no hay nada que mostrar, no se dibuja. */}
      {hayFilaDeAcciones && (
        <div className="flex flex-wrap items-center gap-2 border-t border-toro-line pt-2.5">
          {!activo && (
            <span className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-toro-line px-3 py-1.5 text-xs font-medium text-toro-slate">
                Fuera
              </span>
              {puedeGestionar && (
                <button
                  onClick={() => onRevertirSalida(coche)}
                  title="Deshacer salida (volver a poner en base)"
                  className="flex items-center gap-1 rounded-card border border-toro-line px-2 py-1.5 text-[11px] text-toro-slate transition hover:text-toro-ink"
                >
                  <RotateCcw size={13} /> Deshacer salida
                </button>
              )}
            </span>
          )}

          {puedeGestionar && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => onConsignas(coche)}
                title="Historial de consignas"
                className="shrink-0 rounded-card border border-toro-line p-2 text-toro-slate transition hover:text-toro-ink"
              >
                <ClipboardList size={14} />
              </button>
              <button
                onClick={() => onEditar(coche)}
                title="Editar expediente"
                className="shrink-0 rounded-card border border-toro-line p-2 text-toro-slate transition hover:text-toro-ink"
              >
                <Pencil size={14} />
              </button>
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
          )}
        </div>
      )}

      {/* 4. Estado físico del coche: llave / calcinado / bloqueado */}
      {(coche.tiene_llave || coche.esta_calcinado || coche.bloqueado) && (
        <div className="flex flex-wrap gap-1.5">
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

      {/* 5. Detalle de fechas: cuadrícula fija de 2 columnas. Cada dato vive
          en su propia celda, así nunca se juntan ni se cortan entre sí. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-toro-line pt-2.5 sm:grid-cols-3">
        <Dato etiqueta="Entrada" valor={fmtFecha(coche.fecha_entrada)} />
        <Dato etiqueta="Propios hasta" valor={fmtFecha(coche.fecha_fin_propios)} />
        <Dato etiqueta="Mapfre hasta" valor={fmtFecha(coche.fecha_fin_mapfre)} />
        {coche.tiene_destino && (
          <Dato
            etiqueta="Destino previsto"
            valor={
              <span className="flex items-center gap-1">
                <Navigation size={11} /> {fmtFecha(coche.fecha_destino)}
              </span>
            }
          />
        )}
        {!activo && <Dato etiqueta="Salió" valor={fmtFechaHora(coche.fecha_salida)} />}
        {!activo && coche.traslado && (
          <Dato
            etiqueta="Traslado"
            valor={
              <span className="flex items-center gap-1">
                <Truck size={11} /> {coche.empresa_traslado || "Sí"}
              </span>
            }
          />
        )}
      </div>

      {/* 6. Consigna hecha / próxima a vencer */}
      {(coche.ultima_consigna || proximoAVencer) && (
        <div className="flex flex-wrap gap-1.5">
          {coche.ultima_consigna && (
            <span className="flex items-center gap-1 rounded-full bg-toro-okBg px-2 py-0.5 text-[11px] font-medium text-toro-ok">
              <CheckCircle2 size={11} /> Consigna hecha · {fmtFecha(coche.ultima_consigna)}
            </span>
          )}
          {proximoAVencer && (
            <span className="flex items-center gap-1 rounded-full bg-toro-amberBg px-2 py-0.5 text-[11px] font-medium text-toro-amber">
              <AlertTriangle size={11} />
              {diasParaVencer === 0 ? "Vence hoy (día 12)" : `Vence en ${diasParaVencer} día${diasParaVencer === 1 ? "" : "s"}`}
            </span>
          )}
        </div>
      )}

      {/* 7. Observaciones, al clicar arriba en la tarjeta */}
      {mostrarObs && (
        <p className="rounded-card bg-toro-bg p-2 text-xs text-toro-slate">
          {coche.observaciones?.trim() ? coche.observaciones : "Sin observaciones."}
        </p>
      )}
    </div>
  );
}
