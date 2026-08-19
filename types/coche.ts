export type TipoVehiculo = "coche" | "moto" | "furgon";

export type Coche = {
  id: number;
  plaza: string | null; // admite letras (ej. "P12")
  fecha_entrada: string; // ISO date
  tiene_llave: boolean;
  esta_calcinado: boolean;
  bloqueado: boolean;
  traslado: string | null;
  traslado_previsto: boolean; // se prevé que saldrá por traslado (marcable manualmente)
  empresa_traslado: string | null;
  fecha_traslado: string | null;
  fecha_destino: string | null; // fecha PREVISTA de salida (aún no ha salido)
  matricula: string;
  modelo: string | null;
  tipo_vehiculo: TipoVehiculo;
  numero_expediente: string | null;
  fecha_salida: string | null; // timestamp ISO, null = activo
  observaciones: string | null;
  base_id: number | null;
  // Control de salidas/regresos temporales (excursión puntual, distinta
  // de la salida definitiva de fecha_salida).
  // Al deshacer una salida se guarda, opcionalmente, cuándo y por qué regresó.
  fecha_regreso: string | null;
  motivo_salida: string | null;
  // Calculado en servidor (SQL):
  base_numero: string | null;
  base_nombre: string | null;
  tiene_destino: boolean; // true si aún no salió pero ya tiene fecha_destino
  ultima_consigna: string | null; // fecha de la consigna más reciente
  dias_totales: number;
  dias_extra: number;
  penalizacion: number;
  fecha_fin_propios: string; // vencen nuestros 3 días
  fecha_fin_mapfre: string; // vence la cobertura de Mapfre (día 12)
};

export type Consigna = {
  id: number;
  coche_id: number;
  fecha: string;
  observacion: string | null;
};

export type Base = {
  id: number;
  numero: string;
  nombre: string;
  direccion: string | null;
  ultima_revision: string | null;
};

export type NuevoCochePayload = {
  plaza?: string | null;
  fecha_entrada?: string;
  matricula: string;
  modelo?: string;
  tipo_vehiculo?: TipoVehiculo;
  numero_expediente?: string;
  tiene_llave?: boolean;
  esta_calcinado?: boolean;
  observaciones?: string;
  base_id?: number | null;
};
