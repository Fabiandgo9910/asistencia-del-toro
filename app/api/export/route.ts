import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { buscarCoches, todosParaExportar } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/export?q=opcional -> descarga .xlsx
// Si se pasa q, exporta solo los resultados filtrados; si no, exporta todo.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  try {
    const coches = q ? await buscarCoches(q) : await todosParaExportar();

    const filas = coches.map((c) => ({
      Matrícula: c.matricula,
      Modelo: c.modelo ?? "",
      Plaza: c.plaza ?? "",
      Expediente: c.numero_expediente ?? "",
      "Fecha entrada": c.fecha_entrada,
      "Fecha salida": c.fecha_salida ?? "Activo",
      "Días totales": c.dias_totales,
      "Días extra": c.dias_extra,
      "Penalización (€)": c.penalizacion,
      Llave: c.tiene_llave ? "Sí" : "No",
      Calcinado: c.esta_calcinado ? "Sí" : "No",
      Traslado: c.traslado ?? "",
      "Empresa traslado": c.empresa_traslado ?? "",
      Consigna: c.consigna ?? "",
      Presente: c.check_presencia ? "Sí" : "No",
      "Última revisión": c.ultima_revision ?? "",
      Observaciones: c.observaciones ?? "",
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Coches");
    const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="asistencia-del-toro-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }
}
