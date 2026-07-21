-- Ejecutar en la pestaña "Query" de Vercel Postgres (Storage -> tu base -> Data -> Query)

CREATE TABLE IF NOT EXISTS coches (
  id                 SERIAL PRIMARY KEY,
  plaza              INTEGER,
  fecha_entrada      DATE NOT NULL DEFAULT CURRENT_DATE,
  tiene_llave        BOOLEAN NOT NULL DEFAULT false,
  esta_calcinado     BOOLEAN NOT NULL DEFAULT false,
  traslado           VARCHAR(255),
  empresa_traslado   VARCHAR(255),
  fecha_traslado     DATE,
  fecha_destino      DATE, -- fecha PREVISTA de salida (aún no ha salido, pero ya tiene destino asignado)
  bloqueado          BOOLEAN NOT NULL DEFAULT false,
  matricula          VARCHAR(20) NOT NULL,
  modelo             VARCHAR(120),
  numero_expediente  VARCHAR(80),
  fecha_salida       TIMESTAMP,
  observaciones      TEXT,
  ultima_revision    TIMESTAMP,
  check_presencia    BOOLEAN NOT NULL DEFAULT true
);

-- Consignas: un coche puede tener varias a lo largo del tiempo, cada una
-- con su propia fecha y una pequeña observación (sustituye a la antigua
-- columna única "consigna" de coches).
CREATE TABLE IF NOT EXISTS consignas (
  id           SERIAL PRIMARY KEY,
  coche_id     INTEGER NOT NULL REFERENCES coches(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion  VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_consignas_coche ON consignas (coche_id);

-- Búsquedas rápidas por matrícula / expediente (buscador en tiempo real)
CREATE INDEX IF NOT EXISTS idx_coches_matricula ON coches (matricula);
CREATE INDEX IF NOT EXISTS idx_coches_expediente ON coches (numero_expediente);
CREATE INDEX IF NOT EXISTS idx_coches_activos ON coches (fecha_salida) WHERE fecha_salida IS NULL;

-- Matrícula siempre en mayúsculas, se guarde como se guarde
CREATE OR REPLACE FUNCTION mayusculas_matricula()
RETURNS TRIGGER AS $$
BEGIN
  NEW.matricula := UPPER(NEW.matricula);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mayusculas_matricula ON coches;
CREATE TRIGGER trg_mayusculas_matricula
BEFORE INSERT OR UPDATE ON coches
FOR EACH ROW EXECUTE FUNCTION mayusculas_matricula();

-- NOTA sobre la retención de 365 días:
-- Un trigger de Postgres solo se dispara con INSERT/UPDATE/DELETE, nunca por
-- el simple paso del tiempo, así que no puede "vigilar" fechas por sí solo.
-- La función de limpieza vive aquí, pero quien la ejecuta a diario es un
-- Vercel Cron Job (ver vercel.json + app/api/cron/limpieza/route.ts).
CREATE OR REPLACE FUNCTION limpiar_registros_antiguos()
RETURNS INTEGER AS $$
DECLARE
  filas_borradas INTEGER;
BEGIN
  DELETE FROM coches WHERE fecha_entrada < (CURRENT_DATE - INTERVAL '365 days');
  GET DIAGNOSTICS filas_borradas = ROW_COUNT;
  RETURN filas_borradas;
END;
$$ LANGUAGE plpgsql;

-- Se puede probar manualmente con:
-- SELECT limpiar_registros_antiguos();
