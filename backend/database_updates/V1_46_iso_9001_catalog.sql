-- Réplica del script Flyway V1_46__iso_9001_catalog.sql (ISO 9001 — cinco catálogos).
-- Preferir migración automática con Flyway; use este archivo solo si aplica scripts a mano.

CREATE TABLE IF NOT EXISTS iso_9001_catalog_items (
    id BIGSERIAL PRIMARY KEY,
    catalog_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_iso9001_catalog_item_name UNIQUE (catalog_code, name)
);

CREATE INDEX IF NOT EXISTS idx_iso9001_catalog_code ON iso_9001_catalog_items(catalog_code);
