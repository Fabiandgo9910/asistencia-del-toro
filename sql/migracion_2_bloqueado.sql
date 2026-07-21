-- MIGRACIÓN 2 para tu base ya existente. Pégalo entero en la consola de Neon.

ALTER TABLE coches ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false;
