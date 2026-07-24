import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Aislado de lib/auth.ts a propósito: este archivo usa el módulo "crypto"
// real de Node (scrypt), que NO está disponible en el Edge Runtime donde
// corre middleware.ts. Solo lo importan las rutas de login/registro/
// bootstrap, que siempre se ejecutan como funciones Node normales.

// Formato almacenado: "salt_hex:hash_hex".
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
