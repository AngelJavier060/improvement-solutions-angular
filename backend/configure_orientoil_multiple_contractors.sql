-- Script para configurar múltiples empresas contratistas para OrientOil
-- Base de datos: improvement_solutions

-- 1. Verificar configuración actual de OrientOil (ID 3)
SELECT 'CONFIGURACIÓN ACTUAL DE ORIENTOIL' as titulo;

SELECT 
    b.id,
    b.name,
    b.ruc,
    b.contractor_company_id as empresa_contratista_antigua
FROM businesses b
WHERE b.id = 3;

-- 2. Ver empresas contratistas en relación many-to-many
SELECT 'EMPRESAS CONTRATISTAS MÚLTIPLES CONFIGURADAS' as titulo;

SELECT 
    bcc.business_id,
    cc.id as contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code
FROM business_contractor_companies bcc
JOIN contractor_companies cc ON bcc.contractor_company_id = cc.id
WHERE bcc.business_id = 3;

-- 3. Ver bloques configurados para OrientOil
SELECT 'BLOQUES CONFIGURADOS PARA ORIENTOIL' as titulo;

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

-- 4. Ver todas las empresas contratistas disponibles
SELECT 'TODAS LAS EMPRESAS CONTRATISTAS DISPONIBLES' as titulo;

SELECT 
    cc.id,
    cc.name,
    cc.code,
    cc.description,
    cc.active
FROM contractor_companies cc
WHERE cc.active = 1
ORDER BY cc.name;

-- 5. Agregar múltiples empresas contratistas a OrientOil
-- Primero limpiamos las configuraciones actuales
DELETE FROM business_contractor_companies WHERE business_id = 3;

-- Agregamos múltiples empresas contratistas para OrientOil
INSERT INTO business_contractor_companies (business_id, contractor_company_id) VALUES
(3, 1), -- PETROECUADOR
(3, 2), -- Construcciones ABC
(3, 3); -- Edificaciones DEF Corp.

-- 6. Verificar la nueva configuración
SELECT 'NUEVA CONFIGURACIÓN DE MÚLTIPLES EMPRESAS CONTRATISTAS' as titulo;

SELECT 
    bcc.business_id,
    cc.id as contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code
FROM business_contractor_companies bcc
JOIN contractor_companies cc ON bcc.contractor_company_id = cc.id
WHERE bcc.business_id = 3
ORDER BY cc.name;

-- 7. Ver bloques disponibles por empresa contratista
SELECT 'BLOQUES DISPONIBLES POR EMPRESA CONTRATISTA' as titulo;

SELECT 
    cc.id as contractor_company_id,
    cc.name as contractor_company_name,
    cb.id as block_id,
    cb.name as block_name,
    cb.code as block_code,
    cb.active
FROM contractor_companies cc
LEFT JOIN contractor_blocks cb ON cc.id = cb.contractor_company_id
WHERE cc.id IN (1, 2, 3) AND cc.active = 1
ORDER BY cc.name, cb.name;