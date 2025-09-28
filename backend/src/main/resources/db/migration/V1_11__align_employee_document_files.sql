-- Ensure business_employee_document_files schema aligns with JPA entity (idempotent)
-- Adds legacy-compatible columns when missing and backfills values

START TRANSACTION;

-- 1) Add column `file` (nullable) if missing
SET @has_file_col := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS c
  WHERE c.TABLE_SCHEMA = DATABASE()
    AND c.TABLE_NAME = 'business_employee_document_files'
    AND c.COLUMN_NAME = 'file'
);
SET @sql := IF(@has_file_col = 0,
  'ALTER TABLE business_employee_document_files ADD COLUMN `file` VARCHAR(512) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Add column `name` (nullable) if missing
SET @has_name_col := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS c
  WHERE c.TABLE_SCHEMA = DATABASE()
    AND c.TABLE_NAME = 'business_employee_document_files'
    AND c.COLUMN_NAME = 'name'
);
SET @sql := IF(@has_name_col = 0,
  'ALTER TABLE business_employee_document_files ADD COLUMN `name` VARCHAR(255) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Add column `business_employee_document_id` (nullable) if missing
SET @has_legacy_fk := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS c
  WHERE c.TABLE_SCHEMA = DATABASE()
    AND c.TABLE_NAME = 'business_employee_document_files'
    AND c.COLUMN_NAME = 'business_employee_document_id'
);
SET @sql := IF(@has_legacy_fk = 0,
  'ALTER TABLE business_employee_document_files ADD COLUMN `business_employee_document_id` BIGINT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Backfill data for new columns
-- 4.1) Ensure `file` mirrors `file_path` when null
UPDATE business_employee_document_files
SET `file` = file_path
WHERE `file` IS NULL;

-- 4.2) Ensure `name` has a readable value
UPDATE business_employee_document_files
SET `name` = COALESCE(`file_name`, SUBSTRING_INDEX(`file_path`, '/', -1), 'document-file')
WHERE `name` IS NULL OR `name` = '';

-- 4.3) Populate legacy id column with current FK value when null
UPDATE business_employee_document_files
SET `business_employee_document_id` = `document_id`
WHERE `business_employee_document_id` IS NULL;

-- 5) Ensure helpful index on document_id
SET @has_idx := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'business_employee_document_files'
    AND s.INDEX_NAME = 'idx_bedf_document_id'
);
SET @sql := IF(@has_idx = 0,
  'ALTER TABLE business_employee_document_files ADD INDEX idx_bedf_document_id (document_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;
