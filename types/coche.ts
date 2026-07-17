export type Coche = {
  id: number;
  plaza: number | null;
  fecha_entrada: string; // ISO date
  tiene_llave: boolean;
  esta_calcinado: boolean;
  traslado: string | null;
  empresa_traslado: string | null;
  fecha_traslado: string | null;
  consigna: string | null;
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
