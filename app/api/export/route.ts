import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { activosParaExportar } from "@/lib/db";

export const dynamic = "force-dynamic";

const fmtFecha = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-ES") : "";

const COLUMNAS = [
  { header: "PLAZA", width: 8 },
  { header: "LL", width: 6 },
  { header: "EXPEDIENTE", width: 16 },
  { header: "VEHÍCULO", width: 22 },
  { header: "MATRICULA", width: 14 },
  { header: "FECHA", width: 12 },
  { header: "DESTINO", width: 22 },
  { header: "CONSIGNA", width: 10 },
  { header: "FECHA", width: 12 },
];

const BORDE_FINO: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

// GET /api/export?q=opcional -> descarga .xlsx
// Solo incluye coches que TODAVÍA NO han salido (fecha_salida IS NULL),
// con el mismo formato exacto que la hoja base en papel:
// PLAZA | LL | EXPEDIENTE | VEHÍCULO | MATRICULA | FECHA | DESTINO | CONSIGNA | FECHA
// (con sus bordes, negritas y cabecera sombreada, igual que el modelo original)
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  try {
    const coches = await activosParaExportar(q);

    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Hoja base", {
      pageSetup: { orientation: "landscape", fitToPage: true },
    });

    hoja.columns = COLUMNAS.map((c) => ({ width: c.width }));

    // Nota de custodia, fusionada en todo el ancho de la tabla
    hoja.mergeCells(1, 1, 1, COLUMNAS.length);
    const filaNota1 = hoja.getCell(1, 1);
    filaNota1.value =
      "LA CUSTODIA DE MAPFRE SON 9 DÍAS + 3 NUESTROS / EL EXCESO DE CUSTODIA SON 13€ X DIA";
    filaNota1.font = { bold: true, size: 10 };

    hoja.mergeCells(2, 1, 2, COLUMNAS.length);
    const filaNota2 = hoja.getCell(2, 1);
    filaNota2.value = `ÚLTIMA REVISIÓN DE VH EN BASE - FECHA: ${new Date().toLocaleDateString("es-ES")}`;
    filaNota2.font = { size: 10 };

    // Fila 3 en blanco, como en el original
    const filaCabecera = hoja.getRow(4);
    COLUMNAS.forEach((c, i) => {
      const celda = filaCabecera.getCell(i + 1);
      celda.value = c.header;
      celda.font = { bold: true };
      celda.alignment = { horizontal: "center", vertical: "middle" };
      celda.border = BORDE_FINO;
      celda.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE7E7E7" },
      };
    });
    filaCabecera.height = 20;

    coches.forEach((c, i) => {
      const fila = hoja.getRow(5 + i);
      const valores = [
        c.plaza ?? "",
        c.tiene_llave ? "X" : "",
        c.numero_expediente ?? "",
        c.modelo ?? "",
        c.matricula,
        fmtFecha(c.fecha_entrada),
        c.traslado ?? "",
        c.ultima_consigna ? "Sí" : "",
        fmtFecha(c.ultima_consigna),
      ];
      valores.forEach((valor, col) => {
        const celda = fila.getCell(col + 1);
        celda.value = valor;
        celda.border = BORDE_FINO;
        celda.alignment = {
          horizontal: col === 3 || col === 6 ? "left" : "center",
          vertical: "middle",
        };
      });
    });

    const buffer = await libro.xlsx.writeBuffer();

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
