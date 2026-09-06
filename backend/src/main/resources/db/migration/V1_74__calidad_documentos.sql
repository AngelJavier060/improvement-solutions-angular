-- Lista maestra de documentos ISO 9001 por empresa (multiempresa)
CREATE TABLE IF NOT EXISTS calidad_documentos (
    id                      BIGSERIAL PRIMARY KEY,
    business_id             BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    parent_id               BIGINT NULL REFERENCES calidad_documentos(id) ON DELETE RESTRICT,
    proceso_catalog_item_id BIGINT NULL,
    proceso_name            VARCHAR(255) NOT NULL,
    proceso_code            VARCHAR(10)  NOT NULL,
    tipo_catalog_item_id    BIGINT NULL,
    tipo_name               VARCHAR(255) NOT NULL,
    tipo_code               VARCHAR(10)  NOT NULL,
    codigo                  VARCHAR(100) NOT NULL,
    nombre                  VARCHAR(500) NOT NULL,
    fecha_elaboracion       DATE,
    fecha_revision          DATE,
    version                 VARCHAR(20)  NOT NULL DEFAULT '01',
    fecha_prox_revision     DATE,
    dias_vigencia           INTEGER,
    estado                  VARCHAR(40)  NOT NULL DEFAULT 'VIGENTE',
    almacenamiento          VARCHAR(255),
    responsable             VARCHAR(255),
    vigencia                VARCHAR(40),
    disposicion_final       VARCHAR(255),
    observaciones           TEXT,
    file_name               VARCHAR(255),
    file_path               VARCHAR(500),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_calidad_documentos_business_codigo UNIQUE (business_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_calidad_docs_business ON calidad_documentos(business_id);
CREATE INDEX IF NOT EXISTS idx_calidad_docs_parent ON calidad_documentos(parent_id);
CREATE INDEX IF NOT EXISTS idx_calidad_docs_business_parent ON calidad_documentos(business_id, parent_id);
