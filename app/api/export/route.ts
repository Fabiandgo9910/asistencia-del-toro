import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { activosParaExportar } from "@/lib/db";

export const dynamic = "force-dynamic";

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES") : "";

// GET /api/export?q=opcional -> descarga .xlsx
// Solo incluye coches que TODAVÍA NO han salido (fecha_salida IS NULL),
// con el mismo formato que la hoja base en papel:
// PLAZA | LL | EXPEDIENTE | VEHÍCULO | MATRICULA | FECHA | DESTINO | CONSIGNA | FECHA
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  try {
    const coches = await activosParaExportar(q);

    const encabezados = [
      "PLAZA",
      "LL",
      "EXPEDIENTE",
      "VEHÍCULO",
      "MATRICULA",
      "FECHA",
      "DESTINO",
      "CONSIGNA",
      "FECHA",
    ];

    const filas = coches.map((c) => [
      c.plaza ?? "",
      c.tiene_llave ? "X" : "",
      c.numero_expediente ?? "",
      c.modelo ?? "",
      c.matricula,
      fmtFecha(c.fecha_entrada),
      c.traslado ?? "",
      c.consigna ? "Sí" : "",
      fmtFecha(c.consigna),
    ]);

    const notaCustodia =
      "LA CUSTODIA DE MAPFRE SON 9 DÍAS + 3 NUESTROS / EL EXCESO DE CUSTODIA SON 13€ X DIA";
    const notaRevision = `ÚLTIMA REVISIÓN DE VH EN BASE - FECHA: ${new Date().toLocaleDateString("es-ES")}`;

    const hoja = XLSX.utils.aoa_to_sheet([
      [notaCustodia],
      [notaRevision],
      [],
      encabezados,
      ...filas,
    ]);

    // Fusiona la nota de custodia y la de revisión en toda la anchura de la tabla
    hoja["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: encabezados.length - 1 } },
    ];
    hoja["!cols"] = [
      { wch: 8 },  // PLAZA
      { wch: 5 },  // LL
      { wch: 14 }, // EXPEDIENTE
      { wch: 20 }, // VEHÍCULO
      { wch: 12 }, // MATRICULA
      { wch: 12 }, // FECHA
      { wch: 18 }, // DESTINO
      { wch: 10 }, // CONSIGNA
      { wch: 12 }, // FECHA
    ];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Hoja base");
    const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="hoja-base-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }
}
