"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/PasswordField";

export default function ActualizarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error: errorUpdate } = await supabase.auth.updateUser({ password });
    setCargando(false);

    if (errorUpdate) {
      setError(errorUpdate.message);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-toro-bg px-4">
      <form
        onSubmit={guardar}
        className="w-full max-w-sm rounded-card bg-toro-surface p-6 shadow-card"
      >
        <h1 className="mb-1 flex items-center justify-center gap-2 text-center text-lg font-semibold text-toro-ink">
          <KeyRound size={18} /> Elige una contraseña nueva
        </h1>
        <p className="mb-5 text-center text-sm text-toro-slate">
          Se aplicará de inmediato a tu cuenta.
        </p>

        <PasswordField value={password} onChange={setPassword} placeholder="Contraseña nueva" autoFocus />

        {error && (
          <p className="mt-3 rounded-card bg-toro-warnBg px-3 py-2 text-xs text-toro-red">{error}</p>
        )}

        <button
          type="submit"
          disabled={password.length < 6 || cargando}
          className="mt-5 w-full rounded-card bg-toro-red py-3 text-sm font-semibold text-white transition hover:bg-toro-redDark disabled:opacity-40"
        >
          {cargando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </main>
  );
}
