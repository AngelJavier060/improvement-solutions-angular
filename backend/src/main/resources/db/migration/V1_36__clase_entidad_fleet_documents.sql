-- Clase de vehículo y entidad remitente (catálogo global + asignación por empresa)
-- Documentos adjuntos por ficha de flota

CREATE TABLE IF NOT EXISTS clase_vehiculos (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entidad_remitentes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_clase_vehiculo (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    clase_vehiculo_id BIGINT NOT NULL REFERENCES clase_vehiculos(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, clase_vehiculo_id)
);

CREATE TABLE IF NOT EXISTS business_entidad_remitente (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    entidad_remitente_id BIGINT NOT NULL REFERENCES entidad_remitentes(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, entidad_remitente_id)
);

ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS clase_vehiculo_id BIGINT REFERENCES clase_vehiculos(id);
ALTER TABLE fleet_vehicles ADD COLUMN IF NOT EXISTS entidad_remitente_id BIGINT REFERENCES entidad_remitentes(id);

ALTER TABLE fleet_vehicles DROP COLUMN IF EXISTS clase;

CREATE TABLE IF NOT EXISTS fleet_vehicle_documents (
    id BIGSERIAL PRIMARY KEY,
    fleet_vehicle_id BIGINT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    original_filename VARCHAR(512) NOT NULL,
    stored_path VARCHAR(1024) NOT NULL,
    content_type VARCHAR(200),
    file_size BIGINT,
    description VARCHAR(500),
    created_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_vehicle_docs_vehicle ON fleet_vehicle_documents(fleet_vehicle_id);

-- Catálogo inicial (solo si las tablas están vacías) y asignación a la empresa id=1 (demo / Orientoil)
INSERT INTO clase_vehiculos (name, created_at, updated_at)
SELECT v, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM (VALUES ('Trailer'), ('Cabezal'), ('Camión'), ('Camioneta')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM clase_vehiculos LIMIT 1);

INSERT INTO entidad_remitentes (name, created_at, updated_at)
SELECT v, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM (VALUES ('Orientoil — Matriz'), ('Cliente / obra')) AS t(v)
WHERE NOT EXISTS (SELECT 1 FROM entidad_remitentes LIMIT 1);

INSERT INTO business_clase_vehiculo (business_id, clase_vehiculo_id)
SELECT b.id, c.id FROM businesses b
CROSS JOIN clase_vehiculos c
WHERE b.id = 1 AND c.name IN ('Trailer','Cabezal','Camión','Camioneta')
ON CONFLICT DO NOTHING;

INSERT INTO business_entidad_remitente (business_id, entidad_remitente_id)
SELECT b.id, e.id FROM businesses b
CROSS JOIN entidad_remitentes e
WHERE b.id = 1
ON CONFLICT DO NOTHING;
