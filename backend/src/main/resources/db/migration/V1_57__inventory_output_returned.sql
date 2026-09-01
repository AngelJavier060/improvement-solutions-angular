-- Marca de préstamos/asignaciones ya devueltos
ALTER TABLE inventory_outputs ADD COLUMN IF NOT EXISTS returned BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory_outputs ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;
ALTER TABLE inventory_outputs ADD COLUMN IF NOT EXISTS return_entry_id BIGINT;

UPDATE inventory_outputs SET returned = FALSE WHERE returned IS NULL;
