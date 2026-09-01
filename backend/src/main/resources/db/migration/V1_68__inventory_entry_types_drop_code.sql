-- Quitar código de tipos de entrada (solo nombre + descripción)
DROP INDEX IF EXISTS uk_inventory_entry_types_code;
ALTER TABLE inventory_entry_types DROP COLUMN IF EXISTS code;
