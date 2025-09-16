-- Script para verificar y configurar empresa contratista para OrientOil
-- Base de datos: db_improvement_solutions

USE db_improvement_solutions;

-- 1. Verificar datos de la empresa OrientOil (ID 3)
SELECT 
    id,
    name,
    ruc,
    contractor_company_id,
    'Empresa OrientOil' as descripcion
FROM businesses 
WHERE id = 3;

-- 2. Ver todas las empresas contratistas disponibles
SELECT 
    id,
    name,
    code,
    description,
    active,
    'Empresas contratistas disponibles' as descripcion
FROM contractor_companies 
WHERE active = TRUE;

-- 3. Ver todos los bloques disponibles
SELECT 
    cb.id,
    cb.name,
    cb.code,
    cb.description,
    cc.name as empresa_contratista,
    'Bloques disponibles' as descripcion
FROM contractor_blocks cb
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE cb.active = TRUE
ORDER BY cc.name, cb.name;

-- 4. Ver qué bloques tiene configurados OrientOil
SELECT 
    bcb.business_id,
    bcb.contractor_block_id,
    cb.name as bloque_nombre,
    cc.name as empresa_contratista,
    'Bloques configurados para OrientOil' as descripcion
FROM business_contractor_blocks bcb
JOIN contractor_blocks cb ON bcb.contractor_block_id = cb.id
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE bcb.business_id = 3;