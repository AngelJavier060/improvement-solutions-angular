-- ============================================================
-- Repair: Ensure all users have is_active = 1 (true)
-- The users table has dual columns: 'active' and 'is_active'
-- JPA entity maps to 'is_active', ensure both are synced
-- ============================================================
UPDATE users SET is_active = 1 WHERE is_active IS NULL OR is_active = 0;
UPDATE users SET active = 1 WHERE active IS NULL OR active = 0;
