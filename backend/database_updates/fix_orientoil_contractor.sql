-- Verificar y configurar empresa contratista para OrientOil
-- Base de datos: db_improvement_solutions

USE db_improvement_solutions;

-- 1. Verificar información actual de OrientOil (ID 3)
SELECT 
    b.id,
    b.name,
    b.ruc,
    b.contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code
FROM businesses b
LEFT JOIN contractor_companies cc ON b.contractor_company_id = cc.id
WHERE b.id = 3;

-- 2. Ver bloques configurados para OrientOil
SELECT 
    bcb.business_id,
    cb.id as block_id,
    cb.name as block_name,
    cb.code as block_code,
    cc.name as contractor_company_name
FROM business_contractor_blocks bcb
JOIN contractor_blocks cb ON bcb.contractor_block_id = cb.id
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE bcb.business_id = 3;

-- 3. Actualizar empresa contratista 1 para que sea PETROECUADOR
UPDATE contractor_companies 
SET name = 'PETROECUADOR', 
    code = 'PETROEC001', 
    description = 'Empresa contratista estatal de petróleos del Ecuador'
WHERE id = 1;

-- 4. Configurar OrientOil con PETROECUADOR como empresa contratista
UPDATE businesses 
SET contractor_company_id = 1 
WHERE id = 3;

-- 5. Configurar bloques específicos para OrientOil
INSERT IGNORE INTO business_contractor_blocks (business_id, contractor_block_id) VALUES
(3, 1), -- Bloque 15 de PETROECUADOR
(3, 2); -- Bloque 18 de PETROECUADOR

-- 6. Verificar configuración final
SELECT 'CONFIGURACIÓN FINAL DE ORIENTOIL' as resultado;

-- Empresas contratistas en la tabla junction
SELECT 'EMPRESAS CONTRATISTAS EN JUNCTION TABLE' as titulo;
SELECT 
    bcc.business_id,
    bcc.contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code
FROM business_contractor_companies bcc
JOIN contractor_companies cc ON bcc.contractor_company_id = cc.id
WHERE bcc.business_id = 3;

-- Bloques configurados para OrientOil
SELECT 'BLOQUES CONFIGURADOS PARA ORIENTOIL' as titulo;
SELECT 
    bcb.business_id,
    cb.id as block_id,
    cb.name as block_name,
    cb.code as block_code,
    cb.contractor_company_id,
    cc.name as contractor_company_name
FROM business_contractor_blocks bcb
JOIN contractor_blocks cb ON bcb.contractor_block_id = cb.id
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE bcb.business_id = 3
ORDER BY cc.name, cb.name;

-- Información básica de la empresa (backward compatibility)
SELECT 'INFORMACIÓN BÁSICA ORIENTOIL' as titulo;
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.ruc,
    b.contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code
FROM businesses b
LEFT JOIN contractor_companies cc ON b.contractor_company_id = cc.id
WHERE b.id = 3;