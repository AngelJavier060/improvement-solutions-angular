-- Add sale_price and size/dimensions to variants
ALTER TABLE inventory_variants
  ADD COLUMN sale_price DECIMAL(18,2) NULL AFTER unit_cost,
  ADD COLUMN size_label VARCHAR(50) NULL AFTER description,
  ADD COLUMN dimensions VARCHAR(100) NULL AFTER size_label;

-- Optional index for quick filtering by size
CREATE INDEX idx_inventory_variants_size ON inventory_variants(size_label);
