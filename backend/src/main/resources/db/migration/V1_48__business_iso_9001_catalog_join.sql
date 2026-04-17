-- Sustituye filas “propias” por vínculo al catálogo global ISO 9001 (mismo patrón que business_tipo_via).
DROP TABLE IF EXISTS business_iso_9001_catalog_items;

CREATE TABLE business_iso_9001_catalog_item (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    iso_9001_catalog_item_id BIGINT NOT NULL REFERENCES iso_9001_catalog_items(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, iso_9001_catalog_item_id)
);

CREATE INDEX idx_business_iso9001_join_business ON business_iso_9001_catalog_item(business_id);
