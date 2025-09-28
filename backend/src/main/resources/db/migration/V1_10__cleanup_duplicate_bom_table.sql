-- Cleanup duplicate business_obligation_matrix table
-- Keep only business_obligation_matrices (plural) which has the correct data

START TRANSACTION;

-- 1. Verificar si existe la tabla singular (incorrecta)
SET @table_exists := (
    SELECT COUNT(1) 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'business_obligation_matrix'
);

-- 2. Si existe la tabla singular, verificar que esté vacía antes de eliminarla
SET @has_data := 0;
SET @sql := IF(@table_exists > 0, 
    'SELECT COUNT(*) INTO @has_data FROM business_obligation_matrix', 
    'SELECT 0 INTO @has_data');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 3. Solo eliminar la tabla singular si existe y está vacía
SET @sql := IF(@table_exists > 0 AND @has_data = 0, 
    'DROP TABLE business_obligation_matrix', 
    'SELECT 1 -- Table does not exist or has data, skipping drop');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 4. Verificar que todas las foreign keys apunten a la tabla correcta (plural)
-- Esto ya debería estar arreglado por V1_3__fix_bom_files_fk.sql, pero verificamos

-- Verificar FK de business_obligation_matrix_files
SET @wrong_fk := (
    SELECT kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'business_obligation_matrix_files'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrix'
    LIMIT 1
);

-- Si aún existe una FK incorrecta, eliminarla
SET @sql := IF(@wrong_fk IS NOT NULL,
    CONCAT('ALTER TABLE business_obligation_matrix_files DROP FOREIGN KEY ', @wrong_fk),
    'SELECT 1 -- No wrong FK found');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- Asegurar que existe la FK correcta
SET @correct_fk := (
    SELECT COUNT(1)
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    JOIN information_schema.KEY_COLUMN_USAGE kcu
    ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
    AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
    AND rc.TABLE_NAME = 'business_obligation_matrix_files'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrices'
);

-- Crear la FK correcta si no existe
SET @sql := IF(@correct_fk = 0,
    'ALTER TABLE business_obligation_matrix_files 
     ADD CONSTRAINT FK_bomf_bom_correct 
     FOREIGN KEY (business_obligation_matrix_id) 
     REFERENCES business_obligation_matrices(id) 
     ON DELETE CASCADE 
     ON UPDATE CASCADE',
    'SELECT 1 -- Correct FK already exists');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 5. Verificar FK de business_obligation_matrix_versions también
SET @versions_wrong_fk := (
    SELECT kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'business_obligation_matrix_versions'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrix'
    LIMIT 1
);

-- Si existe FK incorrecta en versions, corregirla
SET @sql := IF(@versions_wrong_fk IS NOT NULL,
    CONCAT('ALTER TABLE business_obligation_matrix_versions DROP FOREIGN KEY ', @versions_wrong_fk),
    'SELECT 1 -- No wrong FK in versions table');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- Asegurar FK correcta en versions
SET @versions_correct_fk := (
    SELECT COUNT(1)
    FROM information_schema.REFERENTIAL_CONSTRAINTS rc
    JOIN information_schema.KEY_COLUMN_USAGE kcu
    ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
    AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
    WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
    AND rc.TABLE_NAME = 'business_obligation_matrix_versions'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrices'
);

SET @sql := IF(@versions_correct_fk = 0,
    'ALTER TABLE business_obligation_matrix_versions 
     ADD CONSTRAINT FK_bomv_bom_correct 
     FOREIGN KEY (business_obligation_matrix_id) 
     REFERENCES business_obligation_matrices(id) 
     ON DELETE CASCADE 
     ON UPDATE CASCADE',
    'SELECT 1 -- Correct FK already exists in versions');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

COMMIT;
