-- Sección del catálogo (Casco, Pantalón, etc.) bajo la familia EPP/HERRAMIENTA/PIEZA
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS section_code VARCHAR(10);
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS section_label VARCHAR(80);

-- Backfill desde código tipo FAM-SEC-001
UPDATE inventory_products
SET section_code = UPPER(SUBSTRING(code FROM 5 FOR 3))
WHERE section_code IS NULL
  AND code ~ '^[A-Za-z0-9]{3}-[A-Za-z0-9]{3}-[0-9]+$';

UPDATE inventory_products SET section_label = CASE UPPER(section_code)
  WHEN 'CAS' THEN 'Casco'
  WHEN 'PAN' THEN 'Pantalón'
  WHEN 'CAM' THEN 'Camisa'
  WHEN 'GUA' THEN 'Guantes'
  WHEN 'BOT' THEN 'Botas'
  WHEN 'RES' THEN 'Respirador'
  WHEN 'ARN' THEN 'Arnés'
  WHEN 'TAL' THEN 'Taladro / eléctrica'
  WHEN 'MAN' THEN 'Manual'
  WHEN 'MED' THEN 'Medición'
  WHEN 'COR' THEN 'Corte'
  WHEN 'REP' THEN 'Repuesto'
  WHEN 'CON' THEN 'Consumible'
  WHEN 'OTR' THEN 'Otro'
  ELSE section_label
END
WHERE section_code IS NOT NULL AND (section_label IS NULL OR TRIM(section_label) = '');
