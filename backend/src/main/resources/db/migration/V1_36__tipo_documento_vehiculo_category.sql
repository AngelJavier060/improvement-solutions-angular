-- Categoría de tipo de documento vehicular (grupos de documentación de flota)
ALTER TABLE tipo_documento_vehiculos
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'DOCUMENTOS_PRINCIPALES';

UPDATE tipo_documento_vehiculos
SET category = 'DOCUMENTOS_PRINCIPALES'
WHERE category IS NULL OR TRIM(category) = '';
