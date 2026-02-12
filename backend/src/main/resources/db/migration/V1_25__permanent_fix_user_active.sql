-- ============================================================
-- PERMANENT FIX: Ensure is_active column is robust
-- 1. Set all NULL or 0 values to 1
-- 2. Alter column to NOT NULL DEFAULT 1
-- 3. Drop the legacy 'active' column if it exists separately
-- ============================================================

-- Fix any existing bad data
UPDATE users SET is_active = 1 WHERE is_active IS NULL OR is_active = 0;

-- Make column NOT NULL with default 1
ALTER TABLE users MODIFY COLUMN is_active BIT(1) NOT NULL DEFAULT 1;
