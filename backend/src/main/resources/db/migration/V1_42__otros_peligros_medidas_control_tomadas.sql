-- Catálogos simples (nombre + descripción) para gerencia de viajes
CREATE TABLE otros_peligros_viaje (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE business_otros_peligros_viaje (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    otros_peligros_viaje_id BIGINT NOT NULL REFERENCES otros_peligros_viaje(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, otros_peligros_viaje_id)
);

CREATE INDEX idx_business_otros_peligros_viaje_business ON business_otros_peligros_viaje(business_id);

CREATE TABLE medidas_control_tomadas_viaje (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE business_medida_control_tomada_viaje (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    medida_control_tomada_viaje_id BIGINT NOT NULL REFERENCES medidas_control_tomadas_viaje(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, medida_control_tomada_viaje_id)
);

CREATE INDEX idx_business_medida_control_tomada_viaje_business ON business_medida_control_tomada_viaje(business_id);

-- Valores seleccionados en la gerencia de viaje (además de catálogos existentes)
ALTER TABLE gerencias_viajes ADD COLUMN IF NOT EXISTS catalogo_otros_peligros VARCHAR(300);
ALTER TABLE gerencias_viajes ADD COLUMN IF NOT EXISTS medidas_control_tomadas_viaje VARCHAR(500);
