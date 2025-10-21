-- Align inventory_movements table to match entity InventoryMovement
-- Idempotent across legacy (V1_13) and new (V1_17) structures

-- 1) Add new columns if missing
ALTER TABLE inventory_movements 
  ADD COLUMN IF NOT EXISTS movement_date DATETIME NULL,
  ADD COLUMN IF NOT EXISTS movement_type VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS balance_qty DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS reference_id BIGINT NULL;

-- 2) Backfill from legacy columns if they exist
UPDATE inventory_movements SET movement_date = `date` 
  WHERE movement_date IS NULL AND `date` IS NOT NULL;
UPDATE inventory_movements SET movement_type = `type` 
  WHERE movement_type IS NULL AND `type` IS NOT NULL;
UPDATE inventory_movements SET quantity = `qty` 
  WHERE quantity IS NULL AND `qty` IS NOT NULL;
UPDATE inventory_movements SET notes = `reason` 
  WHERE (notes IS NULL OR notes = '') AND `reason` IS NOT NULL;
UPDATE inventory_movements SET created_by = `responsible` 
  WHERE (created_by IS NULL OR created_by = '') AND `responsible` IS NOT NULL;

-- 3) Ensure NOT NULL where appropriate (after backfill)
ALTER TABLE inventory_movements 
  MODIFY COLUMN movement_date DATETIME NOT NULL;

-- 4) Drop legacy columns if they remain
ALTER TABLE inventory_movements 
  DROP COLUMN IF EXISTS `date`,
  DROP COLUMN IF EXISTS `type`,
  DROP COLUMN IF EXISTS `qty`,
  DROP COLUMN IF EXISTS `reason`,
  DROP COLUMN IF EXISTS `responsible`,
  DROP COLUMN IF EXISTS product_id,
  DROP COLUMN IF EXISTS subdetail_id,
  DROP COLUMN IF EXISTS document_url;

-- 5) Add indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_movement_business ON inventory_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_movement_variant ON inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_movement_date ON inventory_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_movement_type ON inventory_movements(movement_type);
