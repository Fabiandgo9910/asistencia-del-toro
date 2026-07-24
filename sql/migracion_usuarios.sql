-- Sistema de autenticación con roles.
-- Ejecutar en la pestaña "Query" de Neon/Vercel, igual que sql/schema.sql.

CREATE TABLE IF NOT EXISTS usuarios (
  id                SERIAL PRIMARY KEY,
  usuario           VARCHAR(60) NOT NULL UNIQUE,
  correo            VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  -- super_admin: único rol que aprueba/gestiona usuarios.
  -- admin / oficinista: acceso completo a coches, consignas y exportación.
  -- chofer: solo puede registrar entradas de coches (sin fecha de salida).
  rol               VARCHAR(20) NOT NULL DEFAULT 'chofer'
                    CHECK (rol IN ('super_admin', 'admin', 'oficinista', 'chofer')),
  aprobado          BOOLEAN NOT NULL DEFAULT false,
  creado_en         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios (LOWER(usuario));
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios (LOWER(correo));

-- NOTA sobre el primer super admin:
-- Nadie puede auto-registrarse como super_admin (por diseño: es quien
-- aprueba al resto). La primera cuenta super_admin se crea llamando una
-- sola vez a POST /api/auth/bootstrap con la cabecera
-- "x-setup-secret: <valor de SETUP_SECRET>" mientras no exista ya ningún
-- super_admin en esta tabla. Después de usarla una vez, ese endpoint queda
-- bloqueado automáticamente para siempre (ver app/api/auth/bootstrap/route.ts).
