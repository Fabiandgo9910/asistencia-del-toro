export type Coche = {
  id: number;
  plaza: number | null;
  fecha_entrada: string; // ISO date
  tiene_llave: boolean;
  esta_calcinado: boolean;
  traslado: string | null;
  empresa_traslado: string | null;
  fecha_traslado: string | null;
  consigna: string | null; // fecha de la última consigna
  matricula: string;
  modelo: string | null;
  numero_expediente: string | null;
  fecha_salida: string | null; // timestamp ISO, null = activo
  observaciones: string | null;
  ultima_revision: string | null;
  check_presencia: boolean;
  // Calculado en servidor (SQL) y recalculable en cliente:
  dias_totales: number;
  dias_extra: number;
  penalizacion: number;
  fecha_fin_propios: string; // vencen nuestros 3 días
  fecha_fin_mapfre: string; // vence la cobertura de Mapfre (día 12)
};

export type NuevoCochePayload = {
  plaza?: number | null;
  fecha_entrada?: string;
  matricula: string;
  modelo?: string;
  numero_expediente?: string;
  tiene_llave?: boolean;
  esta_calcinado?: boolean;
  observaciones?: string;
};
