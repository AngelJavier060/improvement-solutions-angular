-- Add 'codigo' column for sequential code per gerencia de viaje
ALTER TABLE gerencias_viajes
    ADD COLUMN codigo VARCHAR(20) NULL AFTER id;

-- Unique per business + codigo; allows multiple NULLs
CREATE UNIQUE INDEX uq_gerencias_viajes_business_codigo
    ON gerencias_viajes (business_id, codigo);

-- Helpful index to search by codigo prefix (optional)
CREATE INDEX idx_gerencias_viajes_codigo ON gerencias_viajes (codigo);
