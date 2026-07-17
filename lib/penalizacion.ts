// Reglas de custodia:
// - Primeros 12 días cubiertos (3 propios + 9 Mapfre) -> sin coste.
// - A partir del día 13, cada día extra cuesta 13€.
export const DIAS_CUBIERTOS = 12;
export const COSTE_DIA_EXTRA = 13;

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

export function calcularPenalizacion(fechaEntrada: string, fechaSalida: string | null) {
  const totales = diasTotales(fechaEntrada, fechaSalida);
  const extra = Math.max(totales - DIAS_CUBIERTOS, 0);
  const penalizacion = extra * COSTE_DIA_EXTRA;
  return { dias_totales: totales, dias_extra: extra, penalizacion };
}
