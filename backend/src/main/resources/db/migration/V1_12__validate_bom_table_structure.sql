-- Validation migration to ensure correct table structure and prevent recreation of wrong table
-- This migration validates that only the correct table exists and all FKs point to it

START TRANSACTION;

-- 1. Ensure the correct table exists
SET @correct_table_exists := (
    SELECT COUNT(1) 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'business_obligation_matrices'
);

-- 2. Ensure the incorrect table does NOT exist
SET @incorrect_table_exists := (
    SELECT COUNT(1) 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'business_obligation_matrix'
);

-- 3. Validation checks
SELECT CASE 
    WHEN @correct_table_exists = 1 THEN 'PASS: business_obligation_matrices exists'
    ELSE 'FAIL: business_obligation_matrices missing'
END as validation_1;

SELECT CASE 
    WHEN @incorrect_table_exists = 0 THEN 'PASS: business_obligation_matrix does not exist'
    ELSE 'FAIL: business_obligation_matrix still exists and should be dropped'
END as validation_2;

-- 4. Ensure all FKs point to the correct table
SET @files_fk_correct := (
    SELECT COUNT(1)
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'business_obligation_matrix_files'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrices'
);

SET @versions_fk_correct := (
    SELECT COUNT(1)
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'business_obligation_matrix_versions'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrices'
);

-- 5. FK validation
SELECT CASE 
    WHEN @files_fk_correct >= 1 THEN 'PASS: business_obligation_matrix_files FK points to correct table'
    ELSE 'FAIL: business_obligation_matrix_files FK missing or incorrect'
END as validation_3;

SELECT CASE 
    WHEN @versions_fk_correct >= 1 THEN 'PASS: business_obligation_matrix_versions FK points to correct table'
    ELSE 'FAIL: business_obligation_matrix_versions FK missing or incorrect'
END as validation_4;

-- 6. Ensure no FKs point to the wrong table
SET @wrong_fks := (
    SELECT COUNT(1)
    FROM information_schema.KEY_COLUMN_USAGE kcu
    WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrix'
);

SELECT CASE 
    WHEN @wrong_fks = 0 THEN 'PASS: No FKs point to incorrect table'
    ELSE 'FAIL: Some FKs still point to business_obligation_matrix'
END as validation_5;

-- 7. Add a comment to the correct table to mark it as the official one
ALTER TABLE business_obligation_matrices 
COMMENT = 'Official business obligation matrix table - DO NOT create business_obligation_matrix (singular)';

-- 8. Final summary
SELECT 
    @correct_table_exists as correct_table_exists,
    @incorrect_table_exists as incorrect_table_exists,
    @files_fk_correct as files_fk_correct,
    @versions_fk_correct as versions_fk_correct,
    @wrong_fks as wrong_fks_count,
    CASE 
        WHEN @correct_table_exists = 1 
        AND @incorrect_table_exists = 0 
        AND @files_fk_correct >= 1 
        AND @versions_fk_correct >= 1 
        AND @wrong_fks = 0 
        THEN 'ALL VALIDATIONS PASSED - Structure is correct'
        ELSE 'VALIDATION FAILED - Manual intervention needed'
    END as overall_status;

COMMIT;
