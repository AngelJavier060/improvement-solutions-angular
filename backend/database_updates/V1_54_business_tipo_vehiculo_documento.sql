-- Documentos de flota aplicables por tipo de vehículo, por empresa.
CREATE TABLE IF NOT EXISTS business_tipo_vehiculo_documento (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tipo_vehiculo_id BIGINT NOT NULL REFERENCES tipo_vehiculos(id) ON DELETE CASCADE,
    entidad_remitente_id BIGINT NOT NULL REFERENCES entidad_remitentes(id) ON DELETE CASCADE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uq_biz_tipo_vehiculo_doc UNIQUE (business_id, tipo_vehiculo_id, entidad_remitente_id)
);

CREATE INDEX IF NOT EXISTS idx_biz_tipo_veh_doc_lookup
    ON business_tipo_vehiculo_documento (business_id, tipo_vehiculo_id);
