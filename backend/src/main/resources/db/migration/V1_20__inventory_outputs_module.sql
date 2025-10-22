-- Crear tablas para el módulo de salidas de inventario

-- Tabla de salidas de inventario
CREATE TABLE IF NOT EXISTS inventory_outputs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT NOT NULL,
    output_number VARCHAR(50) NOT NULL UNIQUE,
    output_date DATE NOT NULL,
    output_type VARCHAR(20) NOT NULL,
    employee_id BIGINT NULL,
    area VARCHAR(100) NULL,
    project VARCHAR(100) NULL,
    return_date DATE NULL,
    authorized_by VARCHAR(100) NULL,
    document_image VARCHAR(255) NULL,
    notes TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);

-- Tabla de detalles de salidas de inventario
CREATE TABLE IF NOT EXISTS inventory_output_details (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    output_id BIGINT NOT NULL,
    variant_id BIGINT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,4) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    lot_number VARCHAR(50) NULL,
    warehouse_location VARCHAR(100) NULL,
    item_condition VARCHAR(20) NULL,
    notes TEXT NULL,
    created_at DATETIME NULL,
    FOREIGN KEY (output_id) REFERENCES inventory_outputs(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES inventory_variants(id)
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_output_business ON inventory_outputs(business_id);
CREATE INDEX IF NOT EXISTS idx_output_date ON inventory_outputs(output_date);
CREATE INDEX IF NOT EXISTS idx_output_type ON inventory_outputs(output_type);
CREATE INDEX IF NOT EXISTS idx_output_employee ON inventory_outputs(employee_id);
CREATE INDEX IF NOT EXISTS idx_output_detail_output ON inventory_output_details(output_id);
CREATE INDEX IF NOT EXISTS idx_output_detail_variant ON inventory_output_details(variant_id);
