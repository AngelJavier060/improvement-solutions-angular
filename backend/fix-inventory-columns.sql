-- Script para agregar columnas faltantes en inventory_products
-- Ejecuta esto en MySQL si la migración Flyway no se aplicó

-- Verificar columnas actuales:
-- DESCRIBE inventory_products;

-- Agregar columnas si no existen (MySQL ignora si ya existen con IF NOT EXISTS en versiones recientes)
-- Para versiones antiguas de MySQL, ejecuta solo si DESCRIBE no muestra estas columnas

ALTER TABLE inventory_products
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100) NULL AFTER name,
  ADD COLUMN IF NOT EXISTS model VARCHAR(100) NULL AFTER brand,
  ADD COLUMN IF NOT EXISTS specs_json TEXT NULL AFTER description,
  ADD COLUMN IF NOT EXISTS certifications_json TEXT NULL AFTER specs_json;

-- Para inventory_categories (jerarquía)
ALTER TABLE inventory_categories
  ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS level INT NULL DEFAULT 1 AFTER parent_id;

-- Agregar constraints e índices solo si no existen
-- (Ignora el error si ya existen)
ALTER TABLE inventory_categories
  ADD CONSTRAINT fk_inventory_categories_parent
  FOREIGN KEY (parent_id) REFERENCES inventory_categories(id);

CREATE INDEX IF NOT EXISTS idx_inventory_categories_parent ON inventory_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_level ON inventory_categories(level);

SELECT 'Columnas agregadas exitosamente' AS status;
