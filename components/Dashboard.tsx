"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import BuscadorBar, { type FiltroPresencia } from "./BuscadorBar";
import CocheCard from "./CocheCard";
import NuevaEntradaModal from "./NuevaEntradaModal";
import SalidaModal from "./SalidaModal";
import EditarCocheModal from "./EditarCocheModal";
import ConsignasModal from "./ConsignasModal";
import ExportarModal, { type FiltroExportacion } from "./ExportarModal";
import { estaProximoAVencer } from "@/lib/penalizacion";
import type { Coche } from "@/types/coche";

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [coches, setCoches] = useState<Coche[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cocheParaSalida, setCocheParaSalida] = useState<Coche | null>(null);
  const [cocheParaEditar, setCocheParaEditar] = useState<Coche | null>(null);
  const [cocheParaConsignas, setCocheParaConsignas] = useState<Coche | null>(null);
  const [exportarAbierto, setExportarAbierto] = useState(false);
  // Por defecto solo se muestran los coches presentes, que es el caso de uso
  // más habitual (parking activo); el operario puede cambiarlo cuando quiera.
  const [filtro, setFiltro] = useState<FiltroPresencia>("presentes");

  const cargar = useCallback(async (q: string) => {
    const res = await fetch(`/api/coches?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setCoches(data.coches ?? []);
    setCargando(false);
  }, []);

  // Búsqueda en tiempo real con pequeño debounce para no saturar la API
  useEffect(() => {
    setCargando(true);
    const t = setTimeout(() => cargar(query), 200);
    return () => clearTimeout(t);
  }, [query, cargar]);

  const togglePresencia = async (id: number, valor: boolean) => {
    setCoches((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, check_presencia: valor, ultima_revision: new Date().toISOString() } : c
      )
    );
    await fetch(`/api/coches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "presencia", valor }),
    });
  };

  // Exportar ahora es de 2 pasos: se elige el filtro en ExportarModal y
  // desde ahí se abre el PDF resultante en una pestaña nueva.
  const elegirExportacion = (filtroExport: FiltroExportacion) => {
    const url = `/api/export?filtro=${filtroExport}&q=${encodeURIComponent(query)}`;
    window.open(url, "_blank");
    setExportarAbierto(false);
  };

  const visibles = coches.filter((c) => {
    if (filtro === "presentes") return c.check_presencia;
    if (filtro === "no_presentes") return !c.check_presencia;
    if (filtro === "vencidos") {
      const activo = !c.fecha_salida;
      return c.penalizacion > 0 || estaProximoAVencer(c.dias_totales, c.dias_extra, activo);
    }
    if (filtro === "con_salida") return c.tiene_destino;
    return true;
  });

  const mensajeVacio = {
    presentes: "Ningún coche presente coincide con la búsqueda.",
    no_presentes: "Ningún coche marcado como ausente coincide con la búsqueda.",
    vencidos: "Ningún coche está vencido ni a punto de vencer ahora mismo.",
    con_salida: "Ningún coche con fecha de salida prevista coincide con la búsqueda.",
    todos: `Sin coches para “${query || "todos"}”. Registra una entrada con el botón +.`,
  }[filtro];

  return (
    <>
      <main className="min-h-screen pb-28">
        <BuscadorBar
          valor={query}
          onChange={setQuery}
          onExportar={() => setExportarAbierto(true)}
          filtro={filtro}
          onCambiarFiltro={setFiltro}
        />

        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm font-semibold text-toro-slate">
              Asistencia del Toro
            </h1>
            <span className="text-xs text-toro-slate">
              {cargando ? "Buscando…" : `${visibles.length} resultado${visibles.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {!cargando && visibles.length === 0 && (
            <p className="rounded-card border border-dashed border-toro-line py-10 text-center text-sm text-toro-slate">
              {mensajeVacio}
            </p>
          )}

          <div className="space-y-2">
            {visibles.map((coche) => (
              <CocheCard
                key={coche.id}
                coche={coche}
                onTogglePresencia={togglePresencia}
                onPedirSalida={setCocheParaSalida}
                onEditar={setCocheParaEditar}
                onConsignas={setCocheParaConsignas}
              />
            ))}
          </div>
        </div>

        {/* Botón flotante - Nueva entrada, siempre a mano. Se deja sitio
            encima del footer fijo para que nunca se solapen. */}
        <button
          onClick={() => setModalAbierto(true)}
          className="fixed bottom-16 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-toro-red text-white shadow-lg transition hover:bg-toro-redDark sm:bottom-20 sm:h-16 sm:w-16"
          title="Registrar entrada"
        >
          <Plus size={26} />
        </button>

        <NuevaEntradaModal
          abierto={modalAbierto}
          onCerrar={() => setModalAbierto(false)}
          onCreado={() => cargar(query)}
        />

        <SalidaModal
          coche={cocheParaSalida}
          onCerrar={() => setCocheParaSalida(null)}
          onConfirmado={() => cargar(query)}
        />

        <EditarCocheModal
          coche={cocheParaEditar}
          onCerrar={() => setCocheParaEditar(null)}
          onGuardado={() => cargar(query)}
          onEliminado={() => cargar(query)}
        />

        <ConsignasModal
          coche={cocheParaConsignas}
          onCerrar={() => setCocheParaConsignas(null)}
          onCambio={() => cargar(query)}
        />

        <ExportarModal
          abierto={exportarAbierto}
          onCerrar={() => setExportarAbierto(false)}
          onElegir={elegirExportacion}
        />
      </main>

      {/* Barra fija abajo, discreta, que no tapa ni el contenido ni el
          botón flotante (que se colocó más arriba, en bottom-16/20). */}
      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-toro-line bg-toro-bg/95 py-1.5 text-center text-[10px] text-toro-slate backdrop-blur">
        © 2026 Asistencia del Toro · Sistema Interno · By Fabian D
      </footer>
    </>
  );
}
