ALTER TABLE entidad_remitentes
    ADD COLUMN IF NOT EXISTS category VARCHAR(40) DEFAULT 'DOCUMENTOS_PRINCIPALES';

UPDATE entidad_remitentes
SET category = 'DOCUMENTOS_PRINCIPALES'
WHERE category IS NULL OR TRIM(category) = '';
