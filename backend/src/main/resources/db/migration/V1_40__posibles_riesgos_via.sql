-- Catálogo: posibles riesgos en la vía (gerencia de viajes)
CREATE TABLE posibles_riesgos_via (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE business_posible_riesgo_via (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    posible_riesgo_via_id BIGINT NOT NULL REFERENCES posibles_riesgos_via(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, posible_riesgo_via_id)
);

CREATE INDEX idx_business_posible_riesgo_via_business ON business_posible_riesgo_via(business_id);
