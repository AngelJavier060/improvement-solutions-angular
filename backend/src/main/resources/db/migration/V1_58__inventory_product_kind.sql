-- Tipo operativo de producto: EPP | HERRAMIENTA | PIEZA
ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS product_kind VARCHAR(20);

-- Backfill desde category / código
UPDATE inventory_products
SET product_kind = 'HERRAMIENTA'
WHERE product_kind IS NULL
  AND (
    UPPER(COALESCE(category, '')) LIKE '%HERRAMIENT%'
    OR UPPER(COALESCE(code, '')) LIKE 'HER-%'
    OR UPPER(COALESCE(code, '')) LIKE 'HERR-%'
  );

UPDATE inventory_products
SET product_kind = 'PIEZA'
WHERE product_kind IS NULL
  AND (
    UPPER(COALESCE(category, '')) LIKE '%PIEZA%'
    OR UPPER(COALESCE(category, '')) LIKE '%REPUESTO%'
    OR UPPER(COALESCE(code, '')) LIKE 'PIE-%'
  );

UPDATE inventory_products
SET product_kind = 'EPP'
WHERE product_kind IS NULL
  AND (
    UPPER(COALESCE(category, '')) LIKE '%EPP%'
    OR UPPER(COALESCE(category, '')) LIKE '%PROTECCION%'
    OR UPPER(COALESCE(category, '')) LIKE '%PROTECCIÓN%'
    OR UPPER(COALESCE(code, '')) LIKE 'EPP-%'
  );

UPDATE inventory_products SET product_kind = 'EPP' WHERE product_kind IS NULL;

ALTER TABLE inventory_products ALTER COLUMN product_kind SET DEFAULT 'EPP';
ALTER TABLE inventory_products ALTER COLUMN product_kind SET NOT NULL;
