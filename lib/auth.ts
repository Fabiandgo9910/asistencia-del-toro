import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import type { NextRequest } from "next/server";

export type Rol = "super_admin" | "admin" | "oficinista" | "chofer";

export type Sesion = {
  id: number;
  usuario: string;
  rol: Rol;
};

export const NOMBRE_COOKIE = "toro_sesion";
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

// Se usa un secreto por defecto SOLO para que el proyecto arranque en local
// sin configuración; en producción hay que definir SESSION_SECRET en las
// variables de entorno de Vercel (cualquier cadena larga y aleatoria).
function secreto(): string {
  return process.env.SESSION_SECRET || "dev-secret-cambia-esto-en-produccion";
}

// --- Contraseñas -----------------------------------------------------
// Hash con scrypt (módulo "crypto" nativo de Node, sin dependencias
// externas). Formato almacenado: "salt_hex:hash_hex".
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verificarPassword(password: string, almacenado: string): boolean {
  const [saltHex, hashHex] = almacenado.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const hashGuardado = Buffer.from(hashHex, "hex");
  const hashIntento = scryptSync(password, salt, 64);
  if (hashGuardado.length !== hashIntento.length) return false;
  return timingSafeEqual(hashGuardado, hashIntento);
}

// --- Sesiones (cookie firmada, sin JWT ni dependencias) ---------------
function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("base64url");
}

export function crearTokenSesion(sesion: Sesion): string {
  const datos = { ...sesion, exp: Date.now() + DURACION_SESION_MS };
  const payload = Buffer.from(JSON.stringify(datos)).toString("base64url");
  const firma = firmar(payload);
  return `${payload}.${firma}`;
}

export function leerTokenSesion(token: string | undefined | null): Sesion | null {
  if (!token) return null;
  const [payload, firma] = token.split(".");
  if (!payload || !firma) return null;
  const firmaEsperada = firmar(payload);
  const a = Buffer.from(firma);
  const b = Buffer.from(firmaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const datos = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof datos.exp !== "number" || Date.now() > datos.exp) return null;
    if (!datos.id || !datos.usuario || !datos.rol) return null;
    return { id: datos.id, usuario: datos.usuario, rol: datos.rol };
  } catch {
    return null;
  }
}

/** Para usar dentro de Route Handlers (app/api/.../route.ts). */
export function obtenerSesion(req: NextRequest): Sesion | null {
  return leerTokenSesion(req.cookies.get(NOMBRE_COOKIE)?.value);
}

/** Igual que obtenerSesion, pensado para dejar claro en el endpoint que es obligatoria. */
export async function exigirSesion(req: NextRequest): Promise<Sesion | null> {
  return obtenerSesion(req);
}

// --- Permisos por rol --------------------------------------------------
// admin y oficinista: acceso completo a coches/consignas/exportación.
// super_admin: además de eso, es el único que gestiona usuarios.
// chofer: solo puede dar de alta coches, sin fecha de salida prevista ni
// el resto de acciones de gestión.
export function puedeGestionarCoches(rol: Rol): boolean {
  return rol === "admin" || rol === "oficinista" || rol === "super_admin";
}

export function puedeGestionarUsuarios(rol: Rol): boolean {
  return rol === "super_admin";
}

export function esChofer(rol: Rol): boolean {
  return rol === "chofer";
}
