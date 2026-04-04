-- Migración para relaciones ManyToMany entre Business y módulos de Mantenimiento
-- Tablas de unión para asignar tipos de vehículo y estados de unidad a empresas

-- Tabla de relación Business - TipoVehiculo
CREATE TABLE IF NOT EXISTS business_tipo_vehiculo (
    business_id BIGINT NOT NULL,
    tipo_vehiculo_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, tipo_vehiculo_id),
    CONSTRAINT fk_business_tipo_vehiculo_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_business_tipo_vehiculo_tipo
        FOREIGN KEY (tipo_vehiculo_id) REFERENCES tipo_vehiculos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de relación Business - EstadoUnidad
CREATE TABLE IF NOT EXISTS business_estado_unidad (
    business_id BIGINT NOT NULL,
    estado_unidad_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, estado_unidad_id),
    CONSTRAINT fk_business_estado_unidad_business
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_business_estado_unidad_estado
        FOREIGN KEY (estado_unidad_id) REFERENCES estado_unidades(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX idx_business_tipo_vehiculo_business ON business_tipo_vehiculo(business_id);
CREATE INDEX idx_business_tipo_vehiculo_tipo ON business_tipo_vehiculo(tipo_vehiculo_id);
CREATE INDEX idx_business_estado_unidad_business ON business_estado_unidad(business_id);
CREATE INDEX idx_business_estado_unidad_estado ON business_estado_unidad(estado_unidad_id);
