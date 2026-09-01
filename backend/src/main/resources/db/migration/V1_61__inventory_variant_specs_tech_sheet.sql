-- Especificaciones generales y ficha técnica PDF por variante
ALTER TABLE inventory_variants ADD COLUMN IF NOT EXISTS general_specs VARCHAR(500);
ALTER TABLE inventory_variants ADD COLUMN IF NOT EXISTS tech_sheet_pdf VARCHAR(255);
