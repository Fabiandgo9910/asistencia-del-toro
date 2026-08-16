"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [correo, setCorreo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error: errorEnvio } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/auth/callback?next=/actualizar-password`,
    });

    setCargando(false);

    if (errorEnvio) {
      setError(errorEnvio.message);
      return;
    }
    setEnviado(true);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-toro-bg px-4">
      <div className="w-full max-w-sm rounded-card bg-toro-surface p-6 shadow-card">
        <h1 className="mb-1 flex items-center justify-center gap-2 text-center text-lg font-semibold text-toro-ink">
          <KeyRound size={18} /> Recuperar contraseña
        </h1>

        {enviado ? (
          <p className="mt-4 rounded-card bg-toro-okBg px-3 py-2.5 text-center text-sm text-toro-ok">
            Si ese correo existe, te hemos enviado un enlace para elegir una contraseña nueva.
          </p>
        ) : (
          <form onSubmit={enviar}>
            <p className="mb-5 text-center text-sm text-toro-slate">
              Escribe tu correo y te enviaremos un enlace para restablecerla.
            </p>
            <input
              autoFocus
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Correo"
              className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
            />
            {error && (
              <p className="mt-3 rounded-card bg-toro-warnBg px-3 py-2 text-xs text-toro-red">{error}</p>
            )}
            <button
              type="submit"
              disabled={!correo || cargando}
              className="mt-5 w-full rounded-card bg-toro-red py-3 text-sm font-semibold text-white transition hover:bg-toro-redDark disabled:opacity-40"
            >
              {cargando ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-xs text-toro-slate">
          <Link href="/login" className="font-medium text-toro-ink underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
