-- Categoría de tipo de documento vehicular (grupos de documentación de flota)
-- DOCUMENTOS_PRINCIPALES | CERTIFICACIONES | LIBERACIONES
ALTER TABLE tipo_documento_vehiculos
    ADD COLUMN IF NOT EXISTS category VARCHAR(40);

UPDATE tipo_documento_vehiculos
SET category = 'DOCUMENTOS_PRINCIPALES'
WHERE category IS NULL OR TRIM(category) = '';

ALTER TABLE tipo_documento_vehiculos
    ALTER COLUMN category SET DEFAULT 'DOCUMENTOS_PRINCIPALES';
