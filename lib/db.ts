import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Coche, Consigna } from "@/types/coche";

// La integración de Neon en Vercel inyecta varias variables equivalentes
// (POSTGRES_URL, DATABASE_URL, ...). Aceptamos cualquiera de las dos para
// no depender de qué modalidad de integración se instaló.
//
// IMPORTANTE: no se crea la conexión al importar el módulo, porque Next.js
// ejecuta este archivo también durante `next build` (fase "Collecting page
// data") para analizar las rutas, momento en el que las variables de
// entorno de runtime todavía pueden no estar disponibles. Por eso se crea
// de forma perezosa, solo cuando llega la primera petición real.
let sqlClient: NeonQueryFunction<false, false> | null = null;

function sql(query: string, params?: unknown[]) {
  if (!sqlClient) {
    const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "Falta la variable de entorno POSTGRES_URL o DATABASE_URL. " +
          "Comprueba en Vercel: Settings → Environment Variables, y que la base " +
          "esté enlazada al proyecto en Storage → tu base → Projects."
      );
    }
    sqlClient = neon(connectionString);
  }
  return sqlClient(query, params);
}

// SQL que calcula el desglose completo de custodia directamente en la base.
//
// Fecha usada como "fin" del cómputo de días (por orden de prioridad):
//   1. fecha_salida    -> si el coche YA salió de verdad.
//   2. fecha_destino   -> si todavía no ha salido pero ya tiene una fecha
//                         PREVISTA de salida asignada ("tiene destino").
//   3. NOW()           -> si sigue activo sin fecha prevista.
//
// - fecha_fin_propios: día en que se agotan nuestros 3 días propios.
// - fecha_fin_mapfre: día en que se agota la cobertura de Mapfre (día 12).
// - tiene_destino: true si aún no ha salido pero ya hay fecha prevista.
// - ultima_consigna: fecha de la consigna más reciente (tabla consignas).
//
// NOTA: este fragmento se usa tal cual para una sola fila (obtenerCoche) y
// también envuelto en un WITH ... para poder filtrar por columnas
// calculadas (dias_extra, penalizacion, etc.) en listarCoches/exportar.
const SELECT_CON_CALCULO = `
  SELECT
    c.id, c.plaza, c.fecha_entrada, c.tiene_llave, c.esta_calcinado, c.bloqueado, c.traslado,
    c.empresa_traslado, c.fecha_traslado, c.fecha_destino, c.matricula, c.modelo,
    c.numero_expediente, c.fecha_salida, c.observaciones, c.ultima_revision, c.check_presencia,
    (c.fecha_salida IS NULL AND c.fecha_destino IS NOT NULL) AS tiene_destino,
    (SELECT MAX(fecha) FROM consignas WHERE consignas.coche_id = c.id) AS ultima_consigna,
    GREATEST(
      DATE_PART(
        'day',
        COALESCE(c.fecha_salida, c.fecha_destino::timestamp, NOW()) - c.fecha_entrada::timestamp
      )::int,
      0
    ) AS dias_totales,
    GREATEST(
      GREATEST(
        DATE_PART(
          'day',
          COALESCE(c.fecha_salida, c.fecha_destino::timestamp, NOW()) - c.fecha_entrada::timestamp
        )::int,
        0
      ) - 12,
      0
    ) AS dias_extra,
    GREATEST(
      GREATEST(
        DATE_PART(
          'day',
          COALESCE(c.fecha_salida, c.fecha_destino::timestamp, NOW()) - c.fecha_entrada::timestamp
        )::int,
        0
      ) - 12,
      0
    ) * 13 AS penalizacion,
    (c.fecha_entrada + INTERVAL '3 days')::date AS fecha_fin_propios,
    (c.fecha_entrada + INTERVAL '12 days')::date AS fecha_fin_mapfre
  FROM coches c
`;

// Helper: lista de coches con el cálculo aplicado, pudiendo filtrar por
// columnas calculadas (dias_extra, penalizacion, fecha_salida...) gracias
// al WITH. Siempre ordenado por fecha de entrada, del más antiguo primero.
async function listarConCalculo(
  condicion: string,
  params: unknown[]
): Promise<Coche[]> {
  const rows = await sql(
    `WITH base AS (${SELECT_CON_CALCULO})
     SELECT * FROM base
     WHERE ${condicion}
     ORDER BY fecha_entrada ASC`,
    params
  );
  return rows as Coche[];
}

export async function buscarCoches(query: string): Promise<Coche[]> {
  const q = query.trim();
  const like = `%${q.toUpperCase()}%`;
  return listarConCalculo(
    `($1 = '' OR matricula ILIKE $1 OR numero_expediente ILIKE $1 OR modelo ILIKE $1)`,
    [q === "" ? "" : like]
  );
}

export async function obtenerCoche(id: number): Promise<Coche | null> {
  const rows = await sql(`${SELECT_CON_CALCULO} WHERE c.id = $1`, [id]);
  return (rows[0] as Coche) ?? null;
}

export async function crearCoche(data: {
  plaza: number | null;
  fecha_entrada: string;
  matricula: string;
  modelo: string | null;
  numero_expediente: string | null;
  tiene_llave: boolean;
  esta_calcinado: boolean;
  bloqueado: boolean;
  fecha_destino: string | null;
  observaciones: string | null;
}) {
  const rows = await sql(
    `INSERT INTO coches
      (plaza, fecha_entrada, matricula, modelo, numero_expediente, tiene_llave, esta_calcinado, bloqueado, fecha_destino, observaciones, check_presencia, ultima_revision)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())
     RETURNING id`,
    [
      data.plaza,
      data.fecha_entrada,
      data.matricula.toUpperCase(),
      data.modelo,
      data.numero_expediente,
      data.tiene_llave,
      data.esta_calcinado,
      data.bloqueado,
      data.fecha_destino,
      data.observaciones,
    ]
  );
  return rows[0].id as number;
}

// Dar salida ahora admite indicar si fue por traslado y, si aplica,
// la empresa que se lo llevó. fecha_traslado se guarda como la misma
// fecha/hora de la salida. Un coche que ya salió deja de contar como
// "presente" en las auditorías.
//
// Nota técnica: cuando $2/$3 llegan como null (salida sin traslado), el
// driver HTTP de Neon no siempre puede inferir su tipo de columna a partir
// del contexto de la consulta, y Postgres responde con el error
// "could not determine data type of parameter". Se soluciona forzando el
// tipo con un cast explícito ($2::varchar).
export async function darSalida(
  id: number,
  opciones: { esTraslado: boolean; empresaTraslado?: string | null }
) {
  await sql(
    `UPDATE coches
     SET fecha_salida = NOW(),
         check_presencia = false,
         traslado = $2::varchar,
         empresa_traslado = $3::varchar,
         fecha_traslado = CASE WHEN $2::varchar IS NOT NULL THEN NOW() ELSE fecha_traslado END
     WHERE id = $1 AND fecha_salida IS NULL`,
    [
      id,
      opciones.esTraslado ? "Sí" : null,
      opciones.esTraslado ? opciones.empresaTraslado ?? null : null,
    ]
  );
}

export async function actualizarPresencia(id: number, presente: boolean) {
  await sql(
    `UPDATE coches SET check_presencia = $2, ultima_revision = NOW() WHERE id = $1`,
    [id, presente]
  );
}

export async function actualizarCoche(id: number, campos: Record<string, unknown>) {
  const claves = Object.keys(campos);
  if (claves.length === 0) return;
  const sets = claves.map((c, i) => `${c} = $${i + 2}`).join(", ");
  const valores = claves.map((c) => campos[c]);
  await sql(`UPDATE coches SET ${sets} WHERE id = $1`, [id, ...valores]);
}

export async function eliminarCoche(id: number) {
  await sql(`DELETE FROM coches WHERE id = $1`, [id]);
}

// --- Exportación ---
// El operario elige uno de estos tres filtros a la hora de exportar:
//   - vencidos:   coches con custodia ya vencida O a punto de vencer (día
//                 12 a 2 días vista o menos), para priorizar consignas.
//   - con_salida: coches que tienen una fecha PREVISTA de salida asignada
//                 (tiene_destino) pero todavía no han salido de verdad.
//   - presentes:  coches que todavía siguen en la base (no han salido)
export type FiltroExportacion = "vencidos" | "con_salida" | "presentes";

// "Próximo a vencer": sin días extra todavía, pero a 2 días o menos del
// día 12 (mismo criterio que se usa en la tarjeta, ver lib/penalizacion.ts).
const CONDICION_PROXIMO_A_VENCER = "(dias_extra = 0 AND (12 - dias_totales) BETWEEN 0 AND 2)";

export async function exportarPorFiltro(
  filtro: FiltroExportacion,
  query?: string
): Promise<Coche[]> {
  const q = (query ?? "").trim();
  const like = `%${q.toUpperCase()}%`;

  const condicionFiltro =
    filtro === "vencidos"
      ? `(penalizacion > 0 OR ${CONDICION_PROXIMO_A_VENCER})`
      : filtro === "con_salida"
      ? "tiene_destino = true"
      : "fecha_salida IS NULL"; // presentes

  return listarConCalculo(
    `${condicionFiltro} AND ($1 = '' OR matricula ILIKE $1 OR numero_expediente ILIKE $1 OR modelo ILIKE $1)`,
    [q === "" ? "" : like]
  );
}

// --- Consignas: varias por coche, cada una con su fecha y observación ---

export async function obtenerConsignas(cocheId: number): Promise<Consigna[]> {
  const rows = await sql(
    `SELECT id, coche_id, fecha, observacion FROM consignas
     WHERE coche_id = $1
     ORDER BY fecha DESC, id DESC`,
    [cocheId]
  );
  return rows as Consigna[];
}

export async function crearConsigna(
  cocheId: number,
  fecha: string,
  observacion: string | null
) {
  const rows = await sql(
    `INSERT INTO consignas (coche_id, fecha, observacion) VALUES ($1, $2, $3) RETURNING id`,
    [cocheId, fecha, observacion]
  );
  return rows[0].id as number;
}

export async function eliminarConsigna(id: number) {
  await sql(`DELETE FROM consignas WHERE id = $1`, [id]);
}
