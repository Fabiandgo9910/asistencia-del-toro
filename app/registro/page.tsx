"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import PasswordField from "@/components/PasswordField";

const ROLES = [
  { valor: "chofer", etiqueta: "Chofer", descripcion: "Solo puede registrar entradas de coches." },
  { valor: "oficinista", etiqueta: "Oficinista", descripcion: "Acceso completo (coches, salidas, exportar)." },
  { valor: "admin", etiqueta: "Admin", descripcion: "Acceso completo (coches, salidas, exportar)." },
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
      setCargando(false);

      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar la solicitud.");
        return;
      }

      router.push("/pendiente");
    } catch {
      setCargando(false);
      setError("No hay conexión con el servidor.");
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
          Un administrador debe aprobarla antes de que puedas entrar.
        </p>

        <div className="space-y-3">
          <input
            autoFocus
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Nombre de usuario"
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Correo"
            className="w-full rounded-card border border-toro-line px-3 py-2.5 text-sm outline-none focus:border-toro-red/40"
          />
          <PasswordField
            value={password}
            onChange={setPassword}
            placeholder="Contraseña (mín. 6 caracteres)"
          />

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-toro-slate">Rol solicitado</p>
            {ROLES.map((r) => (
              <label
                key={r.valor}
                className={`flex cursor-pointer items-start gap-2 rounded-card border p-2.5 text-sm transition ${
                  rolSolicitado === r.valor ? "border-toro-red/50 bg-toro-warnBg/40" : "border-toro-line"
                }`}
              >
                <input
                  type="radio"
                  name="rol"
                  className="mt-0.5"
                  checked={rolSolicitado === r.valor}
                  onChange={() => setRolSolicitado(r.valor)}
                />
                <span>
                  <span className="block font-medium text-toro-ink">{r.etiqueta}</span>
                  <span className="block text-xs text-toro-slate">{r.descripcion}</span>
                </span>
              </label>
            ))}
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
          {cargando ? "Enviando…" : "Enviar solicitud"}
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
