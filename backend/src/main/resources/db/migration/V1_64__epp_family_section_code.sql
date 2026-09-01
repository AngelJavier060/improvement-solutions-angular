-- Código corto para SKU de bodega: FAMILIA-SECCION-### (ej. EPP-CAS-001)
ALTER TABLE epp_families ADD COLUMN IF NOT EXISTS code VARCHAR(4);
ALTER TABLE epp_sections ADD COLUMN IF NOT EXISTS code VARCHAR(4);

-- Backfill familias
UPDATE epp_families SET code = 'EPP'
WHERE code IS NULL AND UPPER(TRIM(name)) IN ('EPP', 'EQUIPO DE PROTECCION PERSONAL', 'EQUIPO DE PROTECCIÓN PERSONAL');

UPDATE epp_families
SET code = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3))
WHERE code IS NULL OR TRIM(code) = '';

-- Backfill secciones conocidas
UPDATE epp_sections SET code = CASE UPPER(TRIM(name))
    WHEN 'CASCO' THEN 'CAS'
    WHEN 'PANTALÓN' THEN 'PAN'
    WHEN 'PANTALON' THEN 'PAN'
    WHEN 'CAMISA' THEN 'CAM'
    WHEN 'OVEROL' THEN 'OVE'
    WHEN 'GUANTES' THEN 'GUA'
    WHEN 'BOTAS' THEN 'BOT'
    WHEN 'RESPIRADOR' THEN 'RES'
    WHEN 'ARNÉS' THEN 'ARN'
    WHEN 'ARNES' THEN 'ARN'
    WHEN 'OTRO EPP' THEN 'OTR'
    ELSE code
END
WHERE code IS NULL OR TRIM(code) = '';

UPDATE epp_sections
SET code = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, ''), '[^A-Za-z0-9]', '', 'g') FROM 1 FOR 3))
WHERE code IS NULL OR TRIM(code) = '';

ALTER TABLE epp_families ALTER COLUMN code SET NOT NULL;
ALTER TABLE epp_sections ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_epp_families_code
    ON epp_families (UPPER(TRIM(code)));

CREATE UNIQUE INDEX IF NOT EXISTS uk_epp_sections_code
    ON epp_sections (UPPER(TRIM(code)));
