import type { NextRequest } from "next/server";

export type Rol = "super_admin" | "admin" | "oficinista" | "chofer";

export type Sesion = {
  id: number;
  usuario: string;
  rol: Rol;
};

export const NOMBRE_COOKIE = "toro_sesion";
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

// IMPORTANTE: este archivo lo importa tanto el middleware (que Next.js
// ejecuta en el "Edge Runtime", una versión reducida de JavaScript sin el
// módulo "crypto" de Node) como las rutas de API normales (que sí corren
// en Node). Por eso aquí SOLO se usa la Web Crypto API (`crypto.subtle`,
// `TextEncoder`, `atob`/`btoa`), disponible en ambos entornos. El error
// "MIDDLEWARE_INVOCATION_FAILED" que veías salía de aquí: antes este
// archivo importaba `crypto` de Node (para el hash de contraseñas), y al
// quedar incluido en el middleware, Vercel no podía ejecutarlo.
//
// El hash de contraseñas (que sí necesita el "crypto" de Node de verdad)
// vive ahora en lib/password.ts, que solo importan las rutas de login /
// registro / bootstrap — nunca el middleware.

function secreto(): string {
  // Se usa un valor por defecto SOLO para que el proyecto arranque en local
  // sin configuración; en producción hay que definir SESSION_SECRET en las
  // variables de entorno de Vercel (cualquier cadena larga y aleatoria).
  return process.env.SESSION_SECRET || "dev-secret-cambia-esto-en-produccion";
}

function bytesABase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlABytes(b64url: string): Uint8Array {
  const relleno = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + relleno;
  const binario = atob(b64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function claveHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function firmar(payload: string): Promise<string> {
  const clave = await claveHmac();
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(payload));
  return bytesABase64Url(new Uint8Array(firma));
}

async function firmaValida(payload: string, firma: string): Promise<boolean> {
  const clave = await claveHmac();
  return crypto.subtle.verify(
    "HMAC",
    clave,
    base64UrlABytes(firma) as BufferSource,
    new TextEncoder().encode(payload)
  );
}

export async function crearTokenSesion(sesion: Sesion): Promise<string> {
  const datos = { ...sesion, exp: Date.now() + DURACION_SESION_MS };
  const payload = bytesABase64Url(new TextEncoder().encode(JSON.stringify(datos)));
  const firma = await firmar(payload);
  return `${payload}.${firma}`;
}

export async function leerTokenSesion(token: string | undefined | null): Promise<Sesion | null> {
  if (!token) return null;
  const [payload, firma] = token.split(".");
  if (!payload || !firma) return null;

  try {
    if (!(await firmaValida(payload, firma))) return null;
    const json = new TextDecoder().decode(base64UrlABytes(payload));
    const datos = JSON.parse(json);
    if (typeof datos.exp !== "number" || Date.now() > datos.exp) return null;
    if (!datos.id || !datos.usuario || !datos.rol) return null;
    return { id: datos.id, usuario: datos.usuario, rol: datos.rol };
  } catch {
    return null;
  }
}

/** Para usar dentro de Route Handlers (app/api/.../route.ts). */
export async function obtenerSesion(req: NextRequest): Promise<Sesion | null> {
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
