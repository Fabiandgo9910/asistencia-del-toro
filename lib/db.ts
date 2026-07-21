import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Coche } from "@/types/coche";

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

// SQL que calcula el desglose completo de custodia directamente en la base:
// - Si fecha_salida es NULL (coche activo), se cuenta hasta CURRENT_DATE.
// - Si ya salió, se cuenta entre fecha_entrada y fecha_salida.
// - fecha_fin_propios: día en que se agotan nuestros 3 días propios.
// - fecha_fin_mapfre: día en que se agota la cobertura de Mapfre (día 12),
//   a partir del cual empieza a generar penalización.
const SELECT_CON_CALCULO = `
  SELECT
    id, plaza, fecha_entrada, tiene_llave, esta_calcinado, traslado,
    empresa_traslado, fecha_traslado, consigna, matricula, modelo,
    numero_expediente, fecha_salida, observaciones, ultima_revision, check_presencia,
    GREATEST(
      DATE_PART('day', COALESCE(fecha_salida, NOW()) - fecha_entrada::timestamp)::int,
      0
    ) AS dias_totales,
    GREATEST(
      GREATEST(
        DATE_PART('day', COALESCE(fecha_salida, NOW()) - fecha_entrada::timestamp)::int,
        0
      ) - 12,
      0
    ) AS dias_extra,
    GREATEST(
      GREATEST(
        DATE_PART('day', COALESCE(fecha_salida, NOW()) - fecha_entrada::timestamp)::int,
        0
      ) - 12,
      0
    ) * 13 AS penalizacion,
    (fecha_entrada + INTERVAL '3 days')::date AS fecha_fin_propios,
    (fecha_entrada + INTERVAL '12 days')::date AS fecha_fin_mapfre
  FROM coches
`;

export async function buscarCoches(query: string): Promise<Coche[]> {
  const like = `%${query.trim().toUpperCase()}%`;
  const rows = await sql(
    `${SELECT_CON_CALCULO}
     WHERE ($1 = '' OR matricula ILIKE $1 OR numero_expediente ILIKE $1 OR modelo ILIKE $1)
     ORDER BY (fecha_salida IS NOT NULL), fecha_entrada DESC
     LIMIT 200`,
    [query.trim() === "" ? "" : like]
  );
  return rows as Coche[];
}

export async function obtenerCoche(id: number): Promise<Coche | null> {
  const rows = await sql(`${SELECT_CON_CALCULO} WHERE id = $1`, [id]);
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
  observaciones: string | null;
}) {
  const rows = await sql(
    `INSERT INTO coches
      (plaza, fecha_entrada, matricula, modelo, numero_expediente, tiene_llave, esta_calcinado, observaciones, check_presencia, ultima_revision)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
     RETURNING id`,
    [
      data.plaza,
      data.fecha_entrada,
      data.matricula.toUpperCase(),
      data.modelo,
      data.numero_expediente,
      data.tiene_llave,
      data.esta_calcinado,
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

// Solo para exportar: coches que todavía NO han salido (fecha_salida NULL).
// Admite filtrar además por matrícula/expediente/modelo si se pasa query.
export async function activosParaExportar(query?: string): Promise<Coche[]> {
  const q = (query ?? "").trim();
  const like = `%${q.toUpperCase()}%`;
  const rows = await sql(
    `${SELECT_CON_CALCULO}
     WHERE fecha_salida IS NULL
       AND ($1 = '' OR matricula ILIKE $1 OR numero_expediente ILIKE $1 OR modelo ILIKE $1)
     ORDER BY plaza NULLS LAST, fecha_entrada DESC`,
    [q === "" ? "" : like]
  );
  return rows as Coche[];
}

export async function todosParaExportar(): Promise<Coche[]> {
  const rows = await sql(`${SELECT_CON_CALCULO} ORDER BY fecha_entrada DESC`);
  return rows as Coche[];
}
