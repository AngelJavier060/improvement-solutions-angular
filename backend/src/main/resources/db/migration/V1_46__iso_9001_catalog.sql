-- Catálogos del módulo Sistema de Gestión ISO 9001 (nombre + descripción por tipo de parámetro)
CREATE TABLE iso_9001_catalog_items (
    id BIGSERIAL PRIMARY KEY,
    catalog_code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_iso9001_catalog_item_name UNIQUE (catalog_code, name)
);

CREATE INDEX idx_iso9001_catalog_code ON iso_9001_catalog_items(catalog_code);

-- Datos de prueba (un registro por cada uno de los cinco parámetros)
INSERT INTO iso_9001_catalog_items (catalog_code, name, description, created_at, updated_at) VALUES
    ('tipo-documento', 'Ejemplo — tipo de documento', 'Registro semilla para pruebas del catálogo Tipo de Documento.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('proceso', 'Ejemplo — proceso', 'Registro semilla para pruebas del catálogo Proceso.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('codigo', 'Ejemplo — código', 'Registro semilla para pruebas del catálogo Código.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('almacenamiento', 'Ejemplo — almacenamiento', 'Registro semilla para pruebas del catálogo Almacenamiento.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('disposicion-final', 'Ejemplo — disposición final', 'Registro semilla para pruebas del catálogo Disposición final.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
