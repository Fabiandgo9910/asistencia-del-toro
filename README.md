# Asistencia del Toro

Sistema interno de gestión de coches en depósito. Diseñado para que el operario
registre entradas, salidas y auditorías diarias con el mínimo de clics posible.

**Toda la app corre sobre Supabase**: la base de datos (Postgres) y la
autenticación (Supabase Auth) viven ahí. Ya no hace falta Neon ni ningún
Cron Job de Vercel. Los registros no se borran nunca solos — la retención
es indefinida, a propósito.

---

## Puesta en marcha

### 1. Crear el proyecto en Supabase

Crea un proyecto en [supabase.com](https://supabase.com). En **Settings → API**
copia:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** (o **anon key**, si tu proyecto usa el nombre clásico)
  → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **Secret key** (o **service_role key**) → `SUPABASE_SECRET_KEY` (o
  `SUPABASE_SERVICE_ROLE_KEY`)

El código acepta cualquiera de los dos nombres (ver `lib/supabase/env.ts`),
así que no importa cuál te muestre tu proyecto.

### 2. Ejecutar la migración SQL

**Dashboard de Supabase → SQL Editor → New query**, pega todo el contenido de
`supabase/migracion.sql` y dale a **Run**. Esto crea:

- `perfiles` (usuario/rol/aprobado, enlazado 1:1 con `auth.users`) y el
  trigger que crea automáticamente el perfil al registrarse.
- `coches` y `consignas`, con Row Level Security ya configurada según los
  roles.
- La vista `coches_calculado`, que resuelve en SQL los días de custodia, la
  penalización y si está a punto de vencer.
- No crea ninguna limpieza automática: los registros se guardan sin límite
  de tiempo.

### 3. Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena los valores del paso 1,
más `SETUP_SECRET` (cualquier cadena aleatoria larga — la usarás una sola vez
en el paso siguiente). En Vercel, añádelas en **Settings → Environment
Variables** y haz un *redeploy* después.

### 4. Crear el primer super admin

Nadie puede registrarse como `super_admin` desde `/registro` — por diseño, es
quien aprueba al resto. La primera cuenta se crea llamando una sola vez a:

```bash
curl -X POST https://tu-dominio.vercel.app/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-setup-secret: EL_VALOR_DE_SETUP_SECRET" \
  -d '{"usuario":"admin","correo":"tu@correo.com","password":"unacontraseñasegura"}'
```

(En Windows/PowerShell, usa `Invoke-RestMethod` o `curl.exe` — `curl` a
secas en PowerShell es un alias distinto que no entiende esta sintaxis.)

Ese endpoint se autobloquea en cuanto ya existe un `super_admin`, así que solo
funciona la primera vez. A partir de ahí, entra en `/login`.

---

## Roles

| Rol | Puede |
|---|---|
| `chofer` | Solo registrar entradas de coches (botón +). **No** puede fijar la fecha de salida prevista, editar, dar salida, ver/añadir consignas ni exportar. |
| `oficinista` | Todo sobre coches: alta, edición, dar salida, consignas, exportar. |
| `admin` | Igual que oficinista. |
| `super_admin` | Igual que admin/oficinista, y además es el único que aprueba, edita, cambia el rol o elimina cualquier cuenta desde `/admin/usuarios`. |

Cualquiera puede pedir una cuenta desde `/registro`, pero queda **pendiente de
aprobación** hasta que un `super_admin` la revise desde `/admin/usuarios`
(esa página se actualiza sola cada pocos segundos, no hace falta refrescar).

**¿Cómo tener varios super admins?** No hace falta volver a usar el endpoint
de arranque (se bloquea a propósito tras la primera vez). Aprueba o edita a
la persona en `/admin/usuarios` y cámbiale el rol a **Super admin** — se pide
una confirmación extra antes de aplicarlo, porque ese rol puede gestionar a
cualquier otro usuario, incluidos otros super admins.

### Sobre el registro y la confirmación de correo

El registro (`/api/auth/registro`) crea la cuenta directamente con la Admin
API de Supabase y el correo ya marcado como confirmado (`email_confirm:
true`). Esto es intencional: si en vez de eso se usara
`supabase.auth.signUp()` desde el navegador (el método "normal" de
Supabase), la cuenta quedaría bloqueada hasta que la persona hiciera clic en
un correo de confirmación — y sin un SMTP propio configurado en el proyecto,
ese correo puede tardar, no llegar o caer en spam. El resultado habría sido
que, aunque un `super_admin` aprobara la cuenta, el login seguiría fallando
con "Email not confirmed" sin que nada en la pantalla explicara por qué.
Con este enfoque, el único requisito para entrar es la aprobación manual,
que es la que de verdad controláis vosotros.

### Recuperación de contraseña

Hay dos vías:

1. **Autoservicio por correo** (`/recuperar`): usa
   `supabase.auth.resetPasswordForEmail`, el flujo estándar de Supabase. Para
   que estos correos lleguen de forma fiable en producción, configura un SMTP
   propio en **Supabase → Authentication → Settings → SMTP** — el servicio de
   email por defecto de Supabase es solo para pruebas y tiene un límite muy
   bajo de envíos por hora.
2. **Manual, por el super admin** (`/admin/usuarios`, icono de llave): no
   depende de que llegue ningún correo. Útil mientras no tengas SMTP propio
   configurado, o como respaldo si el correo de la persona no es fiable.

---

## Sobre la exportación (PDF)

`/api/export` genera el PDF con un motor propio (`lib/pdf-lite.ts`), sin
ninguna librería externa ni acceso a disco (antes usaba `pdfkit`, que leía
sus ficheros de fuente `.afm` desde disco en tiempo de ejecución — eso es
justo lo que fallaba de forma intermitente en producción). El botón se llama
**"Hoja de base"** en la barra de búsqueda.

---

## Notas técnicas

- **RLS como segunda barrera**: además de las comprobaciones de rol en cada
  ruta (`app/api/...`), las tablas `coches`, `consignas` y `perfiles` tienen
  Row Level Security activada (ver `supabase/migracion.sql`). Aunque una
  ruta tuviera un fallo, la base de datos igualmente rechazaría una
  operación no permitida para ese rol.
- **`lib/supabase/admin.ts`** usa la clave secreta y se salta la RLS por
  completo — solo se importa desde rutas de servidor, nunca desde
  componentes `"use client"`, y siempre después de comprobar que quien llama
  es `super_admin`.
- **`middleware.ts`** corre en el Edge Runtime de Vercel (un JavaScript
  reducido sin el módulo `crypto` de Node). Por eso toda la lógica de sesión
  usa exclusivamente la Web Crypto API / el SDK de Supabase, que funcionan
  igual en Edge que en Node — nada de este proyecto depende de `crypto` de
  Node en ningún archivo que el middleware pueda importar.
- Si alguna vez ves un build roto por `package-lock.json` desincronizado
  (por ejemplo, tras añadir o quitar una dependencia a mano en
  `package.json`), bórralo y deja que `npm install` lo regenere — es más
  seguro que arrastrar un lockfile que no coincide con las dependencias
  reales.

---

## Estructura del proyecto

```
app/
  page.tsx                        Dashboard (server component wrapper)
  login/page.tsx
  registro/page.tsx
  recuperar/page.tsx               Pedir enlace de recuperación por correo
  actualizar-password/page.tsx     Elegir contraseña nueva (tras el enlace)
  pendiente/page.tsx                Cuenta creada, a la espera de aprobación
  admin/usuarios/page.tsx           Aprobar / editar / cambiar rol / eliminar
  auth/callback/route.ts            Intercambia el "code" de los enlaces de Supabase por una sesión
  api/
    auth/registro/route.ts          Crea la cuenta (Admin API, sin depender de email)
    auth/bootstrap/route.ts         Crea el primer super_admin
    auth/resolver-usuario/route.ts  Permite entrar con "usuario" además de correo
    admin/usuarios/route.ts         Listado completo (solo super_admin)
    admin/usuarios/[id]/route.ts    Aprobar / editar / rol / reset password / eliminar
    coches/route.ts                 GET (buscar) / POST (crear)
    coches/[id]/route.ts            PATCH (salida / presencia / editar) / DELETE
    coches/[id]/consignas/route.ts
    consignas/[id]/route.ts
    export/route.ts                 GET → PDF ("Hoja de base")
components/
  Dashboard.tsx, CocheCard.tsx, BuscadorBar.tsx, ...
lib/
  sesion.ts                        obtenerSesionActual(): quién es y qué rol tiene
  roles.ts                         Reglas de permisos por rol
  db.ts                            Queries de coches/consignas contra Supabase
  pdf-lite.ts                      Generador de PDF propio, sin dependencias
  supabase/
    server.ts, client.ts, admin.ts, env.ts
middleware.ts                       Protege páginas y aplica el gate de aprobación
supabase/migracion.sql               Todo el esquema: tablas, RLS, triggers
supabase/migracion_quitar_presencia.sql  Solo si venías de una versión con "presente"/revisión
supabase/migracion_v3.sql           Bases, tipo de vehículo, plaza con letras, traslado previsto, consignas editables, aviso a 5 días
supabase/migracion_sin_limite.sql   Quita el cron de limpieza automática: retención sin límite
supabase/migracion_revision_base.sql  Aviso semanal de revisión de bases (domingos) + interruptor global
supabase/migracion_furgon.sql       Añade "furgón" como tipo de vehículo válido
supabase/migracion_salida_temporal.sql  Control de salida/regreso temporal por vehículo (con motivo)
types/coche.ts
```
