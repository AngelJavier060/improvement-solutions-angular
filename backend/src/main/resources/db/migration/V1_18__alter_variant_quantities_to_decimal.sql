-- Modificar tipos de columnas de cantidad en inventory_variants
-- De INT a DECIMAL para soportar cantidades fraccionarias (kg, litros, metros, etc.)

ALTER TABLE inventory_variants 
    MODIFY COLUMN current_qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN min_qty DECIMAL(10,2) NULL;

-- Añadir columnas faltantes en inventory_variants
ALTER TABLE inventory_variants 
    ADD COLUMN IF NOT EXISTS size_label VARCHAR(50) NULL AFTER description,
    ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100) NULL AFTER size_label,
    ADD COLUMN IF NOT EXISTS sale_price DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER unit_cost;
