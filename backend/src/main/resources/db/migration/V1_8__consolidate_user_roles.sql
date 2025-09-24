-- Consolidate user_roles constraints and drop legacy user_role table
-- This migration:
-- 1) Ensures user_roles references have ON DELETE/UPDATE CASCADE
-- 2) Drops legacy table user_role if it exists

-- Detect and drop existing foreign keys on user_roles -> users(id)
SET @fk_user := (
  SELECT KCU.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU
  WHERE KCU.TABLE_SCHEMA = DATABASE()
    AND KCU.TABLE_NAME = 'user_roles'
    AND KCU.COLUMN_NAME = 'user_id'
    AND KCU.REFERENCED_TABLE_NAME = 'users'
  LIMIT 1
);
SET @sql := IF(@fk_user IS NOT NULL, CONCAT('ALTER TABLE user_roles DROP FOREIGN KEY `', @fk_user, '`'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Detect and drop existing foreign keys on user_roles -> roles(id)
SET @fk_role := (
  SELECT KCU.CONSTRAINT_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU
  WHERE KCU.TABLE_SCHEMA = DATABASE()
    AND KCU.TABLE_NAME = 'user_roles'
    AND KCU.COLUMN_NAME = 'role_id'
    AND KCU.REFERENCED_TABLE_NAME = 'roles'
  LIMIT 1
);
SET @sql := IF(@fk_role IS NOT NULL, CONCAT('ALTER TABLE user_roles DROP FOREIGN KEY `', @fk_role, '`'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Recreate FKs with CASCADE behavior
ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy table if it still exists
DROP TABLE IF EXISTS user_role;
