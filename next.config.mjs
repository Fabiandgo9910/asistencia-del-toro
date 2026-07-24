/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nota: este proyecto generaba antes el PDF de exportación con "pdfkit",
  // que carga sus ficheros de fuente (.afm) desde disco en tiempo de
  // ejecución. Eso obligaba a un `outputFileTracingIncludes` para que
  // Vercel empaquetara esos ficheros, y aun así fallaba en producción.
  // Ahora /api/export usa un generador de PDF propio (lib/pdf-lite.ts) que
  // no lee nada del disco, así que ya no hace falta ninguna configuración
  // especial de empaquetado.
};

export default nextConfig;
