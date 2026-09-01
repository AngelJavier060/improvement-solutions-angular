-- Catálogo global Tipo de Salida + asignación por empresa
CREATE TABLE IF NOT EXISTS inventory_output_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL,
    description VARCHAR(255),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_inventory_output_types_name_ci
    ON inventory_output_types (LOWER(TRIM(name)));

INSERT INTO inventory_output_types (name, description, active)
SELECT v.name, v.description, TRUE
FROM (VALUES
    ('Entrega de EPP a trabajador', 'Dotación / entrega de EPP al personal'),
    ('Préstamo de herramienta', 'Préstamo temporal de herramienta o equipo'),
    ('Consumo de proyecto/área', 'Consumo interno de un proyecto o área'),
    ('Baja de productos', 'Baja por daño, vencimiento u obsolescencia'),
    ('Venta de producto', 'Salida por venta a cliente'),
    ('Descuento a trabajador (nómina)', 'Cargo / descuento al trabajador en nómina')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM inventory_output_types t WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(v.name)));

CREATE TABLE IF NOT EXISTS business_inventory_output_type (
    business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    inventory_output_type_id BIGINT NOT NULL REFERENCES inventory_output_types(id) ON DELETE CASCADE,
    PRIMARY KEY (business_id, inventory_output_type_id)
);

-- output_type deja de ser enum fijo y acepta nombre/código del catálogo
ALTER TABLE inventory_outputs DROP CONSTRAINT IF EXISTS inventory_outputs_output_type_check;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'inventory_outputs'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%output_type%'
    LOOP
        EXECUTE format('ALTER TABLE inventory_outputs DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE inventory_outputs ALTER COLUMN output_type TYPE VARCHAR(80);
