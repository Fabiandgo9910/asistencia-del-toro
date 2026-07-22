// Reglas de custodia:
// - Primeros 3 días cubiertos por nosotros.
// - Días 4 a 12 cubiertos por Mapfre (9 días).
// - A partir del día 13, cada día extra cuesta 13€.
export const DIAS_PROPIOS = 3;
export const DIAS_MAPFRE = 9;
export const DIAS_CUBIERTOS = DIAS_PROPIOS + DIAS_MAPFRE; // 12
export const COSTE_DIA_EXTRA = 13;

function sumarDias(fechaISO: string, dias: number): string {
  const f = new Date(fechaISO);
  f.setDate(f.getDate() + dias);
  return f.toISOString().slice(0, 10);
}

/**
 * Calcula los días totales que un coche lleva (o estuvo) en el depósito.
 * Si sigue activo (sin fecha_salida), cuenta hasta hoy.
 */
export function diasTotales(fechaEntrada: string, fechaSalida: string | null): number {
  const entrada = new Date(fechaEntrada);
  const fin = fechaSalida ? new Date(fechaSalida) : new Date();
  const ms = fin.getTime() - entrada.getTime();
  const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(dias, 0);
}

/**
 * Desglose completo de custodia para mostrar al operario:
 * - cuándo se agotaron nuestros 3 días propios
 * - cuándo se agotó la cobertura de Mapfre (día 12, a partir del cual se penaliza)
 * - días extra y penalización en euros
 */
export function calcularPenalizacion(fechaEntrada: string, fechaSalida: string | null) {
  const totales = diasTotales(fechaEntrada, fechaSalida);
  const extra = Math.max(totales - DIAS_CUBIERTOS, 0);
  const penalizacion = extra * COSTE_DIA_EXTRA;

  return {
    dias_totales: totales,
    dias_extra: extra,
    penalizacion,
    fecha_fin_propios: sumarDias(fechaEntrada, DIAS_PROPIOS), // vencen nuestros 3 días
    fecha_fin_mapfre: sumarDias(fechaEntrada, DIAS_CUBIERTOS), // vence la cobertura de Mapfre (día 12)
  };
}

// Días que faltan para llegar al día 12 (cuando aún no está vencido).
// Devuelve null si ya está vencido (no tiene sentido "faltar" días).
export function diasParaVencer(diasTotales: number, diasExtra: number): number | null {
  return diasExtra === 0 ? DIAS_CUBIERTOS - diasTotales : null;
}

// "Próximo a vencer": todavía no genera penalización, pero está a 2 días
// o menos del día 12. Se usa igual en la tarjeta y en el filtro "Vencidos"
// (que también quiere ver los que están a punto).
export function estaProximoAVencer(diasTotales: number, diasExtra: number, activo: boolean): boolean {
  if (!activo) return false;
  const faltan = diasParaVencer(diasTotales, diasExtra);
  return faltan !== null && faltan <= 2 && faltan >= 0;
}
