-- Migración para soportar múltiples empresas contratistas por empresa
-- Cambio de relación One-to-Many a Many-to-Many
-- Base de datos: db_improvement_solutions

USE db_improvement_solutions;

-- 1. Crear la nueva tabla para la relación many-to-many
CREATE TABLE IF NOT EXISTS business_contractor_companies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    business_id BIGINT NOT NULL,
    contractor_company_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_business_contractor (business_id, contractor_company_id),
    CONSTRAINT fk_business_contractor_companies_business 
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    CONSTRAINT fk_business_contractor_companies_contractor 
        FOREIGN KEY (contractor_company_id) REFERENCES contractor_companies(id) ON DELETE CASCADE
);

-- 2. Migrar datos existentes de la columna contractor_company_id
INSERT INTO business_contractor_companies (business_id, contractor_company_id)
SELECT id as business_id, contractor_company_id
FROM businesses 
WHERE contractor_company_id IS NOT NULL;

-- 3. Verificar la migración
SELECT 'DATOS MIGRADOS' as resultado;
SELECT 
    bcc.business_id,
    b.name as business_name,
    bcc.contractor_company_id,
    cc.name as contractor_company_name
FROM business_contractor_companies bcc
JOIN businesses b ON bcc.business_id = b.id
JOIN contractor_companies cc ON bcc.contractor_company_id = cc.id;

-- 4. Eliminar la columna contractor_company_id de la tabla businesses
-- (Comentado por seguridad - ejecutar manualmente después de verificar)
-- ALTER TABLE businesses DROP COLUMN contractor_company_id;

SELECT 'MIGRACIÓN COMPLETADA' as resultado;
SELECT 'NOTA: La columna contractor_company_id aún existe para respaldo' as nota;
SELECT 'Ejecute manualmente: ALTER TABLE businesses DROP COLUMN contractor_company_id; después de verificar' as instruccion;