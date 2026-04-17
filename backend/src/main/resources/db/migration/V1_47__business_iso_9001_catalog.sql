-- Catálogos ISO 9001 por empresa (independientes por negocio; segmentación por business_id / RUC en tabla businesses)
CREATE TABLE business_iso_9001_catalog_items (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    catalog_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_business_iso9001_catalog_name UNIQUE (business_id, catalog_code, name)
);

CREATE INDEX idx_business_iso9001_business_catalog ON business_iso_9001_catalog_items(business_id, catalog_code);
