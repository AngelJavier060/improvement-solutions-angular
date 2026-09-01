-- Limpieza: campos de producto movidos a variante o nunca usados en UI operativa.
-- Marca / stock mín → variante; modelo / specs / certs / max_stock / supplier del producto → fuera.

ALTER TABLE inventory_products DROP COLUMN IF EXISTS brand;
ALTER TABLE inventory_products DROP COLUMN IF EXISTS model;
ALTER TABLE inventory_products DROP COLUMN IF EXISTS specs_json;
ALTER TABLE inventory_products DROP COLUMN IF EXISTS certifications_json;
ALTER TABLE inventory_products DROP COLUMN IF EXISTS min_stock;
ALTER TABLE inventory_products DROP COLUMN IF EXISTS max_stock;
ALTER TABLE inventory_products DROP COLUMN IF EXISTS supplier_id;
