import { NextRequest, NextResponse } from "next/server";
import { DocumentoPdf, dibujarFila } from "@/lib/pdf-lite";
import { exportarPorFiltro, type FiltroExportacion } from "@/lib/db";
import { exigirSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES") : "";

// Ancho de cada columna en puntos (pt), en el mismo orden que la hoja base:
// PLAZA | LL | EXPEDIENTE | VEHÍCULO | MATRICULA | FECHA | DESTINO | CONSIGNA | FECHA
const COLUMNAS: { titulo: string; ancho: number; align?: "left" | "center" }[] = [
  { titulo: "PLAZA", ancho: 45 },
  { titulo: "LL", ancho: 30 },
  { titulo: "EXPEDIENTE", ancho: 85 },
  { titulo: "VEHÍCULO", ancho: 130, align: "left" },
  { titulo: "MATRICULA", ancho: 80 },
  { titulo: "FECHA", ancho: 65 },
  { titulo: "DESTINO", ancho: 130, align: "left" },
  { titulo: "CONSIGNA", ancho: 60 },
  { titulo: "FECHA", ancho: 65 },
];

// GET /api/export?filtro=vencidos|con_salida|presentes&q=opcional
// Genera un PDF con el mismo formato exacto que la hoja base en papel.
// Se sirve con Content-Disposition "inline" para que el navegador lo abra
// directamente en su visor de PDF.
//
// El PDF se genera con un motor propio (ver lib/pdf-lite.ts) que no
// depende de ningún paquete externo ni lee nada del disco, así que no
// puede fallar por un problema de empaquetado en el servidor.
export async function GET(req: NextRequest) {
  const sesion = await exigirSesion(req);
  if (!sesion) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (sesion.rol === "chofer") {
    return NextResponse.json(
      { error: "Tu usuario no tiene permiso para exportar." },
      { status: 403 }
    );
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const filtroParam = req.nextUrl.searchParams.get("filtro");
  const filtro: FiltroExportacion =
    filtroParam === "vencidos" || filtroParam === "con_salida" ? filtroParam : "presentes";

  const tituloFiltro = {
    vencidos: "COCHES CON CUSTODIA VENCIDA",
    con_salida: "COCHES CON SALIDA PREVISTA",
    presentes: "COCHES EN BASE (PRESENTES)",
  }[filtro];

  try {
    const coches = await exportarPorFiltro(filtro, q);

    const doc = new DocumentoPdf(); // A4 apaisado por defecto
    const x0 = 30;
    let y = 30;
    let pagina = doc.actual;

    pagina.texto(tituloFiltro, x0, y + 11, 11, "negrita");
    y += 16;
    pagina.texto(
      "LA CUSTODIA DE MAPFRE SON 9 DÍAS + 3 NUESTROS / EL EXCESO DE CUSTODIA SON 13€ X DIA",
      x0,
      y + 9,
      9,
      "negrita"
    );
    y += 13;
    pagina.texto(
      `ÚLTIMA REVISIÓN DE VH EN BASE - FECHA: ${new Date().toLocaleDateString("es-ES")}`,
      x0,
      y + 9,
      9,
      "regular"
    );
    y += 20;

    y = dibujarFila(pagina, y, COLUMNAS.map((c) => c.titulo), COLUMNAS, x0, {
      negrita: true,
      relleno: true,
    });

    const limiteInferior = doc.alto - 30;

    for (const c of coches) {
      if (y + 18 > limiteInferior) {
        pagina = doc.nuevaPagina();
        y = 30;
        y = dibujarFila(pagina, y, COLUMNAS.map((col) => col.titulo), COLUMNAS, x0, {
          negrita: true,
          relleno: true,
        });
      }

      y = dibujarFila(
        pagina,
        y,
        [
          c.plaza != null ? String(c.plaza) : "",
          c.tiene_llave ? "X" : "",
          c.numero_expediente ?? "",
          c.modelo ?? "",
          c.matricula,
          fmtFecha(c.fecha_entrada),
          c.traslado ?? "",
          c.ultima_consigna ? "Sí" : "",
          fmtFecha(c.ultima_consigna),
        ],
        COLUMNAS,
        x0
      );
    }

    if (coches.length === 0) {
      pagina.texto("No hay coches para este filtro.", x0, y + 12, 9, "regular");
    }

    const buffer = doc.build();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="hoja-base-${filtro}-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    const mensaje = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "Error al exportar", detalle: mensaje }, { status: 500 });
  }
}
