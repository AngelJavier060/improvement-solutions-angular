-- Catalog enhancements: hierarchical categories and richer product spec fields

-- 1) Categories: add parent/level for hierarchy
ALTER TABLE inventory_categories
  ADD COLUMN parent_id BIGINT NULL AFTER id,
  ADD COLUMN level INT NULL DEFAULT 1 AFTER parent_id;

ALTER TABLE inventory_categories
  ADD CONSTRAINT fk_inventory_categories_parent
  FOREIGN KEY (parent_id) REFERENCES inventory_categories(id);

CREATE INDEX idx_inventory_categories_parent ON inventory_categories(parent_id);
CREATE INDEX idx_inventory_categories_level ON inventory_categories(level);

-- 2) Products: add brand/model/specs/certifications
ALTER TABLE inventory_products
  ADD COLUMN brand VARCHAR(100) NULL AFTER name,
  ADD COLUMN model VARCHAR(100) NULL AFTER brand,
  ADD COLUMN specs_json TEXT NULL AFTER description,
  ADD COLUMN certifications_json TEXT NULL AFTER specs_json;
