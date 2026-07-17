"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import BuscadorBar from "./BuscadorBar";
import CocheCard from "./CocheCard";
import NuevaEntradaModal from "./NuevaEntradaModal";
import type { Coche } from "@/types/coche";

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [coches, setCoches] = useState<Coche[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

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
      prev.map((c) => (c.id === id ? { ...c, check_presencia: valor } : c))
    );
    await fetch(`/api/coches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "presencia", valor }),
    });
  };

  const darSalida = async (id: number) => {
    setCoches((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, fecha_salida: new Date().toISOString() } : c
      )
    );
    await fetch(`/api/coches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "dar_salida" }),
    });
    cargar(query);
  };

  const exportar = () => {
    window.location.href = `/api/export?q=${encodeURIComponent(query)}`;
  };

  return (
    <main className="min-h-screen pb-24">
      <BuscadorBar valor={query} onChange={setQuery} onExportar={exportar} />

      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-toro-slate">
            Asistencia del Toro
          </h1>
          <span className="text-xs text-toro-slate">
            {cargando ? "Buscando…" : `${coches.length} resultado${coches.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {!cargando && coches.length === 0 && (
          <p className="rounded-card border border-dashed border-toro-line py-10 text-center text-sm text-toro-slate">
            Sin coches para “{query || "todos"}”. Registra una entrada con el botón +.
          </p>
        )}

        <div className="space-y-2">
          {coches.map((coche) => (
            <CocheCard
              key={coche.id}
              coche={coche}
              onTogglePresencia={togglePresencia}
              onDarSalida={darSalida}
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
    </main>
  );
}
