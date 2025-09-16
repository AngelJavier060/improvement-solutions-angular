-- =====================================================
-- SCRIPT PARA CREAR ÍNDICES EN BUSINESS_EMPLOYEES
-- Compatible con MySQL (sin IF NOT EXISTS)
-- Fecha: 15 de septiembre de 2025
-- =====================================================

USE db_improvement_solutions;

-- =====================================================
-- CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

-- Nota: Si el índice ya existe, MySQL dará un error pero no afectará los datos
-- Ejecutar uno por uno para identificar cuáles ya existen

-- Índice para búsquedas por cédula
CREATE INDEX idx_business_employees_cedula ON business_employees(cedula);

-- Índice para búsquedas por código de empresa
CREATE INDEX idx_business_employees_codigo_empresa ON business_employees(codigo_empresa);

-- Índice para relación con business
CREATE INDEX idx_business_employees_business_id ON business_employees(business_id);

-- Índice para filtrar empleados activos
CREATE INDEX idx_business_employees_active ON business_employees(active);

-- Índice para búsquedas por fecha de ingreso
CREATE INDEX idx_business_employees_fecha_ingreso ON business_employees(fecha_ingreso);

-- Índices adicionales recomendados
CREATE INDEX idx_business_employees_email ON business_employees(email);
CREATE INDEX idx_business_employees_status ON business_employees(status);
CREATE INDEX idx_business_employees_position_id ON business_employees(position_id);
CREATE INDEX idx_business_employees_department_id ON business_employees(department_id);

-- =====================================================
-- VERIFICAR ÍNDICES CREADOS
-- =====================================================

-- Mostrar todos los índices de la tabla business_employees
SHOW INDEX FROM business_employees;

-- =====================================================
-- CONSULTA DE PRUEBA PARA VERIFICAR FUNCIONAMIENTO
-- =====================================================

-- Consulta optimizada que debería usar los índices
SELECT 
    id,
    business_id,
    codigo_empresa,
    cedula,
    apellidos,
    nombres,
    email,
    fecha_ingreso,
    active,
    status
FROM business_employees 
WHERE active = 1 
AND business_id = 1 
ORDER BY fecha_ingreso DESC
LIMIT 10;