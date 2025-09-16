-- Script para configurar empresa contratista para OrientOil
-- Base de datos: db_improvement_solutions

USE db_improvement_solutions;

-- 1. Asignar empresa contratista "Constructora ABC S.A." a OrientOil
UPDATE businesses 
SET contractor_company_id = 1, 
    updated_at = NOW()
WHERE id = 3;

-- 2. Asignar algunos bloques de la empresa contratista a OrientOil
INSERT IGNORE INTO business_contractor_blocks (business_id, contractor_block_id) VALUES
(3, 1), -- Bloque 15 - ABC-B15
(3, 2), -- Bloque 18 - ABC-B18  
(3, 3); -- Bloque 22 - ABC-B22

-- 3. Verificar la configuración
SELECT 
    b.id,
    b.name as empresa_nombre,
    b.ruc,
    cc.name as empresa_contratista,
    cc.code as codigo_contratista
FROM businesses b
LEFT JOIN contractor_companies cc ON b.contractor_company_id = cc.id
WHERE b.id = 3;

-- 4. Ver bloques asignados
SELECT 
    b.name as empresa,
    cb.name as bloque,
    cb.code as codigo_bloque,
    cc.name as empresa_contratista
FROM businesses b
JOIN business_contractor_blocks bcb ON b.id = bcb.business_id
JOIN contractor_blocks cb ON bcb.contractor_block_id = cb.id
JOIN contractor_companies cc ON cb.contractor_company_id = cc.id
WHERE b.id = 3;