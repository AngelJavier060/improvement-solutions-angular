-- Script para crear las tablas necesarias para empresas contratistas
-- Fecha: 2025-09-16
-- Autor: Asistente AI

USE improvement_solutions;

-- 1. Crear tabla contractor_companies si no existe
CREATE TABLE IF NOT EXISTS contractor_companies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_contractor_companies_name (name),
    UNIQUE KEY uk_contractor_companies_code (code)
);

-- 2. Crear tabla contractor_blocks si no existe
CREATE TABLE IF NOT EXISTS contractor_blocks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    contractor_company_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies(id) ON DELETE CASCADE,
    UNIQUE KEY uk_contractor_blocks_name_company (name, contractor_company_id),
    UNIQUE KEY uk_contractor_blocks_code (code)
);

-- 3. Agregar columnas a la tabla businesses si no existen
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS contractor_company_id BIGINT,
ADD CONSTRAINT fk_businesses_contractor_company 
    FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies(id) ON DELETE SET NULL;

-- 4. Crear tabla de unión business_contractor_blocks si no existe
CREATE TABLE IF NOT EXISTS business_contractor_blocks (
    business_id BIGINT NOT NULL,
    contractor_block_id BIGINT NOT NULL,
    PRIMARY KEY (business_id, contractor_block_id),
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY (contractor_block_id) REFERENCES contractor_blocks(id) ON DELETE CASCADE
);

-- 5. Insertar datos de ejemplo si las tablas están vacías
INSERT IGNORE INTO contractor_companies (id, name, code, description, active) VALUES
(1, 'Constructora ABC S.A.', 'ABC001', 'Empresa contratista especializada en construcción civil', TRUE),
(2, 'Ingeniería XYZ Ltda.', 'XYZ002', 'Contratista para proyectos de ingeniería e infraestructura', TRUE),
(3, 'Edificaciones DEF Corp.', 'DEF003', 'Especialista en edificaciones residenciales y comerciales', TRUE);

INSERT IGNORE INTO contractor_blocks (id, name, code, description, active, contractor_company_id) VALUES
-- Bloques para Constructora ABC S.A.
(1, 'Bloque 15', 'ABC-B15', 'Bloque de construcción zona norte', TRUE, 1),
(2, 'Bloque 18', 'ABC-B18', 'Bloque de construcción zona centro', TRUE, 1),
(3, 'Bloque 22', 'ABC-B22', 'Bloque de construcción zona sur', TRUE, 1),

-- Bloques para Ingeniería XYZ Ltda.
(4, 'Bloque 31', 'XYZ-B31', 'Bloque de infraestructura vial', TRUE, 2),
(5, 'Bloque 35', 'XYZ-B35', 'Bloque de obras hidráulicas', TRUE, 2),
(6, 'Bloque 40', 'XYZ-B40', 'Bloque de puentes y túneles', TRUE, 2),

-- Bloques para Edificaciones DEF Corp.
(7, 'Bloque 52', 'DEF-B52', 'Bloque residencial premium', TRUE, 3),
(8, 'Bloque 58', 'DEF-B58', 'Bloque comercial y oficinas', TRUE, 3),
(9, 'Bloque 65', 'DEF-B65', 'Bloque mixto residencial-comercial', TRUE, 3);

-- 6. Verificar las tablas creadas
SELECT 'contractor_companies' as tabla, COUNT(*) as registros FROM contractor_companies
UNION ALL
SELECT 'contractor_blocks' as tabla, COUNT(*) as registros FROM contractor_blocks
UNION ALL
SELECT 'business_contractor_blocks' as tabla, COUNT(*) as registros FROM business_contractor_blocks;

-- 7. Mostrar estructura de las nuevas tablas
DESCRIBE contractor_companies;
DESCRIBE contractor_blocks;
DESCRIBE business_contractor_blocks;

COMMIT;