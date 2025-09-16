-- Verificar configuración actual de OrientOil y depurar el problema
-- Base de datos: db_improvement_solutions

USE db_improvement_solutions;

-- 1. Verificar la configuración actual de OrientOil
SELECT 
    b.id,
    b.name,
    b.ruc,
    b.contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code,
    cc.active as contractor_company_active
FROM businesses b
LEFT JOIN contractor_companies cc ON b.contractor_company_id = cc.id
WHERE b.id = 3;

-- 2. Verificar si la empresa contratista existe y está activa
SELECT 
    id,
    name,
    code,
    description,
    active,
    created_at,
    updated_at
FROM contractor_companies 
WHERE id = 1;

-- 3. Verificar todos los bloques de la empresa contratista
SELECT 
    cb.id,
    cb.name,
    cb.code,
    cb.description,
    cb.active,
    cb.contractor_company_id,
    cc.name as contractor_company_name
FROM contractor_blocks cb
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE cb.contractor_company_id = 1 AND cb.active = TRUE;

-- 4. Verificar la relación business_contractor_blocks
SELECT 
    bcb.business_id,
    bcb.contractor_block_id,
    cb.name as block_name,
    cb.code as block_code,
    cc.name as contractor_company_name
FROM business_contractor_blocks bcb
JOIN contractor_blocks cb ON bcb.contractor_block_id = cb.id
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE bcb.business_id = 3;

-- 5. Verificar que OrientOil tenga la empresa contratista configurada
-- Si no la tiene, la configuramos
UPDATE businesses 
SET contractor_company_id = 1 
WHERE id = 3 AND (contractor_company_id IS NULL OR contractor_company_id != 1);

-- 6. Verificar configuración final
SELECT 'VERIFICACIÓN FINAL' as estado;

SELECT 
    b.id as business_id,
    b.name as business_name,
    b.contractor_company_id,
    cc.name as contractor_company_name,
    cc.code as contractor_company_code,
    cc.active as contractor_active
FROM businesses b
LEFT JOIN contractor_companies cc ON b.contractor_company_id = cc.id
WHERE b.id = 3;