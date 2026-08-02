import { createClient } from "@/lib/supabase/server";
import type { Coche, Consigna, Base, TipoVehiculo } from "@/types/coche";

// Todas las funciones de este archivo usan el cliente Supabase "de
// servidor" (lib/supabase/server.ts), que lleva la sesión de quien hace
// la petición — así que además de estas comprobaciones en la propia ruta,
// la base de datos aplica sus propias políticas de Row Level Security
// (ver supabase/migracion.sql) como segunda barrera.

function db() {
  return createClient();
}

function lanzar(contexto: string, error: { message: string } | null): never {
  throw new Error(`${contexto}: ${error?.message ?? "error desconocido"}`);
}

// --- Coches (con los cálculos de custodia ya resueltos por la vista) ---
// Orden: el más reciente primero (por fecha de entrada).

export async function buscarCoches(query: string): Promise<Coche[]> {
  const q = query.trim();
  let consulta = db().from("coches_calculado").select("*");
  if (q !== "") {
    const like = `%${q}%`;
    consulta = consulta.or(
      `matricula.ilike.${like},numero_expediente.ilike.${like},modelo.ilike.${like}`
    );
  }
  const { data, error } = await consulta
    .order("fecha_entrada", { ascending: false })
    .order("id", { ascending: false });
  if (error) lanzar("Error al buscar coches", error);
  return (data ?? []) as Coche[];
}

export async function obtenerCoche(id: number): Promise<Coche | null> {
  const { data, error } = await db().from("coches_calculado").select("*").eq("id", id).maybeSingle();
  if (error) lanzar("Error al obtener el coche", error);
  return (data as Coche) ?? null;
}

export async function crearCoche(data: {
  plaza: string | null;
  fecha_entrada: string;
  matricula: string;
  modelo: string | null;
  tipo_vehiculo: TipoVehiculo;
  numero_expediente: string | null;
  tiene_llave: boolean;
  esta_calcinado: boolean;
  bloqueado: boolean;
  fecha_destino: string | null;
  observaciones: string | null;
  base_id: number | null;
}): Promise<number> {
  const { data: fila, error } = await db()
    .from("coches")
    .insert({
      plaza: data.plaza,
      fecha_entrada: data.fecha_entrada,
      matricula: data.matricula.toUpperCase(),
      modelo: data.modelo,
      tipo_vehiculo: data.tipo_vehiculo,
      numero_expediente: data.numero_expediente,
      tiene_llave: data.tiene_llave,
      esta_calcinado: data.esta_calcinado,
      bloqueado: data.bloqueado,
      fecha_destino: data.fecha_destino,
      observaciones: data.observaciones,
      base_id: data.base_id,
    })
    .select("id")
    .single();
  if (error) lanzar("Error al crear el registro", error);
  return fila!.id as number;
}

// Dar salida ahora admite indicar si fue por traslado y, si aplica, la
// empresa que se lo llevó. El filtro .is("fecha_salida", null) evita dar
// salida dos veces al mismo coche.
export async function darSalida(
  id: number,
  opciones: { esTraslado: boolean; empresaTraslado?: string | null }
) {
  const ahora = new Date().toISOString();
  const { error } = await db()
    .from("coches")
    .update({
      fecha_salida: ahora,
      traslado: opciones.esTraslado ? "Sí" : null,
      empresa_traslado: opciones.esTraslado ? opciones.empresaTraslado ?? null : null,
      fecha_traslado: opciones.esTraslado ? ahora : undefined,
    })
    .eq("id", id)
    .is("fecha_salida", null);
  if (error) lanzar("Error al dar salida", error);
}

// Deshace una salida dada por error: el coche vuelve a quedar activo en
// la base, como si nunca hubiera salido. El filtro .not(...) evita
// "revertir" un coche que en realidad sigue activo.
export async function revertirSalida(id: number) {
  const { error } = await db()
    .from("coches")
    .update({
      fecha_salida: null,
      traslado: null,
      empresa_traslado: null,
      fecha_traslado: null,
    })
    .eq("id", id)
    .not("fecha_salida", "is", null);
  if (error) lanzar("Error al deshacer la salida", error);
}

export async function actualizarCoche(id: number, campos: Record<string, unknown>) {
  if (Object.keys(campos).length === 0) return;
  const { error } = await db().from("coches").update(campos).eq("id", id);
  if (error) lanzar("Error al actualizar el registro", error);
}

export async function eliminarCoche(id: number) {
  const { error } = await db().from("coches").delete().eq("id", id);
  if (error) lanzar("Error al eliminar el registro", error);
}

// --- Exportación ---
// El operario elige uno de estos filtros a la hora de exportar:
//   - vencidos:   coches ACTIVOS con custodia ya vencida O a punto de vencer
//                 (uno que ya salió no cuenta como "vencido", aunque en su
//                 momento se pasara de días: ya no está en la base).
//   - con_salida: coches con fecha PREVISTA de salida pero aún no han salido.
//   - en_base:    coches que todavía siguen en la base (no han salido).
export type FiltroExportacion = "vencidos" | "con_salida" | "en_base";

export async function exportarPorFiltro(
  filtro: FiltroExportacion,
  query?: string
): Promise<Coche[]> {
  const q = (query ?? "").trim();
  let consulta = db().from("coches_calculado").select("*");

  if (filtro === "vencidos") {
    consulta = consulta.is("fecha_salida", null).or("penalizacion.gt.0,proximo_a_vencer.eq.true");
  } else if (filtro === "con_salida") {
    consulta = consulta.eq("tiene_destino", true);
  } else {
    consulta = consulta.is("fecha_salida", null); // en_base
  }

  if (q !== "") {
    const like = `%${q}%`;
    consulta = consulta.or(
      `matricula.ilike.${like},numero_expediente.ilike.${like},modelo.ilike.${like}`
    );
  }

  const { data, error } = await consulta
    .order("fecha_entrada", { ascending: false })
    .order("id", { ascending: false });
  if (error) lanzar("Error al exportar", error);
  return (data ?? []) as Coche[];
}

// --- Consignas: varias por coche, cada una con su fecha y observación ---

export async function obtenerConsignas(cocheId: number): Promise<Consigna[]> {
  const { data, error } = await db()
    .from("consignas")
    .select("id, coche_id, fecha, observacion")
    .eq("coche_id", cocheId)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false });
  if (error) lanzar("Error al listar consignas", error);
  return (data ?? []) as Consigna[];
}

export async function crearConsigna(
  cocheId: number,
  fecha: string,
  observacion: string | null
): Promise<number> {
  const { data, error } = await db()
    .from("consignas")
    .insert({ coche_id: cocheId, fecha, observacion })
    .select("id")
    .single();
  if (error) lanzar("Error al guardar la consigna", error);
  return data!.id as number;
}

export async function actualizarConsigna(
  id: number,
  campos: { fecha?: string; observacion?: string | null }
) {
  const { error } = await db().from("consignas").update(campos).eq("id", id);
  if (error) lanzar("Error al actualizar la consigna", error);
}

export async function eliminarConsigna(id: number) {
  const { error } = await db().from("consignas").delete().eq("id", id);
  if (error) lanzar("Error al eliminar la consigna", error);
}

// --- Bases (ubicaciones) ---

export async function listarBases(): Promise<Base[]> {
  const { data, error } = await db()
    .from("bases")
    .select("id, numero, nombre, direccion")
    .order("numero", { ascending: true });
  if (error) lanzar("Error al listar bases", error);
  return (data ?? []) as Base[];
}

export async function crearBase(data: {
  numero: string;
  nombre: string;
  direccion: string | null;
}): Promise<Base> {
  const { data: fila, error } = await db()
    .from("bases")
    .insert({ numero: data.numero, nombre: data.nombre, direccion: data.direccion })
    .select("id, numero, nombre, direccion")
    .single();
  if (error) lanzar("Error al crear la base", error);
  return fila as Base;
}
