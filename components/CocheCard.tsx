"use client";

import { useState } from "react";
import { Key, KeyRound, Flame, LogOut, MapPin, Pencil, Truck, ClipboardList, Navigation, Lock, CheckCircle2, AlertTriangle, FileText, RotateCcw, Car, Bike, Building2, Copy, Check } from "lucide-react";
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
  onToggleTrasladoPrevisto,
  puedeGestionar,
}: {
  coche: Coche;
  onPedirSalida: (coche: Coche) => void;
  onRevertirSalida: (coche: Coche) => void;
  onEditar: (coche: Coche) => void;
  onConsignas: (coche: Coche) => void;
  onToggleTrasladoPrevisto: (coche: Coche, valor: boolean) => void;
  puedeGestionar: boolean;
}) {
  const [mostrarObs, setMostrarObs] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const activo = !coche.fecha_salida;
  const tieneDeuda = coche.penalizacion > 0;
  const esMoto = coche.tipo_vehiculo === "moto";

  // A punto de vencerse la custodia: aún no vencida (sin días extra) pero a
  // 5 días o menos del día 12 -> aviso amarillo para adelantarse con la consigna.
  const diasParaVencer = calcDiasParaVencer(coche.dias_totales, coche.dias_extra);
  const proximoAVencer = estaProximoAVencer(coche.dias_totales, coche.dias_extra, activo, coche.tiene_destino);

  // En custodia de Mapfre: ya pasaron nuestros 3 días propios. Esto es
  // independiente de si tiene o no fecha de salida prevista — son dos
  // cosas distintas y no hace falta tener una para que se dé la otra.
  const enCustodiaMapfre = activo && coche.dias_totales > 3;

  const hayConsignaOAviso = coche.ultima_consigna || proximoAVencer || enCustodiaMapfre;

  const copiarDatos = async () => {
    const lineas = [
      `Matrícula: ${coche.matricula}`,
      `Modelo: ${coche.modelo || "—"}`,
      `Tipo: ${esMoto ? "Moto" : "Coche"}`,
      `Plaza: ${coche.plaza || "—"}`,
      `Expediente: ${coche.numero_expediente || "—"}`,
      `Base: ${coche.base_numero ? `${coche.base_numero} - ${coche.base_nombre ?? ""}` : coche.base_nombre || "—"}`,
      `Entrada: ${fmtFecha(coche.fecha_entrada)}`,
      `Días totales: ${coche.dias_totales}`,
      `Propios hasta: ${fmtFecha(coche.fecha_fin_propios)}`,
      `Mapfre hasta: ${fmtFecha(coche.fecha_fin_mapfre)}`,
      `En custodia Mapfre: ${enCustodiaMapfre ? "Sí" : "No"}`,
      `Destino previsto: ${coche.tiene_destino ? fmtFecha(coche.fecha_destino) : "—"}`,
      `Traslado previsto: ${coche.traslado_previsto ? "Sí" : "No"}`,
      `Salió: ${!activo ? fmtFechaHora(coche.fecha_salida) : "—"}`,
      `Traslado: ${!activo && coche.traslado ? coche.empresa_traslado || "Sí" : "—"}`,
      `Llave: ${coche.tiene_llave ? "Sí" : "No"}`,
      `Calcinado: ${coche.esta_calcinado ? "Sí" : "No"}`,
      `Bloqueado: ${coche.bloqueado ? "Sí" : "No"}`,
      `Última consigna: ${coche.ultima_consigna ? fmtFecha(coche.ultima_consigna) : "—"}`,
      `Penalización: ${coche.penalizacion}€`,
      `Observaciones: ${coche.observaciones?.trim() || "Sin observaciones."}`,
    ];
    try {
      await navigator.clipboard.writeText(lineas.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Si el navegador bloquea el portapapeles (poco común), no pasa
      // nada grave: simplemente no se marca como copiado.
    }
  };

  // Todas las tarjetas dibujan exactamente los mismos bloques, en el mismo
  // orden, con una altura mínima reservada en cada uno (aunque no tengan
  // nada que mostrar). Así todas quedan del mismo tamaño sin recortar
  // nunca la información de la que sí tiene más datos.
  return (
    <div
      className={`flex h-full flex-col gap-2.5 rounded-card border bg-toro-surface p-3.5 shadow-card ${
        coche.bloqueado ? "border-toro-red/40" : "border-toro-line"
      }`}
    >
      {/* 1. Identificación: su propia fila, sin compartir espacio con botones.
          El botón de copiar es un elemento hermano (no puede ir anidado
          dentro del botón que despliega observaciones). */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setMostrarObs((v) => !v)}
          className="min-w-0 flex-1 text-left"
          title="Ver observaciones"
        >
          <div className="flex flex-wrap items-center gap-2">
            <MatriculaBadge matricula={coche.matricula} />
            <span title={esMoto ? "Moto" : "Coche"} className="text-toro-slate">
              {esMoto ? <Bike size={15} /> : <Car size={15} />}
            </span>
            {coche.modelo && (
              <span className="min-w-0 truncate text-sm font-medium text-toro-ink">{coche.modelo}</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-toro-slate">
            {coche.plaza != null && coche.plaza !== "" && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> Plaza {coche.plaza}
              </span>
            )}
            {coche.numero_expediente && (
              <span className="flex items-center gap-1">
                <FileText size={12} /> Exp. {coche.numero_expediente}
              </span>
            )}
            {coche.base_nombre && (
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                {coche.base_numero ? `${coche.base_numero} · ${coche.base_nombre}` : coche.base_nombre}
              </span>
            )}
            <span>{coche.dias_totales} días{activo ? " en curso" : ""}</span>
          </div>
        </button>

        <button
          onClick={copiarDatos}
          title="Copiar todos los datos de este coche"
          className="shrink-0 rounded-card border border-toro-line p-1.5 text-toro-slate transition hover:text-toro-ink"
        >
          {copiado ? <Check size={14} className="text-toro-ok" /> : <Copy size={14} />}
        </button>
      </div>

      {/* 2. Penalización: altura reservada siempre, con o sin deuda */}
      <div
        className={`flex min-h-[34px] items-center justify-between rounded-card px-3 py-1.5 ${
          tieneDeuda ? "bg-toro-warnBg" : ""
        }`}
      >
        {tieneDeuda && (
          <>
            <span className="text-xs font-medium text-toro-red">
              Custodia vencida · +{coche.dias_extra} día{coche.dias_extra === 1 ? "" : "s"}
            </span>
            <span className="text-sm font-semibold text-toro-red tabular">{coche.penalizacion}€</span>
          </>
        )}
      </div>

      {/* 3. Fila de acciones: aviso de "Fuera" (si ya salió) a la izquierda,
          gestión a la derecha. Altura reservada siempre para que todas las
          tarjetas midan igual, tengan o no algo que mostrar aquí. */}
      <div className="flex min-h-[38px] flex-wrap items-center gap-2 border-t border-toro-line pt-2.5">
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

        {activo && (
          <label
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              coche.traslado_previsto ? "bg-toro-amberBg text-toro-amber" : "text-toro-slate"
            } ${puedeGestionar ? "cursor-pointer" : ""}`}
            title="Se prevé que salga por traslado"
          >
            <input
              type="checkbox"
              checked={coche.traslado_previsto}
              disabled={!puedeGestionar}
              onChange={(e) => onToggleTrasladoPrevisto(coche, e.target.checked)}
              className="accent-toro-red"
            />
            <Truck size={13} />
            Traslado previsto
          </label>
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

      {/* 4. Estado físico del coche: llave / calcinado / bloqueado.
          Siempre muestra al menos si tiene llave o no. */}
      <div className="flex min-h-[24px] flex-wrap gap-1.5">
        {coche.tiene_llave ? (
          <span className="flex items-center gap-1 rounded-full bg-toro-bg px-2 py-0.5 text-[11px] text-toro-slate">
            <Key size={11} /> Tiene llave
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-toro-warnBg px-2 py-0.5 text-[11px] font-medium text-toro-red">
            <KeyRound size={11} /> Sin llave
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

      {/* 5. Detalle de fechas: SIEMPRE las mismas 6 celdas, con "—" cuando
          no aplica. Así la cuadrícula mide igual en todas las tarjetas. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-toro-line pt-2.5 sm:grid-cols-3">
        <Dato etiqueta="Entrada" valor={fmtFecha(coche.fecha_entrada)} />
        <Dato etiqueta="Propios hasta" valor={fmtFecha(coche.fecha_fin_propios)} />
        <Dato etiqueta="Mapfre hasta" valor={fmtFecha(coche.fecha_fin_mapfre)} />
        <Dato
          etiqueta="Destino previsto"
          valor={
            coche.tiene_destino ? (
              <span className="flex items-center gap-1">
                <Navigation size={11} /> {fmtFecha(coche.fecha_destino)}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Dato etiqueta="Salió" valor={!activo ? fmtFechaHora(coche.fecha_salida) : "—"} />
        <Dato
          etiqueta="Traslado"
          valor={
            !activo && coche.traslado ? (
              <span className="flex items-center gap-1">
                <Truck size={11} /> {coche.empresa_traslado || "Sí"}
              </span>
            ) : (
              "—"
            )
          }
        />
      </div>

      {/* 6. Consigna hecha / en custodia Mapfre / próxima a vencer. Altura reservada siempre. */}
      <div className="flex min-h-[24px] flex-wrap gap-1.5">
        {hayConsignaOAviso && (
          <>
            {coche.ultima_consigna && (
              <span className="flex items-center gap-1 rounded-full bg-toro-okBg px-2 py-0.5 text-[11px] font-medium text-toro-ok">
                <CheckCircle2 size={11} /> Consigna hecha · {fmtFecha(coche.ultima_consigna)}
              </span>
            )}
            {enCustodiaMapfre && (
              <span className="flex items-center gap-1 rounded-full bg-toro-bg px-2 py-0.5 text-[11px] font-medium text-toro-slate">
                <Building2 size={11} /> Custodia Mapfre
              </span>
            )}
            {proximoAVencer && (
              <span className="flex items-center gap-1 rounded-full bg-toro-amberBg px-2 py-0.5 text-[11px] font-medium text-toro-amber">
                <AlertTriangle size={11} />
                {diasParaVencer === 0 ? "Vence hoy (día 12)" : `Vence en ${diasParaVencer} día${diasParaVencer === 1 ? "" : "s"}`}
              </span>
            )}
          </>
        )}
      </div>

      {/* 7. Observaciones: se despliega al clicar arriba en la tarjeta. Es
          la única sección que cambia de alto a propósito (es una acción
          explícita de quien lo abre, no depende de cuántos datos tenga el
          coche), así que las demás tarjetas de la fila no se mueven.
          break-words evita que una palabra/URL muy larga se salga del
          recuadro, y el scroll interno (max-h + overflow-y-auto) limita
          cuánto puede crecer la tarjeta aunque el texto sea larguísimo. */}
      {mostrarObs && (
        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-card bg-toro-bg p-2 text-xs leading-relaxed text-toro-slate">
          {coche.observaciones?.trim() ? coche.observaciones : "Sin observaciones."}
        </p>
      )}
    </div>
  );
}
