-- Documentación de cumplimiento de flota (vigencias / metadatos; el PDF sigue en fleet_vehicle_documents)
CREATE TABLE IF NOT EXISTS fleet_compliance_documents (
    id BIGSERIAL PRIMARY KEY,
    fleet_vehicle_id BIGINT NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
    type_code VARCHAR(100) NOT NULL,
    type_label VARCHAR(255) NOT NULL,
    doc_category VARCHAR(50) DEFAULT 'DOCUMENTOS_PRINCIPALES',
    entidad_remitente_id BIGINT,
    entidad_remitente_name VARCHAR(255),
    reference_id VARCHAR(120),
    issue_date DATE,
    expiry_date DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    historic_mode BOOLEAN NOT NULL DEFAULT FALSE,
    file_name VARCHAR(512),
    file_size_label VARCHAR(64),
    fleet_vehicle_document_id BIGINT REFERENCES fleet_vehicle_documents(id) ON DELETE SET NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleet_compliance_vehicle
    ON fleet_compliance_documents(fleet_vehicle_id);

CREATE INDEX IF NOT EXISTS idx_fleet_compliance_doc_file
    ON fleet_compliance_documents(fleet_vehicle_document_id);
