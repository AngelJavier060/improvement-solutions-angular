-- Fix wrong foreign key on business_obligation_matrix_files (idempotent)
-- Root cause: FK pointed to `business_obligation_matrix` (singular). It must reference `business_obligation_matrices` (plural).

START TRANSACTION;

-- 1) Drop old wrong FK (if exists)
SET @old_fk := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'business_obligation_matrix_files'
    AND kcu.COLUMN_NAME = 'business_obligation_matrix_id'
    AND kcu.REFERENCED_TABLE_NAME = 'business_obligation_matrix'
  LIMIT 1
);

SET @sql := IF(@old_fk IS NOT NULL,
  CONCAT('ALTER TABLE business_obligation_matrix_files DROP FOREIGN KEY ', @old_fk),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Ensure index on FK column (if missing)
SET @has_idx := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS s
  WHERE s.TABLE_SCHEMA = DATABASE()
    AND s.TABLE_NAME = 'business_obligation_matrix_files'
    AND s.INDEX_NAME = 'idx_bomf_bom_id'
);
SET @sql := IF(@has_idx = 0,
  'ALTER TABLE business_obligation_matrix_files ADD INDEX idx_bomf_bom_id (business_obligation_matrix_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Add correct FK to plural table with cascading behavior (if missing)
SET @has_fk := (
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

SET @sql := IF(@has_fk = 0,
  'ALTER TABLE business_obligation_matrix_files\n   ADD CONSTRAINT FK_bomf_bom\n   FOREIGN KEY (business_obligation_matrix_id)\n   REFERENCES business_obligation_matrices(id)\n   ON DELETE CASCADE\n   ON UPDATE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;
