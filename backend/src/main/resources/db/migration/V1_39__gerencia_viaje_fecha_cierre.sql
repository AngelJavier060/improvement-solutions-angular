-- Fecha de cierre formal de la gerencia de viaje (junto a km_final al cerrar)
ALTER TABLE gerencias_viajes
    ADD COLUMN IF NOT EXISTS fecha_cierre DATE;

COMMENT ON COLUMN gerencias_viajes.fecha_cierre IS 'Fecha en que se cerró el viaje (estado COMPLETADO)';

CREATE INDEX IF NOT EXISTS idx_gerencias_viajes_business_cedula_estado
    ON gerencias_viajes (business_id, cedula, estado);
