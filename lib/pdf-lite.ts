// Generador de PDF mínimo, sin dependencias externas.
//
// POR QUÉ EXISTE ESTE ARCHIVO (y no se usa "pdfkit"):
// pdfkit necesita leer en tiempo de ejecución sus ficheros de métricas de
// fuente (.afm) desde disco con fs.readFileSync(__dirname + ...). En Vercel
// (funciones serverless) el "file tracing" que empaqueta el proyecto no
// siempre incluye esos ficheros aunque se declaren en
// `experimental.outputFileTracingIncludes`, y cuando faltan, la generación
// del PDF lanza una excepción que el endpoint capturaba y devolvía como
// `{ "error": "Error al exportar" }` — el JSON de error que veías en vez
// del PDF. Además, en este proyecto "pdfkit" ni siquiera estaba instalado
// correctamente (no figuraba en package-lock.json), así que fallaba también
// en local.
//
// Solución: un generador de PDF propio, en TypeScript puro, que no lee nada
// del disco ni depende de ningún paquete. Solo usa las fuentes estándar de
// PDF (Helvetica / Helvetica-Bold), que todos los lectores de PDF traen
// incorporadas por especificación — no hace falta ni instalarlas ni
// empaquetarlas. Cero disco, cero dependencias, cero forma de que esto
// vuelva a fallar por un problema de empaquetado.

type Estilo = "regular" | "negrita";

// Anchuras de los glifos de Helvetica (unidades por 1000, estándar Adobe).
// Se usan solo para calcular cuánto texto cabe en cada celda (recorte con
// "…"), no afectan a cómo se ve la fuente real, que dibuja el lector de PDF.
const ANCHOS_HELVETICA: Record<number, number> = {
  32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191,
  40: 333, 41: 333, 42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278,
  48: 556, 49: 556, 50: 556, 51: 556, 52: 556, 53: 556, 54: 556, 55: 556,
  56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584, 62: 584, 63: 556,
  64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
  72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778,
  80: 667, 81: 778, 82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944,
  88: 667, 89: 667, 90: 611, 91: 278, 92: 278, 93: 278, 94: 469, 95: 556,
  96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556, 102: 278, 103: 556,
  104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
  111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556,
  118: 500, 119: 722, 120: 500, 121: 500, 122: 500, 123: 334, 124: 260,
  125: 334, 126: 584,
  // Acentos y símbolos españoles habituales (WinAnsiEncoding / CP1252)
  128: 556, // €
  161: 278, // ¡
  191: 556, // ¿
  193: 667, 201: 667, 205: 278, 211: 778, 218: 722, 220: 722, 209: 722, // ÁÉÍÓÚÜÑ
  225: 556, 233: 556, 237: 222, 243: 556, 250: 556, 252: 556, 241: 556, // áéíóúüñ
};
const ANCHO_DEFECTO = 556;

function anchoTexto(texto: string, tamano: number, estilo: Estilo): number {
  let unidades = 0;
  for (let i = 0; i < texto.length; i++) {
    unidades += ANCHOS_HELVETICA[texto.charCodeAt(i)] ?? ANCHO_DEFECTO;
  }
  // La negrita es algo más ancha; se sobreestima un poco a propósito para
  // no arriesgarse a que el texto real desborde la celda.
  const factor = estilo === "negrita" ? 1.08 : 1;
  return (unidades / 1000) * tamano * factor;
}

/** Recorta el texto con "…" para que quepa en `anchoMax` puntos. */
export function recortarTexto(
  texto: string,
  anchoMax: number,
  tamano: number,
  estilo: Estilo = "regular"
): string {
  if (texto === "") return texto;
  if (anchoTexto(texto, tamano, estilo) <= anchoMax) return texto;
  let recorte = texto;
  while (recorte.length > 0 && anchoTexto(recorte + "…", tamano, estilo) > anchoMax) {
    recorte = recorte.slice(0, -1);
  }
  return recorte.length === 0 ? "…" : recorte + "…";
}

// Convierte un string JS a bytes WinAnsiEncoding (≈ CP1252). Todos los
// caracteres españoles habituales (áéíóúñü¿¡ y mayúsculas) coinciden en el
// mismo código de byte que en Latin-1, salvo el símbolo €, que se traduce
// a mano al byte 0x80 que usa WinAnsi/CP1252.
function bytesWinAnsi(texto: string): Buffer {
  const normalizado = texto
    .replace(/€/g, "\u0080")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "\u0085");
  const bytes = Buffer.alloc(normalizado.length);
  for (let i = 0; i < normalizado.length; i++) {
    const code = normalizado.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f; // fallback '?' si algo se escapa
  }
  return bytes;
}

// Escapa paréntesis y barras invertidas, obligatorio dentro de un string
// literal "(...)" del formato PDF.
function escaparPdf(bytes: Buffer): Buffer {
  const out: number[] = [];
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) out.push(0x5c);
    out.push(b);
  }
  return Buffer.from(out);
}

const n = (num: number) => (Math.round(num * 100) / 100).toString();

class PaginaPdf {
  private trozos: Buffer[] = [];
  constructor(public readonly ancho: number, public readonly alto: number) {}

  private escribir(s: string) {
    this.trozos.push(Buffer.from(s, "ascii"));
  }

  /** Rectángulo con solo borde. `yArriba` = distancia desde el borde superior. */
  rectangulo(x: number, yArriba: number, w: number, h: number) {
    const yPdf = this.alto - yArriba - h;
    this.escribir(`${n(x)} ${n(yPdf)} ${n(w)} ${n(h)} re S\n`);
  }

  /** Rectángulo relleno de gris (0 = negro, 1 = blanco). */
  rectanguloRelleno(x: number, yArriba: number, w: number, h: number, gris: number) {
    const yPdf = this.alto - yArriba - h;
    this.escribir(`${n(gris)} g\n${n(x)} ${n(yPdf)} ${n(w)} ${n(h)} re f\n0 g\n`);
  }

  /** Texto con línea base en `yBaseArriba` (distancia desde arriba). */
  texto(valor: string, x: number, yBaseArriba: number, tamano: number, estilo: Estilo) {
    const fuente = estilo === "negrita" ? "F2" : "F1";
    const yPdf = this.alto - yBaseArriba;
    this.escribir(`BT /${fuente} ${n(tamano)} Tf ${n(x)} ${n(yPdf)} Td `);
    const bytes = escaparPdf(bytesWinAnsi(valor));
    this.trozos.push(Buffer.from("(", "ascii"), bytes, Buffer.from(") Tj ET\n", "ascii"));
  }

  buffer(): Buffer {
    return Buffer.concat(this.trozos);
  }
}

export class DocumentoPdf {
  readonly paginas: PaginaPdf[] = [];
  constructor(public readonly ancho = 841.89, public readonly alto = 595.28) {
    this.nuevaPagina();
  }

  get actual(): PaginaPdf {
    return this.paginas[this.paginas.length - 1];
  }

  nuevaPagina(): PaginaPdf {
    const p = new PaginaPdf(this.ancho, this.alto);
    this.paginas.push(p);
    return p;
  }

  build(): Buffer {
    const CATALOGO = 1;
    const PAGES = 2;
    const FUENTE_REGULAR = 3;
    const FUENTE_NEGRITA = 4;
    let siguiente = 5;

    const objetos: { num: number; body: Buffer }[] = [];
    const numsPagina: number[] = [];

    for (const pagina of this.paginas) {
      const numContenido = siguiente++;
      const numPagina = siguiente++;
      numsPagina.push(numPagina);

      const stream = pagina.buffer();
      objetos.push({
        num: numContenido,
        body: Buffer.concat([
          Buffer.from(`${numContenido} 0 obj\n<< /Length ${stream.length} >>\nstream\n`, "ascii"),
          stream,
          Buffer.from(`\nendstream\nendobj\n`, "ascii"),
        ]),
      });

      objetos.push({
        num: numPagina,
        body: Buffer.from(
          `${numPagina} 0 obj\n<< /Type /Page /Parent ${PAGES} 0 R /MediaBox [0 0 ${n(
            this.ancho
          )} ${n(this.alto)}] /Resources << /Font << /F1 ${FUENTE_REGULAR} 0 R /F2 ${FUENTE_NEGRITA} 0 R >> >> /Contents ${numContenido} 0 R >>\nendobj\n`,
          "ascii"
        ),
      });
    }

    objetos.push({
      num: CATALOGO,
      body: Buffer.from(`${CATALOGO} 0 obj\n<< /Type /Catalog /Pages ${PAGES} 0 R >>\nendobj\n`, "ascii"),
    });
    objetos.push({
      num: PAGES,
      body: Buffer.from(
        `${PAGES} 0 obj\n<< /Type /Pages /Kids [${numsPagina
          .map((x) => `${x} 0 R`)
          .join(" ")}] /Count ${numsPagina.length} >>\nendobj\n`,
        "ascii"
      ),
    });
    objetos.push({
      num: FUENTE_REGULAR,
      body: Buffer.from(
        `${FUENTE_REGULAR} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
        "ascii"
      ),
    });
    objetos.push({
      num: FUENTE_NEGRITA,
      body: Buffer.from(
        `${FUENTE_NEGRITA} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`,
        "ascii"
      ),
    });

    objetos.sort((a, b) => a.num - b.num);

    const header = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "binary");
    const partes: Buffer[] = [header];
    const offsets: number[] = [0];
    let offset = header.length;

    for (const o of objetos) {
      offsets[o.num] = offset;
      partes.push(o.body);
      offset += o.body.length;
    }

    const total = objetos.length + 1;
    let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) {
      xref += `${String(offsets[i] ?? 0).padStart(10, "0")} 00000 n \n`;
    }
    const trailer = `trailer\n<< /Size ${total} /Root ${CATALOGO} 0 R >>\nstartxref\n${offset}\n%%EOF`;
    partes.push(Buffer.from(xref + trailer, "ascii"));

    return Buffer.concat(partes);
  }
}

/** Dibuja una fila de tabla con bordes en todas las celdas. Devuelve el `y` (desde arriba) tras la fila. */
export function dibujarFila(
  pagina: PaginaPdf,
  yArriba: number,
  valores: string[],
  columnas: { titulo: string; ancho: number; align?: "left" | "center" }[],
  x0: number,
  opciones: { negrita?: boolean; relleno?: boolean; alturaFila?: number } = {}
): number {
  const { negrita = false, relleno = false, alturaFila = 18 } = opciones;
  let x = x0;

  if (relleno) {
    const anchoTotal = columnas.reduce((s, c) => s + c.ancho, 0);
    pagina.rectanguloRelleno(x0, yArriba, anchoTotal, alturaFila, 0.906);
  }

  const estilo: Estilo = negrita ? "negrita" : "regular";
  const tamano = 8;

  columnas.forEach((col, i) => {
    pagina.rectangulo(x, yArriba, col.ancho, alturaFila);
    const align = col.align ?? "center";
    const valorCrudo = valores[i] ?? "";
    const valor = recortarTexto(valorCrudo, col.ancho - 6, tamano, estilo);
    const w = anchoTexto(valor, tamano, estilo);
    const tx = align === "left" ? x + 3 : x + (col.ancho - w) / 2;
    const baseline = yArriba + alturaFila / 2 + tamano * 0.32;
    pagina.texto(valor, tx, baseline, tamano, estilo);
    x += col.ancho;
  });

  return yArriba + alturaFila;
}
