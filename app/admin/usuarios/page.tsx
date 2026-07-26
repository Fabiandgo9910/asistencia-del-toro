"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Trash2,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Pencil,
  KeyRound,
} from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import PasswordField from "@/components/PasswordField";

type Rol = "super_admin" | "admin" | "oficinista" | "chofer";

type UsuarioFila = {
  id: string;
  usuario: string;
  correo: string;
  rol: Rol;
  aprobado: boolean;
  creado_en: string;
};

const ROLES = [
  { valor: "admin", etiqueta: "Admin" },
  { valor: "oficinista", etiqueta: "Oficinista" },
  { valor: "chofer", etiqueta: "Chofer" },
  { valor: "super_admin", etiqueta: "Super admin" },
];

// Cada cuántos segundos se comprueba en segundo plano si hay solicitudes
// nuevas o cambios de otro administrador, sin que el usuario tenga que
// pulsar "Actualizar" a mano.
const INTERVALO_SONDEO_MS = 5000;

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accionando, setAccionando] = useState(false);
  const [rolElegido, setRolElegido] = useState<Record<string, string>>({});

  // Modales
  const [edicion, setEdicion] = useState<{ id: string; usuario: string; correo: string } | null>(null);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState<{ id: string; usuario: string } | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<{ id: string; usuario: string } | null>(null);
  const [confirmPromover, setConfirmPromover] = useState<{ id: string; usuario: string; rol: string } | null>(
    null
  );

  // Se usa para no pisar con un sondeo en segundo plano una fila que el
  // administrador está tocando en ese mismo instante (evita que un select
  // "vuelva atrás" a mitad de una acción).
  const accionandoRef = useRef(false);
  useEffect(() => {
    accionandoRef.current = accionando;
  }, [accionando]);

  // BUG REAL QUE SE CORRIGE AQUÍ: con el sondeo automático en segundo
  // plano, una petición GET que arrancó ANTES de aprobar/editar/cambiar
  // rol podía tardar más que la acción y llegar DESPUÉS, pisando el
  // cambio recién hecho con datos viejos — sin ningún error visible (la
  // acción sí funcionaba en el servidor, solo que la pantalla volvía
  // atrás sola unos segundos después). Se soluciona numerando cada
  // petición y descartando cualquier respuesta que no sea la más
  // reciente que se haya disparado.
  const peticionIdRef = useRef(0);

  // silencioso=true -> sondeo en segundo plano: no muestra "Cargando…" ni
  // pisa la pantalla si el admin está a mitad de una acción.
  const cargar = useCallback(async (silencioso = false) => {
    if (silencioso && accionandoRef.current) return;
    const miId = ++peticionIdRef.current;
    if (silencioso) setActualizando(true);
    else setCargandoInicial(true);
    if (!silencioso) setError(null);
    try {
      const res = await fetch("/api/admin/usuarios", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (miId !== peticionIdRef.current) return; // llegó tarde: se descarta
      if (!res.ok) {
        if (!silencioso) {
          setError(data?.error ?? `No se pudo cargar la lista de usuarios (código ${res.status}).`);
          setUsuarios([]);
        }
        return;
      }
      setError(null);
      setUsuarios(data?.usuarios ?? []);
    } catch {
      if (miId !== peticionIdRef.current) return; // llegó tarde: se descarta
      if (!silencioso) {
        setError("No hay conexión con el servidor.");
        setUsuarios([]);
      }
    } finally {
      if (miId === peticionIdRef.current) {
        setCargandoInicial(false);
        setActualizando(false);
      }
    }
  }, []);

  // Carga inicial + sondeo periódico en segundo plano, para que las
  // solicitudes nuevas aparezcan solas sin recargar la página. También se
  // refresca al volver a la pestaña (por si pasó tiempo en segundo plano).
  useEffect(() => {
    cargar(false);
    const intervalo = setInterval(() => cargar(true), INTERVALO_SONDEO_MS);
    const alVolverAEnfocar = () => {
      if (document.visibilityState === "visible") cargar(true);
    };
    document.addEventListener("visibilitychange", alVolverAEnfocar);
    window.addEventListener("focus", alVolverAEnfocar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolverAEnfocar);
      window.removeEventListener("focus", alVolverAEnfocar);
    };
  }, [cargar]);

  const patch = async (id: string, body: unknown) => {
    const res = await fetch(`/api/admin/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, data };
  };

  // --- Aprobar: se mueve a "activos" al instante (optimista), sin
  // esperar la respuesta del servidor. Si falla, se revierte. ---
  const aprobar = async (id: string, rolPorDefecto: string) => {
    const rol = (rolElegido[id] ?? rolPorDefecto) as Rol;
    peticionIdRef.current++; // invalida cualquier GET en curso más antiguo que este cambio
    const anterior = usuarios;
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, aprobado: true, rol } : u)));
    setAccionando(true);
    const { ok, data } = await patch(id, { accion: "aprobar", rol });
    setAccionando(false);
    if (!ok) {
      setUsuarios(anterior); // revertir
      alert(data?.error ?? "No se pudo aprobar el usuario.");
      return;
    }
    cargar(true); // sincroniza en segundo plano por si acaso, sin parpadeo
  };

  const pedirCambioRol = (u: UsuarioFila, rol: string) => {
    if (rol === "super_admin") {
      // Convertir a alguien en super_admin es delicado (podrá aprobar y
      // gestionar a todo el mundo): se pide confirmación explícita.
      setConfirmPromover({ id: u.id, usuario: u.usuario, rol });
    } else {
      cambiarRol(u.id, rol);
    }
  };

  const cambiarRol = async (id: string, rol: string) => {
    peticionIdRef.current++;
    const anterior = usuarios;
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, rol: rol as Rol } : u)));
    setAccionando(true);
    const { ok, data } = await patch(id, { accion: "rol", rol });
    setAccionando(false);
    if (!ok) {
      setUsuarios(anterior); // revertir el <select>
      alert(data?.error ?? "No se pudo cambiar el rol.");
      return;
    }
    cargar(true);
  };

  const confirmarPromocion = async () => {
    if (!confirmPromover) return;
    const { id, rol } = confirmPromover;
    peticionIdRef.current++;
    const anterior = usuarios;
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, rol: rol as Rol } : u)));
    setAccionando(true);
    const { ok, data } = await patch(id, { accion: "rol", rol });
    setAccionando(false);
    setConfirmPromover(null);
    if (!ok) {
      setUsuarios(anterior);
      alert(data?.error ?? "No se pudo cambiar el rol.");
      return;
    }
    cargar(true);
  };

  const guardarEdicion = async () => {
    if (!edicion) return;
    setErrorEdicion(null);
    peticionIdRef.current++;
    const anterior = usuarios;
    setUsuarios((prev) =>
      prev.map((u) => (u.id === edicion.id ? { ...u, usuario: edicion.usuario, correo: edicion.correo } : u))
    );
    setAccionando(true);
    const { ok, data } = await patch(edicion.id, {
      accion: "editar",
      usuario: edicion.usuario,
      correo: edicion.correo,
    });
    setAccionando(false);
    if (!ok) {
      setUsuarios(anterior);
      setErrorEdicion(data?.error ?? "No se pudo guardar.");
      return;
    }
    setEdicion(null);
    cargar(true);
  };

  const guardarNuevaPassword = async () => {
    if (!resetPass) return;
    if (nuevaPassword.length < 6) {
      setErrorPassword("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setErrorPassword(null);
    setAccionando(true);
    const { ok, data } = await patch(resetPass.id, { accion: "reset_password", nuevaPassword });
    setAccionando(false);
    if (!ok) {
      setErrorPassword(data?.error ?? "No se pudo restablecer la contraseña.");
      return;
    }
    setResetPass(null);
    setNuevaPassword("");
  };

  const confirmarEliminar = async () => {
    if (!confirmEliminar) return;
    const { id } = confirmEliminar;
    peticionIdRef.current++;
    const anterior = usuarios;
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    setAccionando(true);
    const res = await fetch(`/api/admin/usuarios/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    setAccionando(false);
    setConfirmEliminar(null);
    if (!res.ok) {
      setUsuarios(anterior);
      alert(data?.error ?? "No se pudo eliminar el usuario.");
      return;
    }
    cargar(true);
  };

  const pendientes = usuarios.filter((u) => !u.aprobado);
  const aprobados = usuarios.filter((u) => u.aprobado);

  const Fila = ({ u, esPendiente }: { u: UsuarioFila; esPendiente: boolean }) => (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-toro-line bg-toro-surface p-3 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-toro-ink">
          {u.usuario}
          {u.rol === "super_admin" && (
            <span className="ml-1.5 rounded-full bg-toro-warnBg px-1.5 py-0.5 text-[10px] font-semibold text-toro-red">
              Super admin
            </span>
          )}
        </p>
        <p className="truncate text-xs text-toro-slate">{u.correo}</p>
      </div>

      {esPendiente ? (
        <select
          defaultValue={u.rol}
          onChange={(e) => setRolElegido((prev) => ({ ...prev, [u.id]: e.target.value }))}
          className="rounded-card border border-toro-line px-2 py-1.5 text-xs outline-none"
        >
          {ROLES.filter((r) => r.valor !== "super_admin").map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </select>
      ) : (
        <select
          value={u.rol}
          onChange={(e) => pedirCambioRol(u, e.target.value)}
          className="rounded-card border border-toro-line px-2 py-1.5 text-xs outline-none"
        >
          {ROLES.map((r) => (
            <option key={r.valor} value={r.valor}>
              {r.etiqueta}
            </option>
          ))}
        </select>
      )}

      {esPendiente && (
        <button
          onClick={() => aprobar(u.id, u.rol)}
          className="flex items-center gap-1 rounded-card bg-toro-ok/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-toro-ok"
        >
          <Check size={14} /> Aprobar
        </button>
      )}

      <button
        onClick={() => setEdicion({ id: u.id, usuario: u.usuario, correo: u.correo })}
        title="Editar usuario/correo"
        className="rounded-card border border-toro-line p-1.5 text-toro-slate transition hover:text-toro-ink"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => setResetPass({ id: u.id, usuario: u.usuario })}
        title="Restablecer contraseña"
        className="rounded-card border border-toro-line p-1.5 text-toro-slate transition hover:text-toro-ink"
      >
        <KeyRound size={14} />
      </button>
      <button
        onClick={() => setConfirmEliminar({ id: u.id, usuario: u.usuario })}
        title={esPendiente ? "Rechazar solicitud" : "Eliminar usuario"}
        className="rounded-card border border-toro-red/30 p-1.5 text-toro-red transition hover:bg-toro-warnBg"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-toro-slate hover:text-toro-ink">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="flex items-center gap-2 text-base font-semibold text-toro-ink">
            <ShieldCheck size={18} /> Gestión de usuarios
          </h1>
        </div>
        <button
          onClick={() => cargar(false)}
          title="Actualizar ahora"
          className="flex items-center gap-1.5 rounded-card border border-toro-line px-2.5 py-1.5 text-xs text-toro-slate transition hover:text-toro-ink"
        >
          <RefreshCw size={13} className={cargandoInicial || actualizando ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      <p className="mb-4 rounded-card border border-toro-line bg-toro-bg px-3 py-2 text-[11px] text-toro-slate">
        Esta página se actualiza sola cada pocos segundos: las solicitudes nuevas aparecen sin recargar.
        Para crear más de un super admin, aprueba o edita a la persona y cámbiale el rol a{" "}
        <strong>Super admin</strong> en el selector.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-card border border-toro-red/30 bg-toro-warnBg px-3 py-2.5 text-sm text-toro-red">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">No se pudo cargar la lista de usuarios</p>
            <p className="text-xs text-toro-red/80">{error}</p>
            {error.toLowerCase().includes("autorizado") && (
              <p className="mt-1 text-xs text-toro-red/80">
                Solo un usuario con rol <strong>super_admin</strong> puede ver esta página. Comprueba
                con qué cuenta iniciaste sesión.
              </p>
            )}
          </div>
        </div>
      )}

      {cargandoInicial ? (
        <p className="text-sm text-toro-slate">Cargando…</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-toro-ink">
              Pendientes de aprobación ({pendientes.length})
            </h2>
            {pendientes.length === 0 ? (
              <p className="rounded-card border border-dashed border-toro-line py-6 text-center text-sm text-toro-slate">
                {error ? "No se pudieron comprobar (ver aviso arriba)." : "No hay solicitudes pendientes."}
              </p>
            ) : (
              <div className="space-y-2">
                {pendientes.map((u) => (
                  <Fila key={u.id} u={u} esPendiente />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-toro-ink">
              Usuarios activos ({aprobados.length})
            </h2>
            <div className="space-y-2">
              {aprobados.map((u) => (
                <Fila key={u.id} u={u} esPendiente={false} />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Editar usuario/correo */}
      <ConfirmModal
        abierto={!!edicion}
        titulo="Editar usuario"
        textoConfirmar="Guardar"
        cargando={accionando}
        onConfirmar={guardarEdicion}
        onCancelar={() => {
          setEdicion(null);
          setErrorEdicion(null);
        }}
      >
        {edicion && (
          <div className="space-y-2.5">
            <input
              value={edicion.usuario}
              onChange={(e) => setEdicion({ ...edicion, usuario: e.target.value })}
              placeholder="Usuario"
              className="w-full rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
            />
            <input
              value={edicion.correo}
              onChange={(e) => setEdicion({ ...edicion, correo: e.target.value })}
              placeholder="Correo"
              className="w-full rounded-card border border-toro-line px-3 py-2 text-sm outline-none focus:border-toro-red/40"
            />
            {errorEdicion && <p className="text-xs text-toro-red">{errorEdicion}</p>}
          </div>
        )}
      </ConfirmModal>

      {/* Restablecer contraseña */}
      <ConfirmModal
        abierto={!!resetPass}
        titulo={`Restablecer contraseña de ${resetPass?.usuario ?? ""}`}
        mensaje="Se le asignará esta nueva contraseña de inmediato. Compártesela por un canal seguro."
        textoConfirmar="Restablecer"
        cargando={accionando}
        onConfirmar={guardarNuevaPassword}
        onCancelar={() => {
          setResetPass(null);
          setNuevaPassword("");
          setErrorPassword(null);
        }}
      >
        <div className="space-y-2">
          <PasswordField
            value={nuevaPassword}
            onChange={setNuevaPassword}
            placeholder="Nueva contraseña (mín. 6 caracteres)"
          />
          {errorPassword && <p className="text-xs text-toro-red">{errorPassword}</p>}
        </div>
      </ConfirmModal>

      {/* Confirmar eliminar/rechazar */}
      <ConfirmModal
        abierto={!!confirmEliminar}
        titulo={`¿Eliminar a ${confirmEliminar?.usuario ?? ""}?`}
        mensaje="Esta acción no se puede deshacer. Perderá el acceso de inmediato."
        textoConfirmar="Eliminar"
        peligroso
        cargando={accionando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setConfirmEliminar(null)}
      />

      {/* Confirmar promoción a super_admin */}
      <ConfirmModal
        abierto={!!confirmPromover}
        titulo={`¿Hacer a ${confirmPromover?.usuario ?? ""} super admin?`}
        mensaje="Podrá aprobar, editar y eliminar a cualquier usuario, incluido a otros super admins."
        textoConfirmar="Sí, hacer super admin"
        peligroso
        cargando={accionando}
        onConfirmar={confirmarPromocion}
        onCancelar={() => setConfirmPromover(null)}
      />
    </main>
  );
}
