"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { Base } from "@/types/coche";

export default function SelectorBase({
  baseId,
  onChange,
}: {
  baseId: number | null;
  onChange: (id: number | null) => void;
}) {
  const [bases, setBases] = useState<Base[]>([]);
  const [creando, setCreando] = useState(false);
  const [numero, setNumero] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    const res = await fetch("/api/bases");
    const data = await res.json().catch(() => null);
    setBases(data?.bases ?? []);
  };

  useEffect(() => {
    cargar();
  }, []);

  const crear = async () => {
    if (!numero.trim() || !nombre.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero, nombre, direccion }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await cargar();
        onChange(data.base.id);
        setCreando(false);
        setNumero("");
        setNombre("");
        setDireccion("");
      } else {
        setError(data?.error ?? "No se pudo crear la base.");
      }
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-2 text-sm text-toro-slate">
        Base
        <select
          value={baseId ?? ""}
          onChange={(e) => {
            if (e.target.value === "__nueva__") {
              setCreando(true);
              return;
            }
            onChange(e.target.value ? Number(e.target.value) : null);
          }}
          className="max-w-[65%] rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
        >
          <option value="">Sin asignar</option>
          {bases.map((b) => (
            <option key={b.id} value={b.id}>
              {b.numero} · {b.nombre}
            </option>
          ))}
          <option value="__nueva__">+ Crear nueva base…</option>
        </select>
      </label>

      {creando && (
        <div className="space-y-2 rounded-card border border-toro-line bg-toro-bg p-2.5">
          <div className="flex gap-2">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Número"
              className="w-1/3 rounded-card border border-toro-line px-2 py-2 text-sm outline-none focus:border-toro-red/40"
            />
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              className="flex-1 rounded-card border border-toro-line px-2 py-2 text-sm outline-none focus:border-toro-red/40"
            />
          </div>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Dirección (opcional)"
            className="w-full rounded-card border border-toro-line px-2 py-2 text-sm outline-none focus:border-toro-red/40"
          />
          {error && <p className="text-xs text-toro-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreando(false)}
              className="flex-1 rounded-card border border-toro-line py-1.5 text-xs text-toro-slate"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={crear}
              disabled={guardando || !numero.trim() || !nombre.trim()}
              className="flex flex-1 items-center justify-center gap-1 rounded-card bg-toro-red py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              <Plus size={13} /> {guardando ? "Creando…" : "Crear base"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
