# Asistencia del Toro

Sistema interno de gestión de coches en depósito. Diseñado para que el operario
registre entradas, salidas y auditorías diarias con el mínimo de clics posible.

> **Aviso importante sobre la base de datos:** pediste `@vercel/postgres`, pero
> ese producto fue retirado por Vercel — todas las bases se migraron a **Neon**
> a través del Vercel Marketplace. La pestaña "Storage" de Vercel sigue
> ofreciendo Postgres en un clic, solo que hoy provisiona una base Neon en vez
> de "Vercel Postgres" nativo. El código de este proyecto ya usa el driver
> correcto y actual, `@neondatabase/serverless`, que funciona igual (mismas
> variables de entorno `POSTGRES_URL`, capa gratuita, cero configuración).

---

## Paso 1 — Diseño de interfaz (UX de 1 clic)

Todo vive en una **única pantalla** (`app/page.tsx` → `Dashboard.tsx`), sin
navegación entre páginas, porque cada clic extra es fricción para el operario:

- **Buscador en tiempo real** (`BuscadorBar.tsx`): un único input fijo arriba
  (sticky) que filtra por matrícula o nº de expediente. Usa un debounce de
  200ms para no lanzar una petición por cada tecla, pero sin necesidad de
  pulsar "Buscar". Al vaciarlo, muestra los coches activos más recientes.
- **Botón flotante "+"** (`Dashboard.tsx`): fijo en la esquina inferior
  derecha, siempre visible sin hacer scroll. Abre `NuevaEntradaModal.tsx`,
  que precarga la fecha de hoy y solo exige la matrícula — todo lo demás es
  opcional para no bloquear al operario en el mostrador.
- **"Dar salida" en la propia fila** (`CocheCard.tsx`): un botón que llama a
  `PATCH /api/coches/:id` con `{ accion: "dar_salida" }`. Un clic, sin
  confirmaciones ni pantallas intermedias, registra `NOW()` como
  `fecha_salida`.
- **Switch de presencia** (`CocheCard.tsx`): una píldora "Presente / No está"
  en la misma tarjeta. Al pulsarla, actualiza el estado en pantalla al
  instante (optimistic UI) y en paralelo llama a
  `PATCH /api/coches/:id` con `{ accion: "presencia", valor }`, ideal para
  recorrer el parking marcando coche a coche en la auditoría diaria.
- **Alertas de deuda visibles sin abrir el expediente**: si un coche genera
  penalización, la tarjeta muestra un recuadro rojo suave con el importe y
  los días extra, calculado directamente en la consulta SQL.

Un detalle de identidad visual: la matrícula se muestra como una pequeña
placa con la franja azul "E", para que el operario la reconozca de un
vistazo entre una lista larga, igual que reconocería el coche físico.

---

## Paso 2 — Configuración e instalación

```bash
npx create-next-app@latest asistencia-del-toro --typescript --tailwind --app --no-src-dir
cd asistencia-del-toro
npm install @neondatabase/serverless lucide-react xlsx
```

(Si usas el código de este paquete tal cual, sáltate `create-next-app` y solo
ejecuta `npm install` dentro de la carpeta ya generada.)

### `.env.local`

Copia `.env.local.example` a `.env.local`. En desarrollo real, no rellenes
estos valores a mano: en el Paso 4 verás cómo Vercel los genera y los puedes
descargar con `vercel env pull .env.local`.

```
POSTGRES_URL="postgres://usuario:contraseña@host/verceldb?sslmode=require"
CRON_SECRET="un-valor-aleatorio-largo"
```

---

## Paso 3 — Código clave e implementación

### 3.1 Tabla en Postgres (`sql/schema.sql`)

Ejecútalo en Storage → tu base → **Query** dentro del panel de Vercel/Neon.
Crea la tabla `coches`, índices para que la búsqueda por matrícula/expediente
sea instantánea, y un trigger que fuerza mayúsculas en la matrícula pase lo
que pase (aunque el backend ya la normaliza).

Sobre la **retención de 365 días** que pediste como "trigger": un trigger de
Postgres solo puede reaccionar a un `INSERT`/`UPDATE`/`DELETE`, nunca al mero
paso del tiempo — no hay forma de que "se dispare solo" cuando un registro
cumple un año sin que nada lo toque. La solución correcta (y la que usan en
producción proyectos con Vercel) es: una función SQL `limpiar_registros_antiguos()`
que hace el `DELETE`, invocada una vez al día por un **Vercel Cron Job**.

### 3.2 Conexión y cálculo de custodia (`lib/db.ts`)

La consulta central (`SELECT_CON_CALCULO`) calcula en la propia base de
datos, para cada coche:

- `dias_totales`: `fecha_salida` si ya salió, o `NOW()` si sigue activo,
  menos `fecha_entrada`.
- `dias_extra`: `dias_totales - 12`, nunca negativo.
- `penalizacion`: `dias_extra * 13`.

Así el frontend nunca tiene que replicar la regla de negocio: el número que
ve el operario es siempre el que calculó la base de datos. La misma fórmula
también vive en `lib/penalizacion.ts` por si necesitas mostrarla en el
cliente sin pedirla al servidor (por ejemplo, un contador que suba cada
medianoche sin refrescar la página).

### 3.3 Endpoints

| Ruta | Método | Uso |
|---|---|---|
| `/api/coches?q=` | GET | Búsqueda en tiempo real / listado |
| `/api/coches` | POST | Registrar nueva entrada |
| `/api/coches/:id` | PATCH | Dar salida, marcar presencia, o editar campos |
| `/api/export?q=` | GET | Descarga `.xlsx`, filtrado si se pasa `q` |
| `/api/cron/limpieza` | GET (protegido) | Purga registros de +365 días, la llama Vercel Cron |

### 3.4 Dashboard (`components/Dashboard.tsx` + `CocheCard.tsx`)

Tailwind con fondo gris muy suave (`#F7F7F8`), tarjetas blancas con sombra
apenas perceptible, y el rojo corporativo (`#C81D2A`) reservado a tres sitios
concretos: el botón de nueva entrada, el aviso de deuda, y el hover del botón
"Salida" — nunca como color de fondo masivo, tal y como pediste.

---

## Paso 4 — Despliegue paso a paso

1. Sube el proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com), **Add New → Project** e importa ese
   repositorio.
3. Antes o después del primer deploy, ve a la pestaña **Storage** del
   proyecto → **Create Database** → elige **Postgres** (integración Neon) →
   se enlaza automáticamente y Vercel rellena `POSTGRES_URL` y variables
   asociadas por ti.
4. Añade manualmente la variable `CRON_SECRET` en **Settings → Environment
   Variables** (cualquier cadena aleatoria larga).
5. Entra en el editor "Query" de esa base (dentro de Storage) y pega el
   contenido de `sql/schema.sql` para crear la tabla.
6. Haz *redeploy* para que el build recoja las variables de entorno. El
   `vercel.json` ya incluido registra el Cron Job de limpieza diaria sin
   pasos adicionales.
7. Abre la URL del proyecto: ya tienes el dashboard operativo.

---

## Paso 5 — Autenticación y roles

El sistema exige iniciar sesión (usuario/correo + contraseña) para entrar.
Hay 4 roles:

| Rol | Puede |
|---|---|
| `chofer` | Solo registrar entradas de coches (botón +). **No** puede fijar la fecha de salida prevista, editar, dar salida, ver/añadir consignas ni exportar. |
| `oficinista` | Todo sobre coches: alta, edición, dar salida, consignas, exportar. |
| `admin` | Igual que oficinista. |
| `super_admin` | Igual que admin/oficinista, y además es el único que aprueba, rechaza y cambia el rol de cualquier cuenta desde `/admin/usuarios`. |

Cualquiera puede pedir una cuenta desde `/registro`, pero queda **pendiente
de aprobación** hasta que un `super_admin` la revise. Por eso hace falta
crear el primer `super_admin` a mano, una sola vez:

```bash
curl -X POST https://tu-dominio.vercel.app/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-setup-secret: EL_VALOR_DE_SETUP_SECRET" \
  -d '{"usuario":"admin","correo":"fdgo.9910@gmai..com","password":"Cidro.2026*"}'
```

Ese endpoint se autobloquea en cuanto existe un `super_admin` en la base de
datos (aunque se conozca `SETUP_SECRET`), así que solo funciona la primera
vez. A partir de ahí, entra en `/login` y aprueba al resto desde el icono
de "Usuarios" (solo visible para `super_admin`).

No hace falta ninguna librería de autenticación externa: las contraseñas
se guardan con `scrypt` y las sesiones son cookies firmadas con HMAC —
ambas cosas usan el módulo `crypto` que ya trae Node, así que no añaden
dependencias ni puntos de fallo extra.

Ejecuta `sql/migracion_usuarios.sql` en la base de datos (igual que
`sql/schema.sql`) antes de usar el sistema.

---

## Paso 6 — Sobre la exportación (PDF)

`/api/export` genera el PDF con un motor propio (`lib/pdf-lite.ts`), sin
ninguna librería externa. Antes usaba `pdfkit`, que lee sus ficheros de
fuente `.afm` desde disco en tiempo de ejecución — eso es justo lo que
fallaba en producción (y por lo que `/api/export` devolvía un JSON de
error en vez del PDF): el "file tracing" de Vercel no siempre empaqueta
esos ficheros, y además el paquete `pdfkit` no estaba correctamente
instalado en este proyecto (no figuraba en `package-lock.json`). El nuevo
motor no lee nada del disco ni depende de ningún paquete, así que esa
clase de fallo ya no puede volver a ocurrir.

---

```
app/
  page.tsx                     Dashboard (server component wrapper)
  layout.tsx
  globals.css
  api/
    coches/route.ts            GET (buscar) / POST (crear)
    coches/[id]/route.ts       PATCH (salida / presencia / editar)
    export/route.ts            GET .xlsx
    cron/limpieza/route.ts     GET protegido, retención 365 días
components/
  Dashboard.tsx
  BuscadorBar.tsx
  CocheCard.tsx
  NuevaEntradaModal.tsx
  MatriculaBadge.tsx
lib/
  db.ts                        Queries + cálculo de custodia en SQL
  penalizacion.ts              Misma fórmula, reutilizable en cliente
types/coche.ts
sql/schema.sql
vercel.json                    Cron diario de limpieza
```

## Notas / próximos pasos sugeridos

- El modal de nueva entrada no incluye aún los campos de traslado, empresa de
  traslado y consigna, para mantener el registro rápido a un solo clic; esos
  campos existen en la tabla y se pueden editar abriendo el expediente (el
  endpoint `PATCH` ya los admite todos). Si los quieres también en el alta
  rápida, es una ampliación directa del modal.
- Faltaría añadir autenticación (por ejemplo con NextAuth o Vercel Access) si
  el sistema va a estar expuesto públicamente y no solo en red interna.
