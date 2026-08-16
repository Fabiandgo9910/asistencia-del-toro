"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, LogOut, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PendientePage() {
  const router = useRouter();

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-toro-bg px-4">
      <div className="w-full max-w-sm rounded-card bg-toro-surface p-6 text-center shadow-card">
        <Clock3 className="mx-auto mb-3 text-toro-slate" size={32} />
        <h1 className="mb-2 text-lg font-semibold text-toro-ink">Cuenta pendiente de aprobación</h1>
        <p className="mb-5 text-sm text-toro-slate">
          Un administrador tiene que aprobar tu cuenta antes de que puedas entrar. Vuelve a
          intentarlo dentro de un rato.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => router.refresh()}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-toro-ink py-2.5 text-sm font-semibold text-white transition hover:bg-toro-red"
          >
            <RefreshCw size={15} /> Comprobar de nuevo
          </button>
          <button
            onClick={cerrarSesion}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-toro-line py-2.5 text-sm font-medium text-toro-slate transition hover:text-toro-ink"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
        <p className="mt-4 text-xs text-toro-slate">
          <Link href="/login" className="underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
