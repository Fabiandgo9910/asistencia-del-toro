"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identificador, password }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data?.error ?? "No se pudo iniciar sesión.");
      }
    } catch {
      setError("No hay conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-toro-bg px-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-card bg-toro-surface p-6 shadow-card"
      >
        <h1 className="mb-1 text-center text-lg font-semibold text-toro-ink">
          Asistencia del Toro
        </h1>
        <p className="mb-5 text-center text-sm text-toro-slate">Inicia sesión para continuar</p>

        <div className="space-y-3">
          <input
            autoFocus
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="Usuario o correo"
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-card bg-toro-warnBg px-3 py-2 text-xs text-toro-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={!identificador || !password || cargando}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-toro-red py-3 text-sm font-semibold text-white transition hover:bg-toro-redDark disabled:opacity-40"
        >
          <LogIn size={16} />
          {cargando ? "Entrando…" : "Entrar"}
        </button>

        <p className="mt-4 text-center text-xs text-toro-slate">
          ¿No tienes cuenta todavía?{" "}
          <Link href="/registro" className="font-medium text-toro-ink underline">
            Solicítala aquí
          </Link>
        </p>
      </form>
    </main>
  );
}
