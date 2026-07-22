/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit carga sus archivos de fuente (.afm) desde disco en tiempo de
  // ejecución (no con `import`), así que el rastreador de archivos de
  // Vercel no los detecta solo y los deja fuera del paquete serverless.
  // Sin esto, /api/export funciona en local pero falla en producción.
  experimental: {
    outputFileTracingIncludes: {
      "/api/export": ["./node_modules/pdfkit/js/data/**/*"],
    },
  },
};

export default nextConfig;
