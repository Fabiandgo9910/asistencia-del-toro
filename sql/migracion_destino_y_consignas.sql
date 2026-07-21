-- MIGRACIÓN para una base que ya tenías creada (ejecuta cada bloque por
-- separado en el Query editor, igual que hiciste con schema.sql).
-- No borra ni toca los datos que ya tienes.

-- 1. Nueva columna: fecha prevista de salida ("destino")
ALTER TABLE coches ADD COLUMN IF NOT EXISTS fecha_destino DATE;

-- 2. Nueva tabla: varias consignas por coche, cada una con fecha + observación
CREATE TABLE IF NOT EXISTS consignas (
  id           SERIAL PRIMARY KEY,
  coche_id     INTEGER NOT NULL REFERENCES coches(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion  VARCHAR(255)
);

-- 3. Índice para listar rápido las consignas de un coche
CREATE INDEX IF NOT EXISTS idx_consignas_coche ON consignas (coche_id);

-- 4. Si ya tenías fechas guardadas en la antigua columna "consigna" de
--    coches, esto las traslada a la nueva tabla como una primera consigna
--    (con observación vacía) antes de que dejes de usar esa columna.
--    Sáltate este bloque si tu columna "consigna" ya estaba vacía.
INSERT INTO consignas (coche_id, fecha, observacion)
SELECT id, consigna, 'Migrada desde el registro del coche'
FROM coches
WHERE consigna IS NOT NULL;

-- 5. La columna antigua "consigna" de coches ya no se usa. Puedes dejarla
--    (no molesta) o eliminarla una vez confirmes que el paso 4 salió bien:
-- ALTER TABLE coches DROP COLUMN consigna;
