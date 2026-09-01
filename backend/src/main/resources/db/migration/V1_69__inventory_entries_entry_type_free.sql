-- entry_type deja de ser enum fijo (COMPRA/DEVOLUCION/…) y acepta el nombre del catálogo.
ALTER TABLE inventory_entries DROP CONSTRAINT IF EXISTS inventory_entries_entry_type_check;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'inventory_entries'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%entry_type%'
    LOOP
        EXECUTE format('ALTER TABLE inventory_entries DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE inventory_entries ALTER COLUMN entry_type TYPE VARCHAR(80);
