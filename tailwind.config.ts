import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        toro: {
          red: "#C81D2A",       // rojo corporativo, uso puntual (CTA/alertas)
          redDark: "#9E141F",
          ink: "#1C1C1E",       // texto principal
          slate: "#5B5D63",     // texto secundario
          line: "#E7E7E9",      // bordes
          surface: "#FFFFFF",
          bg: "#F7F7F8",        // fondo general, gris muy suave
          ok: "#3F7D52",        // verde apagado, presencia confirmada
          okBg: "#EAF3EC",
          warnBg: "#FBEAEA",
          amber: "#8A6116",     // texto de aviso "próximo a vencer" (amarillo/ámbar)
          amberBg: "#FBF2DA",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,28,30,0.04), 0 1px 1px rgba(28,28,30,0.03)",
      },
    },
  },
  plugins: [],
};
export default config;
