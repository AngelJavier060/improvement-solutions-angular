-- Solicitudes de Cambio de EPP (Seguridad Industrial ↔ Inventario)
CREATE TABLE IF NOT EXISTS cambio_epp_solicitudes (
    id                  BIGSERIAL PRIMARY KEY,
    business_id         BIGINT NOT NULL REFERENCES businesses(id),
    n_reporte           VARCHAR(40) NOT NULL,
    trabajador          VARCHAR(200) NOT NULL,
    cedula              VARCHAR(20) NOT NULL,
    cargo               VARCHAR(150),
    area                VARCHAR(200),
    tipo_acontecimiento VARCHAR(120),
    section_code        VARCHAR(10),
    section_label       VARCHAR(80),
    estado_epi          VARCHAR(120),
    severidad           VARCHAR(40),
    fecha_elaboracion   VARCHAR(40),
    status              VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_APROBACION',
    form_snapshot       TEXT,
    signed_file_name    VARCHAR(255),
    signed_file_path    VARCHAR(500),
    signed_uploaded_at  TIMESTAMP,
    output_id           BIGINT,
    output_number       VARCHAR(50),
    delivered_at        TIMESTAMP,
    rejected_reason     TEXT,
    rejected_at         TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cambio_epp_business ON cambio_epp_solicitudes(business_id);
CREATE INDEX IF NOT EXISTS idx_cambio_epp_status ON cambio_epp_solicitudes(business_id, status);
CREATE INDEX IF NOT EXISTS idx_cambio_epp_cedula ON cambio_epp_solicitudes(business_id, cedula);
CREATE UNIQUE INDEX IF NOT EXISTS uk_cambio_epp_business_reporte
    ON cambio_epp_solicitudes(business_id, n_reporte);
