"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

const ROLES = [
  { valor: "chofer", etiqueta: "Chofer" },
  { valor: "oficinista", etiqueta: "Oficinista" },
  { valor: "admin", etiqueta: "Admin" },
];

export default function RegistroPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [rolSolicitado, setRolSolicitado] = useState("chofer");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, correo, password, rolSolicitado }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        router.push("/pendiente");
      } else {
        setError(data?.error ?? "No se pudo enviar la solicitud.");
      }
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-toro-bg px-4 py-8">
      <form
        onSubmit={enviar}
        className="w-full max-w-sm rounded-card bg-toro-surface p-6 shadow-card"
      >
        <h1 className="mb-1 text-center text-lg font-semibold text-toro-ink">Solicitar cuenta</h1>
        <p className="mb-5 text-center text-sm text-toro-slate">
          Un administrador deberá aprobar tu acceso antes de que puedas entrar.
        </p>

        <div className="space-y-3">
          <input
            autoFocus
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Usuario"
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Correo"
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mín. 6 caracteres)"
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
          <div>
            <p className="mb-1.5 text-xs text-toro-slate">Rol solicitado</p>
            <div className="flex gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.valor}
                  onClick={() => setRolSolicitado(r.valor)}
                  className={`flex-1 rounded-card border px-2 py-2 text-xs font-medium transition ${
                    rolSolicitado === r.valor
                      ? "border-toro-ink bg-toro-ink text-white"
                      : "border-toro-line text-toro-slate hover:text-toro-ink"
                  }`}
                >
                  {r.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-card bg-toro-warnBg px-3 py-2 text-xs text-toro-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={!usuario || !correo || password.length < 6 || cargando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-toro-red py-3 text-sm font-semibold text-white transition hover:bg-toro-redDark disabled:opacity-40"
        >
          <UserPlus size={16} />
          {cargando ? "Enviando…" : "Solicitar acceso"}
        </button>

        <p className="mt-4 text-center text-xs text-toro-slate">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-toro-ink underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}
