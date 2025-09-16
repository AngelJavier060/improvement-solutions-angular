-- =====================================================
-- SCRIPT PARA AGREGAR CAMPOS FALTANTES A BUSINESS_EMPLOYEES
-- Ejecutar en MySQL Workbench para la base de datos de Improvement Solutions
-- Fecha: 15 de septiembre de 2025
-- =====================================================

-- IMPORTANTE: Usar la base de datos correcta
USE db_improvement_solutions;

-- Verificar qué tablas existen
SHOW TABLES LIKE '%employee%';

-- Verificar estructura actual de la tabla business_employees
DESCRIBE business_employees;

-- 1. Agregar campos de nombres separados
ALTER TABLE business_employees 
ADD COLUMN apellidos VARCHAR(100) AFTER name,
ADD COLUMN nombres VARCHAR(100) AFTER apellidos;

-- 2. Agregar código de empresa manual
ALTER TABLE business_employees 
ADD COLUMN codigo_empresa VARCHAR(50) AFTER business_id;

-- 3. Agregar campos de lugar de nacimiento
ALTER TABLE business_employees 
ADD COLUMN lugar_nacimiento_provincia VARCHAR(100) AFTER date_birth,
ADD COLUMN lugar_nacimiento_ciudad VARCHAR(100) AFTER lugar_nacimiento_provincia,
ADD COLUMN lugar_nacimiento_parroquia VARCHAR(100) AFTER lugar_nacimiento_ciudad;

-- 4. Agregar dirección domiciliaria (diferente a dirección familiar)
ALTER TABLE business_employees 
ADD COLUMN direccion_domiciliaria TEXT AFTER address;

-- 5. Agregar fecha de ingreso a la empresa
ALTER TABLE business_employees 
ADD COLUMN fecha_ingreso DATE AFTER email;

-- 6. Agregar código IESS específico (diferente al campo iess actual que es texto)
ALTER TABLE business_employees 
ADD COLUMN codigo_iess VARCHAR(50) AFTER iess;

-- 7. Agregar tipo de sangre
ALTER TABLE business_employees 
ADD COLUMN tipo_sangre VARCHAR(10) AFTER email;

-- 8. Agregar nivel de educación (complementario al degree_id existente)
ALTER TABLE business_employees 
ADD COLUMN nivel_educacion VARCHAR(100) AFTER degree_id;

-- 9. Agregar campo de discapacidad
ALTER TABLE business_employees 
ADD COLUMN discapacidad VARCHAR(200) AFTER nivel_educacion;

-- 10. Agregar relación con tipo de contrato (ya existe la tabla type_contracts)
ALTER TABLE business_employees 
ADD COLUMN type_contract_id BIGINT AFTER position,
ADD CONSTRAINT fk_business_employee_type_contract 
    FOREIGN KEY (type_contract_id) 
    REFERENCES type_contracts(id) 
    ON DELETE SET NULL;

-- 11. Agregar relación con position_id (en lugar del campo position como string)
ALTER TABLE business_employees 
ADD COLUMN position_id BIGINT AFTER type_contract_id,
ADD CONSTRAINT fk_business_employee_position 
    FOREIGN KEY (position_id) 
    REFERENCES positions(id) 
    ON DELETE SET NULL;

-- 12. Agregar relación con department (a través de position o directo)
ALTER TABLE business_employees 
ADD COLUMN department_id BIGINT AFTER position_id,
ADD CONSTRAINT fk_business_employee_department 
    FOREIGN KEY (department_id) 
    REFERENCES departments(id) 
    ON DELETE SET NULL;

-- =====================================================
-- CAMPOS ADICIONALES RECOMENDADOS (OPCIONALES)
-- =====================================================

-- 13. Índices para mejorar rendimiento
CREATE INDEX idx_business_employees_cedula ON business_employees(cedula);
CREATE INDEX idx_business_employees_codigo_empresa ON business_employees(codigo_empresa);
CREATE INDEX idx_business_employees_business_id ON business_employees(business_id);
CREATE INDEX idx_business_employees_active ON business_employees(active);
CREATE INDEX idx_business_employees_fecha_ingreso ON business_employees(fecha_ingreso);

-- =====================================================
-- CONSULTA PARA VERIFICAR LA ESTRUCTURA ACTUALIZADA
-- =====================================================

-- Verificar que todos los campos se agregaron correctamente
DESCRIBE business_employees;

-- Consulta de ejemplo para ver todos los campos
SELECT 
    id,
    business_id,
    codigo_empresa,
    cedula,
    apellidos,
    nombres,
    name AS nombre_completo,
    phone,
    date_birth,
    lugar_nacimiento_provincia,
    lugar_nacimiento_ciudad,
    lugar_nacimiento_parroquia,
    address AS direccion_familiar,
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
    codigo_iess,
    nivel_educacion,
    discapacidad,
    gender_id,
    civil_status_id,
    etnia_id,
    degree_id,
    status,
    image,
    created_at,
    updated_at
FROM business_employees 
LIMIT 5;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
/*
1. CAMPOS MANTENIDOS: No eliminé ningún campo existente para mantener compatibilidad
2. NUEVOS CAMPOS: Agregué todos los campos solicitados en la lista
3. RELACIONES: Mantuve las relaciones existentes y agregué nuevas donde corresponde
4. ÍNDICES: Agregué índices en campos que se consultarán frecuentemente
5. FLEXIBILIDAD: Los campos son NULL por defecto para no afectar registros existentes

CAMPOS PRINCIPALES AGREGADOS:
- codigo_empresa: Código manual de la empresa
- apellidos/nombres: Separación de nombres completos
- lugar_nacimiento_*: Lugar de nacimiento completo
- direccion_domiciliaria: Dirección de residencia actual
- fecha_ingreso: Fecha de ingreso a la empresa
- tipo_sangre: Tipo de sangre del empleado
- codigo_iess: Código específico del IESS
- nivel_educacion: Nivel educativo detallado
- discapacidad: Información sobre discapacidades
- position_id: Relación con tabla de cargos
- department_id: Relación con departamentos
- type_contract_id: Relación con tipos de contrato

PRÓXIMOS PASOS:
1. Ejecutar este script en MySQL Workbench
2. Actualizar el modelo BusinessEmployee.java en Spring Boot
3. Actualizar los DTOs y servicios correspondientes
4. Actualizar el frontend para incluir los nuevos campos
*/