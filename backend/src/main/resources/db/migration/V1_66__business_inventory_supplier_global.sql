-- Asignación por empresa de proveedores globales (Inventario-Bodega)
CREATE TABLE IF NOT EXISTS business_inventory_supplier_global (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    inventory_supplier_global_id BIGINT NOT NULL REFERENCES inventory_supplier_catalog(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, inventory_supplier_global_id)
);

CREATE INDEX IF NOT EXISTS idx_biz_inv_sup_global_biz
    ON business_inventory_supplier_global(business_id);
