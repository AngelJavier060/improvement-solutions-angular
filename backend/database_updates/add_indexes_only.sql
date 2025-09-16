-- =====================================================
-- SCRIPT CORREGIDO PARA CAMPOS FALTANTES EN BUSINESS_EMPLOYEES
-- Solo agregar campos que realmente no existen
-- Fecha: 15 de septiembre de 2025
-- =====================================================

-- IMPORTANTE: Usar la base de datos correcta
USE db_improvement_solutions;

-- =====================================================
-- VERIFICAR CAMPOS EXISTENTES ANTES DE AGREGAR
-- =====================================================

-- Verificar estructura actual
DESCRIBE business_employees;

-- =====================================================
-- CAMPOS QUE PODRÍAN FALTAR (verificar antes de ejecutar)
-- =====================================================

-- Solo ejecutar SI el campo NO existe en la tabla:

-- Verificar si falta 'codigo_iess' (diferente al campo 'iess' existente)
-- ALTER TABLE business_employees 
-- ADD COLUMN codigo_iess VARCHAR(50) AFTER iess;

-- =====================================================
-- AGREGAR SOLO LOS ÍNDICES (estos son seguros de agregar)
-- =====================================================

-- Índices para mejorar rendimiento (solo si no existen)
CREATE INDEX IF NOT EXISTS idx_business_employees_cedula ON business_employees(cedula);
CREATE INDEX IF NOT EXISTS idx_business_employees_codigo_empresa ON business_employees(codigo_empresa);
CREATE INDEX IF NOT EXISTS idx_business_employees_business_id ON business_employees(business_id);
CREATE INDEX IF NOT EXISTS idx_business_employees_active ON business_employees(active);
CREATE INDEX IF NOT EXISTS idx_business_employees_fecha_ingreso ON business_employees(fecha_ingreso);

-- =====================================================
-- VERIFICAR QUE TODAS LAS FOREIGN KEYS EXISTEN
-- =====================================================

-- Verificar constraints existentes
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'db_improvement_solutions' 
AND TABLE_NAME = 'business_employees'
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- =====================================================
-- CONSULTA PARA VER TODOS LOS CAMPOS ACTUALES
-- =====================================================

-- Verificar que todos los campos están presentes
SELECT 
    id,
    business_id,
    codigo_empresa,
    cedula,
    apellidos,
    nombres,
    phone,
    date_birth,
    lugar_nacimiento_provincia,
    lugar_nacimiento_ciudad,
    lugar_nacimiento_parroquia,
    direccion_familiar,
    direccion_domiciliaria,
    email,
    fecha_ingreso,
    tipo_sangre,
    position,
    position_id,
    department_id,
    type_contract_id,
    resident_address,
    active,
    contact_name,
    contact_phone,
    contact_kinship,
    iess,
    -- codigo_iess, -- Verificar si existe
    nivel_educacion,
    discapacidad,
    gender_id,
    civil_status_id,
    etnia_id,
    degree_id,
    status,
    image_path,
    created_at,
    updated_at
FROM business_employees 
LIMIT 5;

-- =====================================================
-- CAMPOS CONFIRMADOS QUE YA EXISTEN (NO AGREGAR):
-- =====================================================
/*
✅ CAMPOS YA EXISTENTES EN LA TABLA:
- id (bigint, PK)
- business_id (bigint, FK)
- codigo_empresa (varchar(50))
- cedula (varchar(255))
- apellidos (varchar(100))
- nombres (varchar(100))
- phone (varchar(255))
- date_birth (datetime(6))
- lugar_nacimiento_provincia (varchar(100))
- lugar_nacimiento_ciudad (varchar(100))
- lugar_nacimiento_parroquia (varchar(100))
- direccion_familiar (text)
- direccion_domiciliaria (text)
- email (varchar(255))
- fecha_ingreso (date)
- tipo_sangre (varchar(10))
- position (varchar(255))
- position_id (bigint)
- department_id (bigint)
- type_contract_id (bigint)
- resident_address (varchar(255))
- active (bit(1))
- contact_name (varchar(255))
- contact_phone (varchar(255))
- contact_kinship (varchar(255))
- iess (varchar(255))
- nivel_educacion (varchar(100))
- discapacidad (varchar(200))
- gender_id (bigint)
- civil_status_id (bigint)
- etnia_id (bigint)
- degree_id (bigint)
- status (varchar(255))
- image_path (varchar(255))
- created_at (datetime(6))
- updated_at (datetime(6))

🎉 CONCLUSIÓN: 
¡LA TABLA YA ESTÁ COMPLETA CON TODOS LOS CAMPOS NECESARIOS!
Solo faltan los índices para optimizar las consultas.

🔄 PRÓXIMOS PASOS:
1. ✅ Ejecutar solo la parte de índices de este script
2. 🔄 Actualizar el modelo BusinessEmployee.java
3. 🔄 Actualizar DTOs y servicios
4. 🔄 Actualizar frontend para usar todos los campos
*/