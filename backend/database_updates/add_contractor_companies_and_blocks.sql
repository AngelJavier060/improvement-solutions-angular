-- Script de migración para crear las tablas de empresas contratistas y bloques
-- Fecha: 2025-09-16
-- Descripción: Agrega funcionalidad para manejar empresas contratistas y sus bloques

-- Crear tabla contractor_companies
CREATE TABLE IF NOT EXISTS contractor_companies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_contractor_companies_name (name),
    INDEX idx_contractor_companies_code (code),
    INDEX idx_contractor_companies_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla contractor_blocks
CREATE TABLE IF NOT EXISTS contractor_blocks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    contractor_company_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
    
    INDEX idx_contractor_blocks_name (name),
    INDEX idx_contractor_blocks_code (code),
    INDEX idx_contractor_blocks_active (active),
    INDEX idx_contractor_blocks_company (contractor_company_id),
    
    -- Constraint para evitar bloques duplicados por empresa
    UNIQUE KEY unique_block_per_company (name, contractor_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar campos a la tabla business_employees
ALTER TABLE business_employees 
ADD COLUMN contractor_company_id BIGINT NULL AFTER type_contract_id,
ADD COLUMN contractor_block_id BIGINT NULL AFTER contractor_company_id;

-- Crear las claves foráneas para business_employees
ALTER TABLE business_employees 
ADD CONSTRAINT fk_business_employees_contractor_company 
    FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies(id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_business_employees_contractor_block 
    FOREIGN KEY (contractor_block_id) REFERENCES contractor_blocks(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX idx_business_employees_contractor_company ON business_employees(contractor_company_id);
CREATE INDEX idx_business_employees_contractor_block ON business_employees(contractor_block_id);

-- Insertar algunos datos de ejemplo (opcional)
INSERT INTO contractor_companies (name, code, description, active) VALUES 
('Petroecuador', 'PEC', 'Empresa Pública de Hidrocarburos del Ecuador', true),
('Agip Oil', 'AO', 'Agip Oil Ecuador', true),
('Repsol', 'REP', 'Repsol Ecuador', true);

-- Insertar bloques de ejemplo para Petroecuador
INSERT INTO contractor_blocks (name, code, description, contractor_company_id, active) VALUES 
('Bloque 15', 'B15', 'Bloque de exploración y explotación 15', 1, true),
('Bloque 18', 'B18', 'Bloque de exploración y explotación 18', 1, true),
('Bloque 31', 'B31', 'Bloque de exploración y explotación 31', 1, true),
('Bloque 43', 'B43', 'Bloque de exploración y explotación 43', 1, true);

-- Insertar bloques de ejemplo para Agip Oil
INSERT INTO contractor_blocks (name, code, description, contractor_company_id, active) VALUES 
('Bloque 10', 'B10', 'Bloque de exploración y explotación 10', 2, true),
('Bloque 27', 'B27', 'Bloque de exploración y explotación 27', 2, true);

-- Insertar bloques de ejemplo para Repsol
INSERT INTO contractor_blocks (name, code, description, contractor_company_id, active) VALUES 
('Bloque 16', 'B16', 'Bloque de exploración y explotación 16', 3, true),
('Bloque 67', 'B67', 'Bloque de exploración y explotación 67', 3, true);

-- Comentarios finales
-- Esta migración agrega la funcionalidad completa para manejar empresas contratistas y bloques
-- Los campos en business_employees son opcionales para mantener compatibilidad
-- Se incluyen datos de ejemplo que pueden ser eliminados si no se requieren