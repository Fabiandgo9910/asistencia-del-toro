import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

// Este endpoint NO es un trigger de base de datos: los triggers de Postgres
// reaccionan a INSERT/UPDATE/DELETE, no al simple paso del tiempo. Para borrar
// registros con fecha_entrada > 1 año, la forma correcta es un job programado.
// Vercel Cron llama a esta ruta 1 vez al día (ver vercel.json).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Reutiliza la función SQL definida en sql/schema.sql, que ya
  // devuelve el número de filas borradas.
  const rows = await sql`SELECT limpiar_registros_antiguos() AS eliminados`;

  return NextResponse.json({ eliminados: rows[0].eliminados });
}
