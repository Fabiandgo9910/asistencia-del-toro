// Revisión semanal de bases: cada domingo hay que comprobar que la base
// física coincide con la digital. Si no se marca como revisada, el aviso
// se queda visible sin desaparecer (ni al día siguiente, ni a la semana
// siguiente) hasta que se marque — momento en el que vuelve a estar "al
// día" hasta el próximo domingo.

/** Medianoche del domingo más reciente (incluye hoy si hoy es domingo). */
export function inicioSemanaActual(ahora: Date = new Date()): Date {
  const dia = ahora.getDay(); // 0 = domingo, 1 = lunes, ...
  const domingo = new Date(ahora);
  domingo.setHours(0, 0, 0, 0);
  domingo.setDate(domingo.getDate() - dia);
  return domingo;
}

/** true si la base no se ha revisado desde el domingo más reciente. */
export function necesitaRevision(ultimaRevision: string | null, ahora: Date = new Date()): boolean {
  if (!ultimaRevision) return true;
  return new Date(ultimaRevision) < inicioSemanaActual(ahora);
}
