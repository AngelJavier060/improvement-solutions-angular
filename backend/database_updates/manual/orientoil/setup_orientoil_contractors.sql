-- Configurar múltiples empresas contratistas para OrientOil
-- Base de datos: db_improvement_solutions

-- 1. Verificar configuración actual de OrientOil (ID 3)
SELECT 'CONFIGURACIÓN ACTUAL DE ORIENTOIL' as estado;
SELECT 
    b.id,
    b.name,
    b.ruc,
    b.contractor_company_id
FROM businesses b
WHERE b.id = 3;

-- Ver empresas contratistas actuales en business_contractor_companies
SELECT 'EMPRESAS CONTRATISTAS ACTUALES EN JUNCTION TABLE' as estado;
SELECT 
    bcc.business_id,
    bcc.contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code
FROM business_contractor_companies bcc
JOIN contractor_companies cc ON bcc.contractor_company_id = cc.id
WHERE bcc.business_id = 3;

-- 2. Asegurar que existen las empresas contratistas necesarias
UPDATE contractor_companies 
SET name = 'PETROECUADOR', 
    code = 'PETROEC001', 
    description = 'Empresa contratista estatal de petróleos del Ecuador',
    active = 1
WHERE id = 1;

UPDATE contractor_companies 
SET name = 'ABC Construction', 
    code = 'ABC002', 
    description = 'Empresa contratista de construcción',
    active = 1
WHERE id = 2;

-- Insertar empresa DEF Corp si no existe
INSERT IGNORE INTO contractor_companies (id, name, code, description, active, created_at, updated_at) 
VALUES (3, 'DEF Corp', 'DEF003', 'Especialista en edificaciones', 1, NOW(), NOW());

-- 3. Limpiar configuración actual de OrientOil
DELETE FROM business_contractor_companies WHERE business_id = 3;

-- 4. Configurar OrientOil con MÚLTIPLES empresas contratistas
INSERT INTO business_contractor_companies (business_id, contractor_company_id) VALUES
(3, 1), -- PETROECUADOR
(3, 2), -- ABC Construction  
(3, 3); -- DEF Corp

-- 5. Mantener backward compatibility con contractor_company_id (primera empresa)
UPDATE businesses 
SET contractor_company_id = 1 
WHERE id = 3;

-- 6. Configurar bloques específicos para cada empresa contratista
-- Limpiar bloques actuales
DELETE FROM business_contractor_blocks WHERE business_id = 3;

-- Asegurar que existen los bloques
INSERT IGNORE INTO contractor_blocks (id, name, code, description, contractor_company_id, active, created_at, updated_at) VALUES
(1, 'Bloque 15', 'BLK15', 'Bloque de perforación 15', 1, 1, NOW(), NOW()),
(2, 'Bloque 18', 'BLK18', 'Bloque de perforación 18', 1, 1, NOW(), NOW()),
(3, 'Construcción A', 'CONST-A', 'Proyecto de construcción A', 2, 1, NOW(), NOW()),
(4, 'Construcción B', 'CONST-B', 'Proyecto de construcción B', 2, 1, NOW(), NOW()),
(5, 'Edificación Central', 'EDIF-C', 'Edificación del complejo central', 3, 1, NOW(), NOW());

-- Configurar bloques para OrientOil
INSERT INTO business_contractor_blocks (business_id, contractor_block_id) VALUES
(3, 1), -- Bloque 15 de PETROECUADOR
(3, 2), -- Bloque 18 de PETROECUADOR
(3, 3), -- Construcción A de ABC Construction
(3, 4), -- Construcción B de ABC Construction
(3, 5); -- Edificación Central de DEF Corp

-- 7. Verificar configuración final
SELECT 'CONFIGURACIÓN FINAL DE ORIENTOIL' as resultado;

-- Empresas contratistas configuradas
SELECT 
    'Empresas contratistas asignadas a OrientOil:' as detalle,
    bcc.business_id,
    cc.id as contractor_id,
    cc.name as contractor_name,
    cc.code as contractor_code
FROM business_contractor_companies bcc
JOIN contractor_companies cc ON bcc.contractor_company_id = cc.id
WHERE bcc.business_id = 3
ORDER BY cc.name;

-- Bloques configurados por empresa contratista
SELECT 
    'Bloques configurados para OrientOil:' as detalle,
    bcb.business_id,
    cc.name as contractor_company,
    cb.name as block_name,
    cb.code as block_code
FROM business_contractor_blocks bcb
JOIN contractor_blocks cb ON bcb.contractor_block_id = cb.id
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE bcb.business_id = 3
ORDER BY cc.name, cb.name;

SELECT 'CONFIGURACIÓN COMPLETADA EXITOSAMENTE' as status;
