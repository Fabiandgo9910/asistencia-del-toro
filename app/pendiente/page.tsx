import Link from "next/link";
import { Clock3 } from "lucide-react";

export default function PendientePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-toro-bg px-4">
      <div className="w-full max-w-sm rounded-card bg-toro-surface p-6 text-center shadow-card">
        <Clock3 className="mx-auto mb-3 text-toro-slate" size={32} />
        <h1 className="mb-2 text-lg font-semibold text-toro-ink">Solicitud enviada</h1>
        <p className="mb-5 text-sm text-toro-slate">
          Tu cuenta ha quedado pendiente de aprobación. En cuanto un administrador la apruebe,
          podrás iniciar sesión con normalidad.
        </p>
        <Link
          href="/login"
          className="inline-block w-full rounded-card bg-toro-ink py-2.5 text-sm font-semibold text-white transition hover:bg-toro-red"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}
