-- Agregar campos de empresa contratista al modelo Business
-- Fecha: 2025-01-23

-- Agregar campo de empresa contratista a la tabla businesses
ALTER TABLE businesses 
ADD COLUMN contractor_company_id BIGINT,
ADD CONSTRAINT fk_business_contractor_company 
FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies(id);

-- Crear tabla de unión para business y contractor_blocks
CREATE TABLE business_contractor_blocks (
    business_id BIGINT NOT NULL,
    contractor_block_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, contractor_block_id),
    CONSTRAINT fk_business_contractor_blocks_business 
        FOREIGN KEY (business_id) REFERENCES businesses(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_business_contractor_blocks_block 
        FOREIGN KEY (contractor_block_id) REFERENCES contractor_blocks(id) 
        ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_business_contractor_company ON businesses(contractor_company_id);
CREATE INDEX idx_business_contractor_blocks_business ON business_contractor_blocks(business_id);
CREATE INDEX idx_business_contractor_blocks_block ON business_contractor_blocks(contractor_block_id);

-- Comentarios para documentación
COMMENT ON COLUMN businesses.contractor_company_id IS 'ID de la empresa contratista asignada a esta empresa';
COMMENT ON TABLE business_contractor_blocks IS 'Tabla de unión entre empresas y bloques de empresas contratistas';
COMMENT ON COLUMN business_contractor_blocks.business_id IS 'ID de la empresa';
COMMENT ON COLUMN business_contractor_blocks.contractor_block_id IS 'ID del bloque de empresa contratista';