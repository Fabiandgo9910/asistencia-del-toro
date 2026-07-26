"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/PasswordField";

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

    let correo = identificador.trim();

    // Se admite entrar con "usuario" además de con el correo: Supabase
    // Auth solo admite iniciar sesión por correo, así que si lo escrito
    // no parece un correo, se resuelve primero contra el servidor.
    if (!correo.includes("@")) {
      try {
        const res = await fetch("/api/auth/resolver-usuario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario: correo }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.correo) {
          correo = data.correo;
        } else {
          setCargando(false);
          setError("Usuario o contraseña incorrectos");
          return;
        }
      } catch {
        setCargando(false);
        setError("No hay conexión con el servidor.");
        return;
      }
    }

    const supabase = createClient();
    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email: correo, password });
    setCargando(false);

    if (errorLogin) {
      setError("Usuario o contraseña incorrectos");
      return;
    }

    router.push("/");
    router.refresh();
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
          <PasswordField value={password} onChange={setPassword} />
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
        <p className="mt-1 text-center text-[11px] text-toro-slate">
          <Link href="/recuperar" className="underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>
    </main>
  );
}
