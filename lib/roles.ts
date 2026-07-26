export type Rol = "super_admin" | "admin" | "oficinista" | "chofer";

export const ROLES_VALIDOS: Rol[] = ["super_admin", "admin", "oficinista", "chofer"];

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
