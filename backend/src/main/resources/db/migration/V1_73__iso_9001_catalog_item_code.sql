-- Código corto del ítem ISO 9001 (p. ej. PRO, MAN, FOR) para número de registro del SGC
ALTER TABLE iso_9001_catalog_items
    ADD COLUMN IF NOT EXISTS item_code VARCHAR(5);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iso9001_catalog_item_code
    ON iso_9001_catalog_items (catalog_code, UPPER(TRIM(item_code)))
    WHERE item_code IS NOT NULL AND TRIM(item_code) <> '';

-- Semilla: asignar código al ejemplo de tipo de documento si aún no tiene
UPDATE iso_9001_catalog_items
SET item_code = 'DOC',
    updated_at = CURRENT_TIMESTAMP
WHERE catalog_code = 'tipo-documento'
  AND LOWER(TRIM(name)) LIKE 'ejemplo%'
  AND (item_code IS NULL OR TRIM(item_code) = '');

UPDATE iso_9001_catalog_items
SET item_code = 'PRO',
    updated_at = CURRENT_TIMESTAMP
WHERE catalog_code = 'proceso'
  AND LOWER(TRIM(name)) LIKE 'ejemplo%'
  AND (item_code IS NULL OR TRIM(item_code) = '');
