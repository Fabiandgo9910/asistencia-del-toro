"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import BuscadorBar, { type FiltroPresencia } from "./BuscadorBar";
import CocheCard from "./CocheCard";
import NuevaEntradaModal from "./NuevaEntradaModal";
import SalidaModal from "./SalidaModal";
import EditarCocheModal from "./EditarCocheModal";
import ConsignasModal from "./ConsignasModal";
import type { Coche } from "@/types/coche";

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [coches, setCoches] = useState<Coche[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cocheParaSalida, setCocheParaSalida] = useState<Coche | null>(null);
  const [cocheParaEditar, setCocheParaEditar] = useState<Coche | null>(null);
  const [cocheParaConsignas, setCocheParaConsignas] = useState<Coche | null>(null);
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

  const exportar = () => {
    window.location.href = `/api/export?q=${encodeURIComponent(query)}`;
  };

  const visibles = coches.filter((c) => {
    if (filtro === "presentes") return c.check_presencia;
    if (filtro === "no_presentes") return !c.check_presencia;
    if (filtro === "vencidos") return c.penalizacion > 0;
    return true;
  });

  const mensajeVacio = {
    presentes: "Ningún coche presente coincide con la búsqueda.",
    no_presentes: "Ningún coche marcado como ausente coincide con la búsqueda.",
    vencidos: "Ningún coche tiene la custodia vencida ahora mismo.",
    todos: `Sin coches para “${query || "todos"}”. Registra una entrada con el botón +.`,
  }[filtro];

  return (
    <main className="min-h-screen pb-24">
      <BuscadorBar
        valor={query}
        onChange={setQuery}
        onExportar={exportar}
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

      {/* Botón flotante - Nueva entrada, siempre a mano */}
      <button
        onClick={() => setModalAbierto(true)}
        className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-toro-red text-white shadow-lg transition hover:bg-toro-redDark sm:h-16 sm:w-16"
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
    </main>
  );
}
