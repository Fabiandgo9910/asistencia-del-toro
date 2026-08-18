import { NextRequest, NextResponse } from "next/server";
import { DocumentoPdf, dibujarFila } from "@/lib/pdf-lite";
import { exportarPorFiltro, type FiltroExportacion } from "@/lib/db";
import { obtenerSesionActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES") : "";

// Ancho de cada columna en puntos (pt), en el mismo orden que la hoja base:
// PLAZA | LL | TIPO | EXPEDIENTE | VEHÍCULO | MATRICULA | BASE | FECHA | DESTINO | CONSIGNA | OBSERVACIONES
//
// CONSIGNA es una sola columna con la fecha de la última consigna: si hay
// fecha, se entiende que ya se hizo (no hace falta un "Sí" aparte). Eso,
// más una BASE reducida al número y un par de columnas más ajustadas,
// deja mucho más sitio para OBSERVACIONES.
const COLUMNAS: { titulo: string; ancho: number; align?: "left" | "center" }[] = [
  { titulo: "PLAZA", ancho: 36 },
  { titulo: "LL", ancho: 22 },
  { titulo: "TIPO", ancho: 42 },
  { titulo: "EXPEDIENTE", ancho: 65 },
  { titulo: "VEHÍCULO", ancho: 78, align: "left" },
  { titulo: "MATRICULA", ancho: 65 },
  { titulo: "BASE", ancho: 36 },
  { titulo: "FECHA", ancho: 52 },
  { titulo: "DESTINO", ancho: 120, align: "left" },
  { titulo: "CONSIGNA", ancho: 60 },
  { titulo: "OBSERVACIONES", ancho: 190, align: "left" },
];

// GET /api/export?filtro=vencidos|con_salida|en_base&q=opcional
// Genera un PDF con el mismo formato exacto que la hoja base en papel.
// Se sirve con Content-Disposition "inline" para que el navegador lo abra
// directamente en su visor de PDF.
//
// El PDF se genera con un motor propio (ver lib/pdf-lite.ts) que no
// depende de ningún paquete externo ni lee nada del disco, así que no
// puede fallar por un problema de empaquetado en el servidor.
export async function GET(req: NextRequest) {
  const sesion = await obtenerSesionActual();
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
    filtroParam === "vencidos" || filtroParam === "con_salida" ? filtroParam : "en_base";

  const tituloFiltro = {
    vencidos: "COCHES CON CUSTODIA VENCIDA",
    con_salida: "COCHES CON SALIDA PREVISTA",
    en_base: "COCHES EN BASE",
  }[filtro];

  try {
    const coches = await exportarPorFiltro(filtro, q);

    const doc = new DocumentoPdf(); // A4 apaisado por defecto
    const x0 = 30;
    let y = 30;
    let pagina = doc.actual;

    pagina.texto(tituloFiltro, x0, y + 11, 11, "negrita");

    // Conteo de vehículos, en la esquina superior derecha de la hoja:
    // total y desglosado por tipo (coche/moto/furgón).
    const conteoTipos = coches.reduce(
      (acc, c) => {
        acc[c.tipo_vehiculo] = (acc[c.tipo_vehiculo] ?? 0) + 1;
        return acc;
      },
      { coche: 0, moto: 0, furgon: 0 } as Record<string, number>
    );
    const xConteo = doc.ancho - 210;
    pagina.texto(`TOTAL VEHÍCULOS: ${coches.length}`, xConteo, y + 11, 10, "negrita");
    pagina.texto(
      `Coches: ${conteoTipos.coche} · Motos: ${conteoTipos.moto} · Furgones: ${conteoTipos.furgon}`,
      xConteo,
      y + 24,
      8,
      "regular"
    );

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

      // DESTINO combina, cuando aplica, varios avisos en una sola celda,
      // separados por " - ":
      // - Estado de la custodia (uno de los tres, nunca a la vez):
      //     "Exceso de custodia"  -> ya generó penalización (día 13+)
      //     "Tope de custodia"    -> justo en el día 12, al límite
      //     "Custodia"            -> ya pasaron los 3 días propios (día 4-11)
      //   Se aplica siempre que corresponda, tenga o no fecha de salida
      //   prevista — son cosas independientes.
      // - "Ver Albarán": ya tiene fecha de salida prevista.
      // - "Traslados": se marcó manualmente que se prevé que salga por traslado.
      let estadoCustodia = "";
      if (c.penalizacion > 0) estadoCustodia = "Exceso de custodia";
      else if (c.dias_totales === 12) estadoCustodia = "Tope de custodia";
      else if (c.dias_totales > 3) estadoCustodia = "Custodia";

      const avisos: string[] = [];
      if (estadoCustodia) avisos.push(estadoCustodia);
      if (c.tiene_destino) avisos.push("Ver Albarán");
      if (c.traslado_previsto) avisos.push("Traslados");
      const destino = avisos.length > 0 ? avisos.join(" - ") : c.traslado ?? "";

      const TIPO_VEHICULO: Record<string, string> = { moto: "Moto", furgon: "Furgón", coche: "Coche" };

      y = dibujarFila(
        pagina,
        y,
        [
          c.plaza ?? "",
          c.tiene_llave ? "Sí" : "No",
          TIPO_VEHICULO[c.tipo_vehiculo] ?? "Coche",
          c.numero_expediente ?? "",
          c.modelo ?? "",
          c.matricula,
          c.base_numero ?? "",
          fmtFecha(c.fecha_entrada),
          destino,
          fmtFecha(c.ultima_consigna),
          c.observaciones ?? "",
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
