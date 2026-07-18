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

// SQL que calcula días totales / extra / penalización directamente en la base:
// - Si fecha_salida es NULL (coche activo), se cuenta hasta CURRENT_DATE.
// - Si ya salió, se cuenta entre fecha_entrada y fecha_salida.
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
    ) * 13 AS penalizacion
  FROM coches
`;

export async function buscarCoches(query: string): Promise<Coche[]> {
  const like = `%${query.trim().toUpperCase()}%`;
  const rows = await sql(
    `${SELECT_CON_CALCULO}
     WHERE ($1 = '' OR matricula ILIKE $1 OR numero_expediente ILIKE $1)
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

export async function darSalida(id: number) {
  await sql(
    `UPDATE coches SET fecha_salida = NOW() WHERE id = $1 AND fecha_salida IS NULL`,
    [id]
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

export async function todosParaExportar(): Promise<Coche[]> {
  const rows = await sql(`${SELECT_CON_CALCULO} ORDER BY fecha_entrada DESC`);
  return rows as Coche[];
}
