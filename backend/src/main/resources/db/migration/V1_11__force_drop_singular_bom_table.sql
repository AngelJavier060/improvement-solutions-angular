-- Force drop the incorrect business_obligation_matrix table (singular)
-- This table should not exist as all code references business_obligation_matrices (plural)

START TRANSACTION;

-- 1. First, check if the singular table exists and is empty
SET @singular_exists := (
    SELECT COUNT(1) 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'business_obligation_matrix'
);

-- 2. If it exists, check if it's empty
SET @singular_count := 0;
SET @sql := IF(@singular_exists > 0, 
    'SELECT COUNT(*) INTO @singular_count FROM business_obligation_matrix', 
    'SELECT 0 INTO @singular_count');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 3. Log what we found
SELECT CONCAT('Tabla business_obligation_matrix existe: ', IF(@singular_exists > 0, 'SI', 'NO')) as info;
SELECT CONCAT('Registros en business_obligation_matrix: ', @singular_count) as info;

-- 4. Check the plural table has data
SET @plural_count := (SELECT COUNT(*) FROM business_obligation_matrices);
SELECT CONCAT('Registros en business_obligation_matrices: ', @plural_count) as info;

-- 5. Only drop if singular table exists and is empty, and plural has data
SET @should_drop := (@singular_exists > 0 AND @singular_count = 0 AND @plural_count > 0);

-- 6. Drop any foreign keys pointing to the singular table first
-- Check business_obligation_matrix_files FK
SET @files_wrong_fk := (
    SELECT kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'business_obligation_matrix_files'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrix'
    LIMIT 1
);

SET @sql := IF(@files_wrong_fk IS NOT NULL,
    CONCAT('ALTER TABLE business_obligation_matrix_files DROP FOREIGN KEY ', @files_wrong_fk),
    'SELECT "No wrong FK in files table" as info');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- Check business_obligation_matrix_versions FK
SET @versions_wrong_fk := (
    SELECT kcu.CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'business_obligation_matrix_versions'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrix'
    LIMIT 1
);

SET @sql := IF(@versions_wrong_fk IS NOT NULL,
    CONCAT('ALTER TABLE business_obligation_matrix_versions DROP FOREIGN KEY ', @versions_wrong_fk),
    'SELECT "No wrong FK in versions table" as info');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 7. Now drop the singular table if safe to do so
SET @sql := IF(@should_drop = 1, 
    'DROP TABLE business_obligation_matrix', 
    'SELECT "Singular table not dropped - either does not exist, has data, or plural table is empty" as info');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 8. Ensure correct FKs exist
-- Files table FK
SET @files_correct_fk := (
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

SET @sql := IF(@files_correct_fk = 0,
    'ALTER TABLE business_obligation_matrix_files 
     ADD CONSTRAINT FK_bomf_matrices 
     FOREIGN KEY (business_obligation_matrix_id) 
     REFERENCES business_obligation_matrices(id) 
     ON DELETE CASCADE 
     ON UPDATE CASCADE',
    'SELECT "Correct FK already exists in files table" as info');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- Versions table FK
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
     ADD CONSTRAINT FK_bomv_matrices 
     FOREIGN KEY (business_obligation_matrix_id) 
     REFERENCES business_obligation_matrices(id) 
     ON DELETE CASCADE 
     ON UPDATE CASCADE',
    'SELECT "Correct FK already exists in versions table" as info');
PREPARE stmt FROM @sql; 
EXECUTE stmt; 
DEALLOCATE PREPARE stmt;

-- 9. Final verification
SET @final_singular_exists := (
    SELECT COUNT(1) 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'business_obligation_matrix'
);

SELECT CASE 
    WHEN @final_singular_exists = 0 THEN 'SUCCESS: Tabla business_obligation_matrix eliminada correctamente'
    ELSE 'WARNING: Tabla business_obligation_matrix aún existe'
END as resultado;

COMMIT;
