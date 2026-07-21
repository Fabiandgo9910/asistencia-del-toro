import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { exportarPorFiltro, type FiltroExportacion } from "@/lib/db";

export const dynamic = "force-dynamic";

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES") : "";

// Ancho de cada columna en puntos (pt), en el mismo orden que la hoja base:
// PLAZA | LL | EXPEDIENTE | VEHÍCULO | MATRICULA | FECHA | DESTINO | CONSIGNA | FECHA
const COLUMNAS = [
  { titulo: "PLAZA", ancho: 45 },
  { titulo: "LL", ancho: 30 },
  { titulo: "EXPEDIENTE", ancho: 85 },
  { titulo: "VEHÍCULO", ancho: 130 },
  { titulo: "MATRICULA", ancho: 80 },
  { titulo: "FECHA", ancho: 65 },
  { titulo: "DESTINO", ancho: 130 },
  { titulo: "CONSIGNA", ancho: 60 },
  { titulo: "FECHA", ancho: 65 },
];

function dibujarFilaTabla(
  doc: PDFKit.PDFDocument,
  y: number,
  valores: string[],
  x0: number,
  opciones: { negrita?: boolean; relleno?: boolean; alturaFila?: number } = {}
) {
  const { negrita = false, relleno = false, alturaFila = 18 } = opciones;
  let x = x0;

  if (relleno) {
    doc.rect(x0, y, COLUMNAS.reduce((s, c) => s + c.ancho, 0), alturaFila).fill("#E7E7E7");
    doc.fillColor("#000000");
  }

  doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(8);

  COLUMNAS.forEach((col, i) => {
    doc.rect(x, y, col.ancho, alturaFila).stroke();
    doc.text(valores[i] ?? "", x + 3, y + alturaFila / 2 - 4, {
      width: col.ancho - 6,
      height: alturaFila - 4,
      align: i === 3 || i === 6 ? "left" : "center",
      lineBreak: false,
      ellipsis: true,
    });
    x += col.ancho;
  });

  return y + alturaFila;
}

// GET /api/export?filtro=vencidos|con_salida|presentes&q=opcional
// Genera un PDF (no un .xlsx) con el mismo formato exacto que la hoja base
// en papel: PLAZA | LL | EXPEDIENTE | VEHÍCULO | MATRICULA | FECHA | DESTINO
// | CONSIGNA | FECHA. Se sirve con Content-Disposition "inline" para que el
// navegador lo abra directamente en su visor de PDF (con sus propios
// botones de descargar/imprimir), en vez de forzar una descarga.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const filtroParam = req.nextUrl.searchParams.get("filtro");
  const filtro: FiltroExportacion =
    filtroParam === "vencidos" || filtroParam === "con_salida" ? filtroParam : "presentes";

  const tituloFiltro = {
    vencidos: "COCHES CON CUSTODIA VENCIDA",
    con_salida: "COCHES CON FECHA DE SALIDA",
    presentes: "COCHES EN BASE (PRESENTES)",
  }[filtro];

  try {
    const coches = await exportarPorFiltro(filtro, q);

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    const fin = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const x0 = doc.page.margins.left;
    let y = doc.page.margins.top;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(tituloFiltro, x0, y);
    y += 16;
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        "LA CUSTODIA DE MAPFRE SON 9 DÍAS + 3 NUESTROS / EL EXCESO DE CUSTODIA SON 13€ X DIA",
        x0,
        y
      );
    y += 13;
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`ÚLTIMA REVISIÓN DE VH EN BASE - FECHA: ${new Date().toLocaleDateString("es-ES")}`, x0, y);
    y += 20;

    y = dibujarFilaTabla(
      doc,
      y,
      COLUMNAS.map((c) => c.titulo),
      x0,
      { negrita: true, relleno: true }
    );

    for (const c of coches) {
      // Salto de página si no cabe otra fila
      if (y + 18 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 30 });
        y = doc.page.margins.top;
        y = dibujarFilaTabla(
          doc,
          y,
          COLUMNAS.map((col) => col.titulo),
          x0,
          { negrita: true, relleno: true }
        );
      }

      y = dibujarFilaTabla(doc, y, [
        c.plaza != null ? String(c.plaza) : "",
        c.tiene_llave ? "X" : "",
        c.numero_expediente ?? "",
        c.modelo ?? "",
        c.matricula,
        fmtFecha(c.fecha_entrada),
        c.traslado ?? "",
        c.ultima_consigna ? "Sí" : "",
        fmtFecha(c.ultima_consigna),
      ], x0);
    }

    if (coches.length === 0) {
      doc.font("Helvetica").fontSize(9).text("No hay coches para este filtro.", x0, y + 8);
    }

    doc.end();
    const buffer = await fin;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // "inline" -> el navegador lo abre en su propio visor de PDF,
        // con botones de descargar e imprimir, en vez de forzar la descarga.
        "Content-Disposition": `inline; filename="hoja-base-${filtro}-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }
}
